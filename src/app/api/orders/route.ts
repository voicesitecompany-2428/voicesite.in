// POST /api/orders
// Public endpoint — no Firebase auth (customers have no accounts).
// Validates site is live + open, then inserts order + order_items + transaction.

import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import crypto from 'crypto';

const MAX_ITEMS = 50;

function generateOrderNumber(): string {
  const bytes = crypto.randomBytes(4);
  const n = bytes.readUInt32BE(0) % 9_000_000 + 1_000_000;
  return String(n);
}

interface IncomingItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  variantSize?: string;
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      siteId?: string;
      customerName?: string;
      customerMobile?: string;
      paymentMethod?: 'online' | 'counter';
      items?: IncomingItem[];
      subtotal?: number;
    };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { siteId, customerName, customerMobile, paymentMethod, items, subtotal } = body;

    // ── Input validation ──────────────────────────────────────────────────────
    if (!siteId || typeof siteId !== 'string') {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }
    if (!customerName?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }
    if (!customerMobile?.trim() || !/^\d{10}$/.test(customerMobile.trim())) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 });
    }
    if (paymentMethod !== 'online' && paymentMethod !== 'counter') {
      return NextResponse.json({ error: 'paymentMethod must be online or counter' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must have at least one item' }, { status: 400 });
    }
    if (items.length > MAX_ITEMS) {
      return NextResponse.json({ error: `Order cannot exceed ${MAX_ITEMS} items` }, { status: 400 });
    }
    if (typeof subtotal !== 'number' || subtotal < 0) {
      return NextResponse.json({ error: 'Invalid subtotal' }, { status: 400 });
    }

    // ── Verify site is live and open ──────────────────────────────────────────
    const { data: site, error: siteError } = await supabaseServer
      .from('sites')
      .select('id, is_live, is_open')
      .eq('id', siteId)
      .single();

    if (siteError || !site) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }
    if (!site.is_live) {
      return NextResponse.json({ error: 'This store is currently offline' }, { status: 403 });
    }
    if (!site.is_open) {
      return NextResponse.json({ error: 'This store is currently closed' }, { status: 403 });
    }

    const orderNumber = generateOrderNumber();
    const paymentStatus = paymentMethod === 'online' ? 'paid' : 'pending';

    // ── Insert order ──────────────────────────────────────────────────────────
    const orderItems = items.map(i => ({
      qty: i.qty,
      name: i.name,
      variantSize: i.variantSize,
    }));

    const { data: order, error: orderError } = await supabaseServer
      .from('orders')
      .insert({
        site_id: siteId,
        order_number: orderNumber,
        customer_name: customerName.trim(),
        customer_mobile: customerMobile.trim(),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        status: 'preparing',
        items: orderItems,
        subtotal,
        total_amount: subtotal,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('[POST /api/orders] order insert error:', orderError);
      return NextResponse.json({ error: 'Failed to place order. Please try again.' }, { status: 500 });
    }

    // ── Insert order_items ────────────────────────────────────────────────────
    const orderItemRows = items.map(i => ({
      order_id: order.id,
      product_id: i.id,
      product_name: i.name,
      variant_name: i.variantSize ?? null,
      quantity: i.qty,
      unit_price: i.price,
      subtotal: i.price * i.qty,
    }));

    const { error: itemsError } = await supabaseServer
      .from('order_items')
      .insert(orderItemRows);

    if (itemsError) {
      console.error('[POST /api/orders] order_items insert error:', itemsError);
      // Non-fatal — order is placed, items detail is secondary
    }

    // ── Insert transaction record ─────────────────────────────────────────────
    const txnId = `TXN${Date.now()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const txnStatus = paymentMethod === 'online' ? 'Success' : 'Pending';
    const paymentMode = paymentMethod === 'online' ? 'UPI' : 'Cash';

    const { error: txnError } = await supabaseServer
      .from('transactions')
      .insert({
        site_id: siteId,
        order_id: order.id,
        txn_id: txnId,
        customer_mobile: customerMobile.trim(),
        amount: subtotal,
        currency: 'INR',
        status: txnStatus,
        payment_mode: paymentMode,
        gateway_ref: paymentMethod === 'online' ? `mock-${order.id}` : null,
      });

    if (txnError) {
      console.error('[POST /api/orders] transaction insert error:', txnError);
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber,
    });
  } catch (err) {
    console.error('[POST /api/orders] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
