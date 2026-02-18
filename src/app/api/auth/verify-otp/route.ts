import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { cookies } from 'next/headers';

// Simple JWT-like token (use proper JWT library in production)
function generateToken(ownerId: string, shopId: string): string {
    const payload = {
        ownerId,
        shopId,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export async function POST(request: NextRequest) {
    try {
        const { phone, otp } = await request.json();

        if (!phone || !otp) {
            return NextResponse.json(
                { error: 'Phone and OTP are required' },
                { status: 400 }
            );
        }

        // Clean phone number
        const cleanPhone = phone.replace(/[\s-]/g, '');
        const formattedPhone = cleanPhone.startsWith('+91')
            ? cleanPhone
            : `+91${cleanPhone}`;

        // Verify OTP from database
        const { data: otpRecord } = await supabaseServer
            .from('otp_codes')
            .select('*')
            .eq('phone', formattedPhone)
            .eq('code', otp)
            .single();

        if (!otpRecord) {
            return NextResponse.json(
                { error: 'Invalid OTP' },
                { status: 401 }
            );
        }

        // Check if OTP is expired
        if (new Date(otpRecord.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'OTP has expired' },
                { status: 401 }
            );
        }

        // Delete used OTP
        await supabaseServer
            .from('otp_codes')
            .delete()
            .eq('phone', formattedPhone);

        // Get shop owner details
        const { data: owner } = await supabaseServer
            .from('shop_owners')
            .select('id, shop_id')
            .eq('phone', formattedPhone)
            .single();

        if (!owner || !owner.shop_id) {
            return NextResponse.json(
                { error: 'Shop owner not found' },
                { status: 404 }
            );
        }

        // Generate session token
        const token = generateToken(owner.id, owner.shop_id);

        // Set cookie
        const cookieStore = await cookies();
        cookieStore.set('shop_auth', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        return NextResponse.json({
            success: true,
            message: 'Login successful',
            shopId: owner.shop_id,
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json(
            { error: 'Failed to verify OTP' },
            { status: 500 }
        );
    }
}
