// PATCH /api/orders/[id]
// Admin-only: cycle order status. Firebase auth required.
// Validates the order belongs to a site owned by the authenticated user.

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/verifyFirebaseToken';
import { supabaseServer } from '@/lib/supabase-server';

type OrderStatus = 'preparing' | 'ready' | 'completed';
const VALID_STATUSES: OrderStatus[] = ['preparing', 'ready', 'completed'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = await verifyFirebaseToken(authHeader.replace('Bearer ', ''));
    if (!userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const orderId = params.id;
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    let body: { status?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { status } = body;
    if (!status || !VALID_STATUSES.includes(status as OrderStatus)) {
      return NextResponse.json(
        { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // ── Verify order belongs to a site owned by this user ───────────────────
    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .select('id, site_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: site, error: siteError } = await supabaseServer
      .from('sites')
      .select('id')
      .eq('id', order.site_id)
      .eq('user_id', userId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Update status ────────────────────────────────────────────────────────
    const { error: updateError } = await supabaseServer
      .from('orders')
      .update({ status: status as OrderStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      console.error('[PATCH /api/orders/[id]] update error:', updateError);
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    console.error('[PATCH /api/orders/[id]] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
