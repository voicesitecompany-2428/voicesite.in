import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Check for simple test auth
async function isAuthenticated() {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('shop_auth_test');
    return authCookie?.value === 'authenticated';
}

// POST - Upload image
export async function POST(request: NextRequest) {
    const isAuth = await isAuthenticated();
    if (!isAuth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;
        const type = formData.get('type') as string;
        const shopId = formData.get('shopId') as string;

        if (!file) {
            return NextResponse.json(
                { error: 'No image file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Only image files are allowed' },
                { status: 400 }
            );
        }

        // Limit file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Image must be less than 5MB' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const folder = shopId || 'general';
        const filename = `${folder}/${type}-${Date.now()}.${ext}`;

        // Convert to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data, error } = await supabaseServer.storage
            .from('shop-images')
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (error) {
            console.error('Upload error:', error);
            return NextResponse.json(
                { error: 'Failed to upload image' },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabaseServer.storage
            .from('shop-images')
            .getPublicUrl(data.path);

        return NextResponse.json({
            success: true,
            url: urlData.publicUrl,
            path: data.path,
        });

    } catch (error) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload image' },
            { status: 500 }
        );
    }
}
