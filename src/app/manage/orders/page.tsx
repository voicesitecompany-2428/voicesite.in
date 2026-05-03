'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePlan } from '@/components/PlanContext';
import { useSite } from '@/components/SiteContext';
import { supabase } from '@/lib/supabase';
import { firebaseAuth } from '@/lib/firebase';

type OrderStatus = 'preparing' | 'ready' | 'completed';

interface OrderItem { qty: number; name: string; variantSize?: string; }

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  table_number: string | null;
  items: OrderItem[];
  subtotal: number;
  payment_method: 'online' | 'counter';
  payment_status: 'pending' | 'paid';
  status: OrderStatus;
  created_at: string;
}

const STATUS_STYLES: Record<OrderStatus, { color: string; bg: string; border: string; chevron: boolean }> = {
  preparing: { color: '#F97316', bg: 'transparent', border: '1px solid #F97316', chevron: true },
  ready:     { color: '#16A34A', bg: 'transparent', border: '1px solid #16A34A', chevron: true },
  completed: { color: '#5137EF', bg: '#EEEEFF',     border: 'none',              chevron: false },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
  preparing: 'ready',
  ready: 'completed',
  completed: 'preparing',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return isToday ? `Today ${time}` : `${d.toLocaleDateString('en-IN')} ${time}`;
}

function itemsSummary(items: OrderItem[]): string {
  if (!items.length) return '—';
  const first3 = items.slice(0, 3).map(i => `${i.name}${i.variantSize ? ` (${i.variantSize})` : ''}`);
  const rest = items.length - 3;
  return rest > 0 ? `${first3.join(', ')} &+${rest}` : first3.join(', ');
}

export default function OrdersPage() {
  const { isPayEat } = usePlan();
  const { activeSite } = useSite();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const siteId = activeSite?.id;

  const fetchOrders = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('site_id', siteId)
      .gte('created_at', today.toISOString())
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) ?? []);
    setLoading(false);
  }, [siteId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!siteId) return;
    const channel = supabase
      .channel(`admin-orders-${siteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `site_id=eq.${siteId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Order;
            setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
            setSelectedOrder(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: string }).id;
            setOrders(prev => prev.filter(o => o.id !== deletedId));
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [siteId]);

  const cycleStatus = async (order: Order) => {
    if (order.status === 'completed') return;
    setUpdatingId(order.id);
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      if (!token) return;
      await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: NEXT_STATUS[order.status] }),
      });
    } catch (err) {
      console.error('[orders] cycleStatus error:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const COLS = ['ORDER ID', 'CUSTOMER', 'ITEMS', 'TIME', 'AMOUNT', 'PAYMENT', 'STATUS'];
  const totalItems = selectedOrder ? selectedOrder.items.reduce((sum, i) => sum + i.qty, 0) : 0;

  return (
    <div className="px-4 lg:px-8 py-5 lg:py-8">
      <div className="mb-5 lg:mb-6">
        <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: '32px' }}>Orders</h1>
        <p className="text-[#52525C] mt-1" style={{ fontSize: 14, fontWeight: 400, lineHeight: '22px' }}>
          Live orders for today · updates in real time
        </p>
      </div>

      {/* Locked state */}
      {!isPayEat && (
        <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
          <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>lock</span>
          </div>
          <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Orders — Upgrade to Unlock</p>
          <p className="text-[#71717A]" style={{ fontSize: 13, marginBottom: 20, maxWidth: 320 }}>
            Order management is available on the Pay-Eat plan. Upgrade to start accepting and tracking orders in real time.
          </p>
          <Link href="/manage/subscription" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
            Upgrade Plan
          </Link>
        </div>
      )}

      {isPayEat && (
        <>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div style={{ width: 28, height: 28, border: '3px solid #e6e6e6', borderTopColor: '#5137EF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {/* Desktop table */}
          {!loading && (
            <div className="hidden lg:block overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
              <div className="grid" style={{ gridTemplateColumns: '140px 150px 1fr 140px 100px 110px 160px', background: '#F4F4F4', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}>
                {COLS.map(col => (
                  <div key={col} className="text-[#71717A]" style={{ padding: '12px 0', fontSize: 12, fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                    {col}
                  </div>
                ))}
              </div>
              {orders.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[#D4D4D8]" style={{ fontSize: 48 }}>receipt_long</span>
                  <p className="font-medium text-[#71717A]" style={{ fontSize: 14 }}>No orders yet today</p>
                </div>
              ) : orders.map((order, idx) => {
                const s = STATUS_STYLES[order.status] ?? STATUS_STYLES.preparing;
                const isUpdating = updatingId === order.id;
                return (
                  <div key={order.id} className="grid items-center"
                    style={{ gridTemplateColumns: '140px 150px 1fr 140px 100px 110px 160px', padding: '0 24px', minHeight: 50, background: '#FFFFFF', borderBottom: idx < orders.length - 1 ? '1px solid #E4E4E7' : 'none' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>#{order.order_number}</div>
                    <div>
                      <div style={{ fontSize: 13, color: '#0A0A0A', fontWeight: 500 }}>{order.customer_name}</div>
                      {order.table_number && <div style={{ fontSize: 11, color: '#71717A' }}>Table {order.table_number}</div>}
                    </div>
                    <button onClick={() => setSelectedOrder(order)} className="truncate text-left pr-4 hover:underline"
                      style={{ fontSize: 13, color: '#5137EF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {itemsSummary(order.items)}
                    </button>
                    <div style={{ fontSize: 13, color: '#52525C' }}>{formatTime(order.created_at)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{order.subtotal}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: order.payment_status === 'paid' ? '#16A34A' : '#F97316' }}>
                      {order.payment_method === 'online' ? (order.payment_status === 'paid' ? '✓ Paid' : 'Online') : 'Counter'}
                    </div>
                    <div>
                      <button
                        onClick={() => !isUpdating && cycleStatus(order)}
                        disabled={isUpdating || order.status === 'completed'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: s.bg, border: s.border, color: s.color, fontSize: 12, fontWeight: 500, cursor: isUpdating || order.status === 'completed' ? 'default' : 'pointer', opacity: isUpdating ? 0.6 : 1 }}>
                        {STATUS_LABEL[order.status]}
                        {s.chevron && !isUpdating && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>keyboard_arrow_down</span>}
                        {isUpdating && <div style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile cards */}
          {!loading && (
            <div className="lg:hidden overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
              {orders.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[#D4D4D8]" style={{ fontSize: 40 }}>receipt_long</span>
                  <p className="font-medium text-[#71717A]" style={{ fontSize: 14 }}>No orders yet today</p>
                </div>
              ) : orders.map((order, idx) => {
                const s = STATUS_STYLES[order.status];
                const isUpdating = updatingId === order.id;
                return (
                  <div key={order.id} style={{ padding: '14px 16px', background: '#FFFFFF', borderBottom: idx < orders.length - 1 ? '1px solid #E4E4E7' : 'none' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', flexShrink: 0 }}>#{order.order_number}</span>
                      <button onClick={() => setSelectedOrder(order)} className="flex-1 min-w-0 text-center"
                        style={{ fontSize: 12, color: '#5137EF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {itemsSummary(order.items)}
                      </button>
                      <button onClick={() => !isUpdating && cycleStatus(order)} disabled={isUpdating || order.status === 'completed'}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: s.bg, border: s.border, color: s.color, fontSize: 12, fontWeight: 500, cursor: isUpdating || order.status === 'completed' ? 'default' : 'pointer', flexShrink: 0 }}>
                        {STATUS_LABEL[order.status]}
                        {s.chevron && !isUpdating && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>keyboard_arrow_down</span>}
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 12, color: '#52525C' }}>{order.customer_name}{order.table_number ? ` · T-${order.table_number}` : ''}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>₹{order.subtotal}</span>
                    </div>
                    <p style={{ fontSize: 11, color: '#99A1AF', marginTop: 3 }}>{formatTime(order.created_at)}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Order detail modal */}
          {selectedOrder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setSelectedOrder(null)}>
              <div className="bg-white overflow-hidden mx-4" style={{ width: '100%', maxWidth: 420, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }} onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between" style={{ background: '#5137EF', padding: '14px 20px' }}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white" style={{ fontSize: 13, letterSpacing: '0.5px' }}>ORDER DETAILS</span>
                    <span className="text-white/70" style={{ fontSize: 12 }}>{formatTime(selectedOrder.created_at)}</span>
                  </div>
                  <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>close</span>
                  </button>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
                    <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 24 }}>#{selectedOrder.order_number}</p>
                    <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 24 }}>₹{selectedOrder.subtotal}</p>
                  </div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                    <div>
                      <p className="text-[#52525C]" style={{ fontSize: 14 }}>{selectedOrder.customer_name}</p>
                      {selectedOrder.table_number && <p style={{ fontSize: 12, color: '#71717A' }}>Table {selectedOrder.table_number}</p>}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedOrder.payment_status === 'paid' ? '#16A34A' : '#F97316' }}>
                      {selectedOrder.payment_method === 'online' ? (selectedOrder.payment_status === 'paid' ? '✓ Paid Online' : 'Online') : 'Pay at Counter'}
                    </span>
                  </div>
                  <div style={{ height: 1, background: '#E4E4E7', marginBottom: 16 }} />
                  <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 14 }}>Order Items ({totalItems})</p>
                  <div className="flex flex-col" style={{ gap: 12 }}>
                    {selectedOrder.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <span className="font-bold text-[#0A0A0A]" style={{ fontSize: 15, minWidth: 28 }}>{item.qty}×</span>
                        <span className="text-[#0A0A0A]" style={{ fontSize: 15 }}>{item.name}{item.variantSize ? ` (${item.variantSize})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
