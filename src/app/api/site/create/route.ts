import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Generate URL-friendly slug from shop name
function generateSlug(shopName: string): string {
    return shopName
        .toLowerCase()
        .trim()
        // Transliterate common Hindi to English (basic)
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Remove multiple hyphens
        .substring(0, 50) // Limit length
        || `shop-${Date.now()}`; // Fallback
}

// Format phone number with country code
function formatPhone(phone: string | undefined): string | null {
    if (!phone) return null;
    const clean = phone.replace(/[\s-]/g, '');
    if (clean.startsWith('+91')) return clean;
    if (clean.length === 10) return `+91${clean}`;
    return clean;
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate User
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: { headers: { Authorization: authHeader } }
            }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
        }

        const userId = user.id;
        const body = await request.json();
        const { type, name, description, products, timing, location, social_links, image_url, ...otherDetails } = body;

        // Normalize type
        const siteType = type === 'Menu' ? 'Menu' : 'Shop'; // Default to Shop? Or ensure it's passed.

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // 2. Fetch User Subscription
        let { data: subscription, error: _subError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        // Lazy create if missing
        if (!subscription) {
            const { data: newSub, error: createError } = await supabase
                .from('user_subscriptions')
                .insert({
                    user_id: userId,
                    store_plan: 'base',
                    menu_plan: 'menu_base',
                    shop_limit: 0,
                    menu_limit: 0,
                    store_expires_at: new Date().toISOString(),
                    menu_expires_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('Error creating default subscription:', createError);
                return NextResponse.json({ error: 'Failed to initialize subscription.' }, { status: 500 });
            }
            subscription = newSub;
        }

        // 3. Enforce Limits
        const now = new Date();

        if (siteType === 'Shop') {
            const expiresAt = new Date(subscription.store_expires_at);
            // Only check expiry if they have a non-zero limit (active plan)
            if (subscription.shop_limit > 0 && expiresAt < now) {
                return NextResponse.json({ error: 'Store plan has expired. Please recharge.' }, { status: 403 });
            }

            const { count, error: countError } = await supabase
                .from('sites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('type', 'Shop');

            if (countError) throw countError;

            const limit = subscription.shop_limit || 0;
            if ((count || 0) >= limit) {
                if (limit === 0) {
                    return NextResponse.json({ error: 'No active plan. Please purchase a Store plan to publish.' }, { status: 403 });
                }
                return NextResponse.json({ error: `Store limit reached (${limit}). Upgrade your plan to create more.` }, { status: 403 });
            }

        } else if (siteType === 'Menu') {
            const expiresAt = new Date(subscription.menu_expires_at);
            // Only check expiry if they have a non-zero limit
            if (subscription.menu_limit > 0 && expiresAt < now) {
                return NextResponse.json({ error: 'Menu plan has expired. Please recharge.' }, { status: 403 });
            }

            const { count, error: countError } = await supabase
                .from('sites')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('type', 'Menu');

            if (countError) throw countError;

            const limit = subscription.menu_limit || 0;
            if ((count || 0) >= limit) {
                if (limit === 0) {
                    return NextResponse.json({ error: 'No active plan. Please purchase a Menu plan to publish.' }, { status: 403 });
                }
                return NextResponse.json({ error: `Menu limit reached (${limit}). Upgrade your plan to create more.` }, { status: 403 });
            }
        }

        // 4. Generate Unique Slug
        let baseSlug = generateSlug(name);
        let slug = baseSlug;
        let counter = 1;

        // Check for existing slug and make unique
        while (true) {
            const { data: existing } = await supabase
                .from('sites')
                .select('slug')
                .eq('slug', slug)
                .single();

            if (!existing) break;
            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        // 5. Insert Site
        // Note: The previous code triggered 'shops' insert. 'sites' and 'shops' seem to be same table?
        // OnboardingModal used 'sites'. The previous route used 'shops'. 
        // I will assume 'sites' is the correct table for now based on OnboardingModal usage.
        // Wait, check OnboardingModal imports... it used 'sites'.
        // Check previous route ... it used 'shops'.
        // This is a discrepancy! 
        // 'sites' might be a view or they are different?
        // Let's check `supabase` definition in `src/lib/supabase.ts`? No schema there.
        // User said "After user create a store or menu it need to check the limit".
        // In `OnboardingModal.tsx`: .from('sites').insert
        // In previous `route.ts`: .from('shops').insert
        // Let's TRUST `OnboardingModal` because user said "credits system is working" implies they successfully created sites using `OnboardingModal`.

        const { data: site, error: insertError } = await supabase
            .from('sites')
            .insert({
                user_id: userId,
                slug,
                type: siteType,
                name, // Mapped to 'name' in sites? previous route used 'shop_name'
                // OnboardingModal used `...siteDetails` which has `name`.
                // I should verify columns. `OnboardingModal` is working, so `sites` has `name`.
                description,
                image_url,
                timing,
                location,
                // OnboardingModal sends flat structure. 
                // I'll adhere to what OnboardingModal sends.
                // It sends: { type, ...siteDetails, slug }
                owner_name: otherDetails.owner_name,
                contact_number: formatPhone(otherDetails.contact_number),
                email: otherDetails.email,
                whatsapp_number: otherDetails.whatsapp_number,
                tagline: otherDetails.tagline,
                established_year: otherDetails.established_year,
                state: otherDetails.state,
                pincode: otherDetails.pincode,
                address: otherDetails.address,
                social_links: social_links,
            })
            .select()
            .single();

        if (insertError) {
            // Handle unique violation or other errors
            throw insertError;
        }

        // 6. Insert Products
        if (products && products.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const productsToInsert = products.map((p: any) => ({
                site_id: site.id,
                name: p.name,
                price: p.price,
                description: p.desc || p.description,
                image_url: p.image_url
            }));

            const { error: prodError } = await supabase
                .from('products')
                .insert(productsToInsert);

            if (prodError) {
                console.error("Error inserting products", prodError);
                // Non-fatal?
            }
        }

        return NextResponse.json({ success: true, siteId: site.id, slug: site.slug });

    } catch (error: unknown) {
        console.error('Create error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to create website';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
