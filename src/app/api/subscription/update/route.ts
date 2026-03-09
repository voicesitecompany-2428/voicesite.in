import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Canonical pricing — single source of truth for plan prices
const PLAN_PRICES: Record<string, number> = {
    base: 349,
    pro: 649,
    menu_base: 249,
    menu_pro: 449,
};

// Plan limits
const PLAN_LIMITS: Record<string, number> = {
    base: 1,
    pro: 2,
    menu_base: 1,
    menu_pro: 2,
};

const VALID_STORE_PLANS = ['base', 'pro'];
const VALID_MENU_PLANS = ['menu_base', 'menu_pro'];

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate User via Bearer token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Unauthorized: No token provided' },
                { status: 401 }
            );
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } },
            }
        );

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }

        // 2. Parse and validate request body
        const body = await request.json();
        const { planType, selectedPlan } = body;

        if (!planType || !selectedPlan) {
            return NextResponse.json(
                { error: 'planType and selectedPlan are required' },
                { status: 400 }
            );
        }

        if (planType !== 'store' && planType !== 'menu') {
            return NextResponse.json(
                { error: 'planType must be "store" or "menu"' },
                { status: 400 }
            );
        }

        const isStore = planType === 'store';
        const validPlans = isStore ? VALID_STORE_PLANS : VALID_MENU_PLANS;

        if (!validPlans.includes(selectedPlan)) {
            return NextResponse.json(
                { error: `Invalid plan: ${selectedPlan}. Valid plans: ${validPlans.join(', ')}` },
                { status: 400 }
            );
        }

        // 3. Fetch current subscription
        const { data: sub, error: subError } = await supabase
            .from('user_subscriptions')
            .select('id, store_plan, menu_plan, shop_limit, menu_limit, store_expires_at, menu_expires_at')
            .eq('user_id', user.id)
            .single();

        if (subError || !sub) {
            return NextResponse.json(
                { error: 'Subscription not found. Please contact support.' },
                { status: 404 }
            );
        }

        // 4. Check if current plan is still active (don't allow recharge if active)
        const expiresAt = isStore ? sub.store_expires_at : sub.menu_expires_at;
        const currentLimit = isStore ? sub.shop_limit : sub.menu_limit;
        const daysLeft = Math.max(
            0,
            Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        );
        const isPlanActive = daysLeft > 0 && currentLimit > 0;

        if (isPlanActive) {
            return NextResponse.json(
                { error: 'Your current plan is still active. You can recharge after it expires.' },
                { status: 400 }
            );
        }

        // 5. Update subscription
        // NOTE: In the future, payment verification will happen HERE before updating the DB.
        // For now, this mirrors the existing behavior but on the server side.
        const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};

        if (isStore) {
            updateData.store_plan = selectedPlan;
            updateData.shop_limit = PLAN_LIMITS[selectedPlan];
            updateData.store_expires_at = newExpiry;
        } else {
            updateData.menu_plan = selectedPlan;
            updateData.menu_limit = PLAN_LIMITS[selectedPlan];
            updateData.menu_expires_at = newExpiry;
        }

        const { error: updateError } = await supabase
            .from('user_subscriptions')
            .update(updateData)
            .eq('id', sub.id);

        if (updateError) {
            console.error('Subscription update error:', updateError);
            return NextResponse.json(
                { error: 'Failed to update subscription' },
                { status: 500 }
            );
        }

        // 6. Record in billing history
        const planName = isStore ? `${selectedPlan} Store` : `${selectedPlan} Menu`;
        const price = PLAN_PRICES[selectedPlan] || 0;

        await supabase.from('billing_history').insert({
            user_id: user.id,
            plan_name: planName,
            amount: price,
            status: 'Success',
        });

        return NextResponse.json({
            success: true,
            message: 'Subscription updated successfully',
            plan: selectedPlan,
            expiresAt: newExpiry,
        });
    } catch (error: unknown) {
        console.error('Subscription update error:', error);
        const errorMessage =
            error instanceof Error ? error.message : 'Failed to update subscription';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
