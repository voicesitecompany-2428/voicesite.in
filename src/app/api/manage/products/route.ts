import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Check for simple test auth
async function isAuthenticated() {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('shop_auth_test');
    return authCookie?.value === 'authenticated';
}

// POST - Add new product
export async function POST(request: NextRequest) {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { shopId, product } = await request.json();

        if (!shopId || !product || !product.name) {
            return NextResponse.json(
                { error: 'Shop ID and product name are required' },
                { status: 400 }
            );
        }

        // Get current products
        const { data: shop } = await supabaseServer
            .from('shops')
            .select('products')
            .eq('id', shopId)
            .single();

        const products = shop?.products || [];

        // Add new product with ID
        const newProduct = {
            id: crypto.randomUUID(),
            name: product.name,
            price: product.price || 0,
            description: product.description || '',
            image: product.image || null,
        };

        products.push(newProduct);

        // Update shop
        const { error } = await supabaseServer
            .from('shops')
            .update({ products, updated_at: new Date().toISOString() })
            .eq('id', shopId);

        if (error) throw error;

        return NextResponse.json({ success: true, product: newProduct });

    } catch (error) {
        console.error('Add product error:', error);
        return NextResponse.json({ error: 'Failed to add product' }, { status: 500 });
    }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { shopId, productId, updates } = await request.json();

        if (!shopId || !productId) {
            return NextResponse.json({ error: 'Shop ID and Product ID required' }, { status: 400 });
        }

        // Get current products
        const { data: shop } = await supabaseServer
            .from('shops')
            .select('products')
            .eq('id', shopId)
            .single();

        const products = (shop?.products || []).map((p: { id: string }) => {
            if (p.id === productId) {
                return { ...p, ...updates };
            }
            return p;
        });

        // Update shop
        const { error } = await supabaseServer
            .from('shops')
            .update({ products, updated_at: new Date().toISOString() })
            .eq('id', shopId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Update product error:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE - Remove product
export async function DELETE(request: NextRequest) {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const shopId = searchParams.get('shopId');
        const productId = searchParams.get('productId');

        if (!shopId || !productId) {
            return NextResponse.json({ error: 'Shop ID and Product ID required' }, { status: 400 });
        }

        // Get current products
        const { data: shop } = await supabaseServer
            .from('shops')
            .select('products')
            .eq('id', shopId)
            .single();

        const products = (shop?.products || []).filter(
            (p: { id: string }) => p.id !== productId
        );

        // Update shop
        const { error } = await supabaseServer
            .from('shops')
            .update({ products, updated_at: new Date().toISOString() })
            .eq('id', shopId);

        if (error) throw error;

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete product error:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
