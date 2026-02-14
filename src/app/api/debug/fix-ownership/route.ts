import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(request: NextRequest) {
    try {
        // 1. Authenticate User
        // We can't use headers easily from browser bar, so we might need to rely on cookie helper or just assume this is a dev tool.
        // But supabaseServer.auth.getUser() usually needs a token.
        // Let's use `supabase-ssr` pattern if available, or just check if we can pass token via query param?
        // Or simpler: Just update ALL orphaned sites to a specific user if known?

        // Better: Frontend calls this on button click with bearer token.

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No token' }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Update sites where user_id is null
        // "sites" table.

        const { data, error } = await supabaseServer
            .from('sites')
            .update({ user_id: user.id })
            .is('user_id', null)
            .select();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: `Fixed ${data.length} sites.`,
            fixed_sites: data
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
