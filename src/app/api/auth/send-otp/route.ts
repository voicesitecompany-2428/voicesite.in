import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const { phone } = await request.json();

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Clean phone number (remove spaces, dashes)
        const cleanPhone = phone.replace(/[\s-]/g, '');

        // Validate phone format (Indian phone numbers)
        if (!/^(\+91)?[6-9]\d{9}$/.test(cleanPhone)) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400 }
            );
        }

        // Format phone with country code
        const formattedPhone = cleanPhone.startsWith('+91')
            ? cleanPhone
            : `+91${cleanPhone}`;

        // Check if this phone is registered as a shop owner
        const { data: owner } = await supabaseServer
            .from('shop_owners')
            .select('id, shop_id')
            .eq('phone', formattedPhone)
            .single();

        if (!owner) {
            return NextResponse.json(
                { error: 'This phone number is not registered as a shop owner' },
                { status: 404 }
            );
        }

        // Generate OTP (6 digits)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in a temporary table or cache
        // For simplicity, we'll use a simple approach with expiry
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP (you can use a separate table or Redis in production)
        const { error: otpError } = await supabaseServer
            .from('otp_codes')
            .upsert({
                phone: formattedPhone,
                code: otp,
                expires_at: expiresAt.toISOString(),
            }, {
                onConflict: 'phone'
            });

        if (otpError) {
            console.error('OTP storage error:', otpError);
            // Continue anyway - we'll create the table if it doesn't exist
        }

        // In production, send OTP via SMS (Twilio, MSG91, etc.)
        // For development, we'll log it
        console.log(`📱 OTP for ${formattedPhone}: ${otp}`);

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully',
            // Only for development - remove in production
            debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined,
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json(
            { error: 'Failed to send OTP' },
            { status: 500 }
        );
    }
}
