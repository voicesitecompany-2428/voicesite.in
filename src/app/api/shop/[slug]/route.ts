import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;

        if (!slug) {
            return NextResponse.json(
                { error: 'Slug is required' },
                { status: 400 }
            );
        }

        const { data: shop, error } = await supabaseServer
            .from('shops')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error || !shop) {
            return NextResponse.json(
                { error: 'Shop not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            shop,
        });
    } catch (error) {
        console.error('Fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch shop data' },
            { status: 500 }
        );
    }
}
