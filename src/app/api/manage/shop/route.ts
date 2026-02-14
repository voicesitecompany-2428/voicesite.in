import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Check for simple test auth
async function isAuthenticated() {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('shop_auth_test');
    return authCookie?.value === 'authenticated';
}

// GET - Fetch all shops (for testing - shows all shops)
export async function GET(request: NextRequest) {
    const isAuth = await isAuthenticated();

    if (!isAuth) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    // Get shopId from query param if provided
    const { searchParams } = new URL(request.url);
    const shopId = searchParams.get('shopId');

    if (shopId) {
        // Fetch specific shop
        const { data: shop, error } = await supabaseServer
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();

        if (error || !shop) {
            return NextResponse.json(
                { error: 'Shop not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ shop });
    }

    // Fetch all shops for selection
    const { data: shops, error } = await supabaseServer
        .from('shops')
        .select('id, slug, shop_name, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json(
            { error: 'Failed to fetch shops' },
            { status: 500 }
        );
    }

    return NextResponse.json({ shops });
}

// PUT - Update shop data
export async function PUT(request: NextRequest) {
    const isAuth = await isAuthenticated();

    if (!isAuth) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const { shopId, ...updates } = await request.json();

        if (!shopId) {
            return NextResponse.json(
                { error: 'Shop ID is required' },
                { status: 400 }
            );
        }

        // Allowed fields to update
        const allowedFields = [
            'shop_name',
            'description',
            'timings',
            'location',
            'contact',
            'hero_image',
            'logo_image',
        ];

        // Filter only allowed fields
        const safeUpdates: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                safeUpdates[field] = updates[field];
            }
        }

        safeUpdates.updated_at = new Date().toISOString();

        const { data: shop, error } = await supabaseServer
            .from('shops')
            .update(safeUpdates)
            .eq('id', shopId)
            .select()
            .single();

        if (error) {
            console.error('Update error:', error);
            return NextResponse.json(
                { error: 'Failed to update shop' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            shop
        });

    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json(
            { error: 'Invalid request' },
            { status: 400 }
        );
    }
}
