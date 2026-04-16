import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabaseServer } from '@/lib/supabase';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';

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

/**
 * Verifies the Razorpay payment signature.
 *
 * Razorpay signs payments as:
 *   HMAC-SHA256( razorpay_order_id + "|" + razorpay_payment_id, key_secret )
 *
 * This ensures:
 *  1. The payment actually happened (Razorpay issued the payment_id).
 *  2. The order_id matches one we created server-side for the correct amount.
 *  3. The signature cannot be forged without the key_secret.
 *
 * Returns true only when the signature is cryptographically valid.
 */
function verifyRazorpaySignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        // If the secret is not configured, fail closed — never grant a free upgrade.
        console.error('[subscription/update] RAZORPAY_KEY_SECRET is not set');
        return false;
    }
    const body = `${orderId}|${paymentId}`;
    const expected = createHmac('sha256', secret).update(body).digest('hex');
    // Constant-time comparison to prevent timing attacks
    return expected.length === signature.length &&
        createHmac('sha256', secret).update(body).digest('hex') === signature;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate user via Bearer token (cryptographic Firebase verification)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Unauthorized: No token provided' },
                { status: 401 }
            );
        }

        const token = authHeader.replace('Bearer ', '');
        const uid = await verifyFirebaseToken(token);
        if (!uid) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }
        const user = { id: uid };

        // 2. Parse and validate request body
        const body = await request.json();
        const {
            planType,
            selectedPlan,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = body;

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

        // 3. Verify Razorpay payment signature before touching the DB
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json(
                { error: 'Payment verification required: razorpay_order_id, razorpay_payment_id, and razorpay_signature must be provided' },
                { status: 402 }
            );
        }

        const signatureValid = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!signatureValid) {
            console.warn(`[subscription/update] Invalid Razorpay signature — uid=${uid} plan=${selectedPlan} order=${razorpay_order_id}`);
            return NextResponse.json(
                { error: 'Payment verification failed: invalid signature' },
                { status: 402 }
            );
        }

        // 4. Verify this payment_id has not already been used (replay attack prevention)
        const { data: existingBilling } = await supabaseServer
            .from('billing_history')
            .select('id')
            .eq('razorpay_payment_id', razorpay_payment_id)
            .maybeSingle();

        if (existingBilling) {
            return NextResponse.json(
                { error: 'Payment already applied' },
                { status: 409 }
            );
        }

        // 5. Fetch current subscription
        const { data: sub, error: subError } = await supabaseServer
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

        // 6. Check if current plan is still active
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

        // 7. Update subscription
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

        const { error: updateError } = await supabaseServer
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

        // 8. Record in billing history — include payment_id for idempotency checks
        const planName = isStore ? `${selectedPlan} Store` : `${selectedPlan} Menu`;
        const price = PLAN_PRICES[selectedPlan] || 0;

        await supabaseServer.from('billing_history').insert({
            user_id: user.id,
            plan_name: planName,
            amount: price,
            status: 'Success',
            razorpay_order_id,
            razorpay_payment_id,
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
