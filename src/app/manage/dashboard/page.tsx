'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePlan } from '@/components/PlanContext';
import { useSite } from '@/components/SiteContext';
import { firebaseAuth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';

type OrderStatus = 'preparing' | 'ready' | 'completed';

interface Order {
    id: string;
    order_number: string;
    customer_name: string | null;
    items: { qty: number; name: string; variantSize?: string }[];
    subtotal: number;
    payment_method: 'online' | 'counter';
    payment_status: 'pending' | 'paid';
    status: OrderStatus;
    created_at: string;
}

const STATUS_STYLES: Record<OrderStatus, { color: string; bg: string; label: string }> = {
    preparing: { color: '#F97316', bg: '#FFF7ED', label: 'Preparing' },
    ready:     { color: '#16A34A', bg: '#F0FDF4', label: 'Ready' },
    completed: { color: '#5137EF', bg: '#EEEEFF', label: 'Completed' },
};

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function todayMidnight() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
function RealDashboard({ siteUrl, siteId, initialStoreOpen }: { siteUrl: string; siteId: string; initialStoreOpen: boolean }) {
    const { isPayEat, isTrialExpired, planLoading } = usePlan();
    const [storeOpen, setStoreOpen] = useState(initialStoreOpen);
    const [toggling, setToggling] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);

    // ── Fetch today's orders ────────────────────────────────────────────────
    const fetchOrders = useCallback(async () => {
        if (!siteId || !isPayEat) { setOrdersLoading(false); return; }
        setOrdersLoading(true);
        const { data } = await supabase
            .from('orders')
            .select('*')
            .eq('site_id', siteId)
            .gte('created_at', todayMidnight())
            .order('created_at', { ascending: false });
        setOrders((data as Order[]) ?? []);
        setOrdersLoading(false);
    }, [siteId, isPayEat]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    // ── Realtime subscription ───────────────────────────────────────────────
    useEffect(() => {
        if (!siteId || !isPayEat) return;
        const channel = supabase
            .channel(`dashboard-orders-${siteId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `site_id=eq.${siteId}` }, payload => {
                if (payload.eventType === 'INSERT') {
                    setOrders(prev => [payload.new as Order, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    const updated = payload.new as Order;
                    setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [siteId, isPayEat]);

    // ── Derived insight numbers ─────────────────────────────────────────────
    const totalOrders   = orders.length;
    const totalRevenue  = orders.reduce((s, o) => s + Number(o.subtotal), 0);
    const activeOrders  = orders.filter(o => o.status === 'preparing' || o.status === 'ready').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const liveOrders    = orders.filter(o => o.status !== 'completed').slice(0, 5);

    // ── Store toggle ────────────────────────────────────────────────────────
    const handleToggleStore = async () => {
        if (toggling || !siteId || isTrialExpired) return;
        const next = !storeOpen;
        setStoreOpen(next);
        setToggling(true);
        try {
            const token = await firebaseAuth.currentUser?.getIdToken();
            if (!token) { setStoreOpen(!next); setToggling(false); return; }
            const res = await fetch('/api/sites/toggle-live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ siteId, is_live: next }),
            });
            if (!res.ok) setStoreOpen(!next);
        } catch {
            setStoreOpen(!next);
        }
        setToggling(false);
    };

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-8">

            {/* Page header */}
            <div className="flex items-start justify-between mb-5 lg:mb-6">
                <div>
                    <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: '32px' }}>Dashboard</h1>
                    <p className="text-[#52525C] mt-1" style={{ fontSize: 14, lineHeight: '22px' }}>Manage your orders in real-time</p>
                </div>
                <a
                    href={siteUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity shrink-0"
                    style={{ background: '#5137EF', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                    <span className="hidden sm:inline">Preview Store</span>
                </a>
            </div>

            {/* Store Status */}
            {!planLoading && isTrialExpired ? (
                <div className="flex items-center justify-between mb-5 lg:mb-6" style={{ border: '1px solid #FECACA', borderRadius: 12, padding: '14px 20px', background: '#FEF2F2' }}>
                    <div className="flex items-center gap-3">
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#DC2626', fontVariationSettings: "'FILL' 1" }}>lock</span>
                        </div>
                        <div>
                            <p className="font-semibold" style={{ fontSize: 14, color: '#7F1D1D' }}>Store is offline</p>
                            <p style={{ fontSize: 12, color: '#B91C1C' }}>Your free trial ended. Activate a plan to go live.</p>
                        </div>
                    </div>
                    <Link href="/manage/subscription" className="shrink-0 flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#DC2626', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_forward</span>
                        Activate Plan
                    </Link>
                </div>
            ) : (
                <div className="flex items-center justify-between mb-5 lg:mb-6" style={{ border: '1px solid #E4E4E7', borderRadius: 12, padding: '14px 20px', background: '#FFFFFF' }}>
                    <div className="flex items-center gap-3">
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: storeOpen ? '#DCFCE7' : '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18, color: storeOpen ? '#16A34A' : '#71717A' }}>power_settings_new</span>
                        </div>
                        <div>
                            <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 14 }}>Store Status</p>
                            <p className="text-[#71717A]" style={{ fontSize: 12 }}>Use the toggle to switch store status (Open/Closed)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:inline" style={{ fontSize: 12, fontWeight: 500, color: storeOpen ? '#16A34A' : '#71717A' }}>
                            {storeOpen ? (isPayEat ? 'Open & Accepting Orders' : 'Open, users can view now') : 'Closed'}
                        </span>
                        <button
                            onClick={handleToggleStore}
                            disabled={toggling}
                            style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 46, height: 24, borderRadius: 9999, background: storeOpen ? '#00A63E' : '#D4D4D8', border: 'none', cursor: toggling ? 'wait' : 'pointer', transition: 'background 0.2s', padding: 0, flexShrink: 0, opacity: toggling ? 0.7 : 1 }}
                        >
                            <span style={{ position: 'absolute', top: 3, left: storeOpen ? 24 : 3, width: 18, height: 18, borderRadius: '50%', background: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                        </button>
                    </div>
                </div>
            )}

            {/* ── INSIGHTS ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 17 }}>Insights</h2>
                {isPayEat && <span style={{ fontSize: 12, color: '#71717A' }}>Today</span>}
            </div>

            {!isPayEat ? (
                <div className="flex flex-col items-center justify-center text-center mb-6 md:mb-8" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '36px 24px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>bar_chart</span>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Insights — Pay-Eat Plan Required</p>
                    <p className="text-[#71717A]" style={{ fontSize: 13, maxWidth: 320 }}>
                        Sales analytics and order insights are available on the QR Ordering plan.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 md:mb-8">
                    {[
                        { label: 'Orders Today',  value: ordersLoading ? '—' : String(totalOrders),   icon: 'receipt_long',      color: '#5137EF', bg: '#EEEEFF' },
                        { label: 'Revenue Today', value: ordersLoading ? '—' : `₹${totalRevenue}`,    icon: 'payments',          color: '#16A34A', bg: '#F0FDF4' },
                        { label: 'Active Orders', value: ordersLoading ? '—' : String(activeOrders),  icon: 'local_fire_department', color: '#F97316', bg: '#FFF7ED' },
                        { label: 'Completed',     value: ordersLoading ? '—' : String(completedOrders), icon: 'check_circle',    color: '#0EA5E9', bg: '#F0F9FF' },
                    ].map(card => (
                        <div key={card.label} style={{ border: '1px solid #E4E4E7', borderRadius: 12, padding: '16px', background: '#FFFFFF' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 17, color: card.color, fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>
                                </div>
                                <span style={{ fontSize: 12, color: '#71717A', fontWeight: 500 }}>{card.label}</span>
                            </div>
                            <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 22, lineHeight: 1 }}>{card.value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* ── LIVE ORDERS ───────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 17 }}>Live Orders</h2>
                {isPayEat && (
                    <Link href="/manage/orders" style={{ fontSize: 13, fontWeight: 500, color: '#5137EF', textDecoration: 'none' }}>View All</Link>
                )}
            </div>

            {!isPayEat && (
                <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>lock</span>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Live Orders — Pay-Eat Plan Required</p>
                    <p className="text-[#71717A]" style={{ fontSize: 13, marginBottom: 20, maxWidth: 320 }}>
                        Real-time order management is available on the QR Ordering plan.
                    </p>
                    <Link href="/manage/subscription" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
                        Upgrade Plan
                    </Link>
                </div>
            )}

            {isPayEat && (
                ordersLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #E4E4E7', borderTopColor: '#5137EF', animation: 'spin 0.7s linear infinite' }} />
                    </div>
                ) : liveOrders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
                        <span className="material-symbols-outlined text-[#D4D4D8] mb-3" style={{ fontSize: 38 }}>receipt_long</span>
                        <p className="font-semibold text-[#52525C]" style={{ fontSize: 15 }}>No active orders</p>
                        <p className="text-[#71717A] mt-1" style={{ fontSize: 13 }}>Orders placed by customers will appear here in real time.</p>
                    </div>
                ) : (
                    <div style={{ border: '1px solid #E4E4E7', borderRadius: 14, overflow: 'hidden' }}>
                        {liveOrders.map((order, idx) => {
                            const st = STATUS_STYLES[order.status] ?? STATUS_STYLES.preparing;
                            const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
                            const firstName = order.items[0]?.name ?? '—';
                            const summary = itemCount > 1 ? `${firstName} +${itemCount - 1} more` : firstName;
                            return (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between gap-3"
                                    style={{ padding: '14px 16px', background: '#FFFFFF', borderBottom: idx < liveOrders.length - 1 ? '1px solid #E4E4E7' : 'none' }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>#{order.order_number}</span>
                                            <span style={{ fontSize: 12, color: '#71717A' }}>{order.customer_name ?? '—'}</span>
                                        </div>
                                        <p style={{ fontSize: 12, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{order.subtotal}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 6, padding: '3px 8px' }}>{st.label}</span>
                                        <span style={{ fontSize: 11, color: '#99A1AF' }}>{formatTime(order.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
    return (
        <Suspense>
            <DashboardContent />
        </Suspense>
    );
}

function DashboardContent() {
    const { activeSite, refreshSites } = useSite();
    const searchParams = useSearchParams();
    const [showBanner, setShowBanner] = useState(false);
    const [itemCount, setItemCount] = useState(0);

    useEffect(() => {
        const onboarded = searchParams.get('onboarded');
        const items = searchParams.get('items');
        if (onboarded === 'true') {
            setShowBanner(true);
            setItemCount(Number(items ?? 0));
            refreshSites();
            window.history.replaceState({}, '', '/manage/dashboard');
        }
    }, [searchParams, refreshSites]);

    const siteSlug = activeSite?.slug ?? '';
    const siteUrl = siteSlug ? `/shop/${siteSlug}` : '#';
    const siteId = activeSite?.id ?? '';
    const initialStoreOpen = activeSite ? activeSite.is_live !== false : true;

    return (
        <>
            {showBanner && (
                <div className="mx-4 mt-4 md:mx-8 flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-green-600" style={{ fontSize: 20 }}>check_circle</span>
                        <p className="text-sm font-medium text-green-800">
                            {itemCount > 0
                                ? `Your menu is ready! ${itemCount} items extracted from your photos.`
                                : 'Your store is set up! Add menu items from the product inventory.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {siteSlug && (
                            <a href={`/shop/${siteSlug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
                                Preview Menu
                            </a>
                        )}
                        <button onClick={() => setShowBanner(false)} className="text-green-500 hover:text-green-700">
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                        </button>
                    </div>
                </div>
            )}
            <RealDashboard key={siteId} siteUrl={siteUrl} siteId={siteId} initialStoreOpen={initialStoreOpen} />
        </>
    );
}
