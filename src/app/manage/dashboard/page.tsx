'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePlan } from '@/components/PlanContext';
import { useSite } from '@/components/SiteContext';
import { supabase } from '@/lib/supabase';

/* ── Types ── */
type OrderStatus = 'Preparing' | 'Ready' | 'Completed';
interface OrderItem { qty: number; name: string; }

interface LiveOrder {
    id: string;
    order_number: string;
    mobile_number: string;
    items: string;
    order_time: string;
    amount: number;
    status: OrderStatus;
    orderItems: OrderItem[];
}

/* ── Fake data ── */
const FAKE_ORDERS: LiveOrder[] = [
    { id: '1', order_number: '4108160', mobile_number: '+91 8610042270', items: 'Cardamom Tea, Cheese Cake, Waffle &+3', order_time: 'Today 07:47 pm', amount: 700,  status: 'Preparing',
      orderItems: [{ qty: 1, name: 'Cardamom Tea' }, { qty: 2, name: 'Cheese Cake' }, { qty: 1, name: 'Waffle' }, { qty: 1, name: 'Mutton Biryani' }, { qty: 3, name: 'Butter Naan' }, { qty: 1, name: 'Dal Makhani' }] },
    { id: '2', order_number: '4108161', mobile_number: '+91 9500540962', items: 'Chocolate Waffle x 3', order_time: 'Today 06:30 pm', amount: 374, status: 'Preparing',
      orderItems: [{ qty: 3, name: 'Chocolate Waffle' }] },
    { id: '3', order_number: '4108162', mobile_number: '+91 8754856985', items: 'Cheese cake, Sandwich, chocolate milk shake x 2', order_time: 'Today 06:28 pm', amount: 1054, status: 'Ready',
      orderItems: [{ qty: 1, name: 'Cheese Cake' }, { qty: 1, name: 'Sandwich' }, { qty: 2, name: 'Chocolate Milk Shake' }] },
    { id: '4', order_number: '4108163', mobile_number: '+91 8610042270', items: 'Cardamom Tea, Cheese Cake, Waffle &+3', order_time: 'Today 06:22 pm', amount: 817, status: 'Ready',
      orderItems: [{ qty: 1, name: 'Cardamom Tea' }, { qty: 1, name: 'Cheese Cake' }, { qty: 1, name: 'Waffle' }, { qty: 1, name: 'Mutton Biryani' }, { qty: 1, name: 'Gulab Jamun' }, { qty: 1, name: 'Paneer Tikka' }, { qty: 1, name: 'Jeera Rice' }] },
    { id: '5', order_number: '4108164', mobile_number: '+91 8754053013', items: 'Cake 84 + cheese toppings x 2', order_time: 'Today 06:20 pm', amount: 216, status: 'Completed',
      orderItems: [{ qty: 2, name: 'Cake 84 + Cheese Toppings' }] },
    { id: '6', order_number: '4108165', mobile_number: '+91 7845126758', items: 'Chocolate Milk Shake x 1', order_time: 'Today 05:12 pm', amount: 714, status: 'Completed',
      orderItems: [{ qty: 1, name: 'Chocolate Milk Shake' }] },
    { id: '7', order_number: '4108166', mobile_number: '+91 8546791257', items: 'Cheese Sandwich x 4', order_time: 'Today 05:10 pm', amount: 312, status: 'Completed',
      orderItems: [{ qty: 4, name: 'Cheese Sandwich' }] },
];

const STATUS_STYLES: Record<OrderStatus, { color: string; bg: string; border: string; chevron: boolean }> = {
    Preparing: { color: '#F97316', bg: 'transparent', border: '1px solid #F97316', chevron: true },
    Ready:     { color: '#16A34A', bg: 'transparent', border: '1px solid #16A34A', chevron: true },
    Completed: { color: '#5137EF', bg: '#EEEEFF',     border: 'none',              chevron: false },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
    Preparing: 'Ready',
    Ready:     'Completed',
    Completed: 'Preparing',
};

/* ══════════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════════ */
function RealDashboard({ siteUrl, siteId, initialStoreOpen }: { siteUrl: string; siteId: string; initialStoreOpen: boolean }) {
    const { isPayEat } = usePlan();
    const [storeOpen, setStoreOpen] = useState(initialStoreOpen);
    const [toggling, setToggling] = useState(false);
    const [orders, setOrders] = useState<LiveOrder[]>(FAKE_ORDERS);
    const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);

    const cycleStatus = (id: string, current: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: NEXT_STATUS[current] } : o));
    };

    const handleToggleStore = async () => {
        if (toggling || !siteId) return;
        const next = !storeOpen;
        setStoreOpen(next);
        setToggling(true);
        const { error } = await supabase
            .from('sites')
            .update({ is_live: next })
            .eq('id', siteId);
        if (error) {
            console.error('Failed to update store status:', error);
            setStoreOpen(!next); // revert on error
        }
        setToggling(false);
    };

    const COLS = ['ORDER ID', 'MOBILE NUMBER', 'ITEMS', 'ORDER TIME', 'AMOUNT', 'STATUS'];
    const totalItems = selectedOrder ? selectedOrder.orderItems.reduce((s, i) => s + i.qty, 0) : 0;

    return (
        <div className="px-4 md:px-8 py-5 md:py-8">

            {/* Page header */}
            <div className="flex items-start justify-between mb-5 md:mb-6">
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
            <div className="flex items-center justify-between mb-5 md:mb-6" style={{ border: '1px solid #E4E4E7', borderRadius: 12, padding: '14px 20px', background: '#FFFFFF' }}>
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
                        {storeOpen
                            ? (isPayEat ? 'Open & Accepting Orders' : 'Open, users can view now')
                            : 'Closed'}
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

            {/* Insights */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 17 }}>Insights</h2>
            </div>

            <div className="flex flex-col items-center justify-center text-center mb-6 md:mb-8" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '36px 24px', background: '#FAFAFA' }}>
                <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>bar_chart</span>
                </div>
                <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Insights — Coming Soon</p>
                <p className="text-[#71717A]" style={{ fontSize: 13, maxWidth: 320 }}>
                    Sales analytics and order insights are available on the Pay-Eat plan.
                </p>
            </div>

            {/* Live Orders heading */}
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 17 }}>Live Orders</h2>
                {isPayEat && <Link href="/manage/orders" style={{ fontSize: 13, fontWeight: 500, color: '#5137EF', textDecoration: 'none' }}>View All</Link>}
            </div>

            {/* QR Menu plan — Coming Soon */}
            {!isPayEat && (
                <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>lock</span>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Live Orders — Coming Soon</p>
                    <p className="text-[#71717A]" style={{ fontSize: 13, marginBottom: 20, maxWidth: 320 }}>
                        Real-time order management is available on the Pay-Eat plan. Upgrade to start accepting and tracking orders.
                    </p>
                    <Link href="/manage/subscription" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
                        Upgrade Plan
                    </Link>
                </div>
            )}

            {/* Pay-Eat plan — Desktop table + Mobile cards + Modal */}
            {isPayEat && (
                <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                    <div className="grid" style={{ gridTemplateColumns: '130px 150px 1fr 140px 100px 150px', background: '#F4F4F4', borderBottom: '1px solid #E4E4E7', padding: '0 20px' }}>
                        {COLS.map(col => (
                            <div key={col} className="text-[#71717A]" style={{ padding: '10px 0', fontSize: 11, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{col}</div>
                        ))}
                    </div>
                    {orders.map((order, idx) => {
                        const s = STATUS_STYLES[order.status];
                        return (
                            <div key={order.id} className="grid items-center" style={{ gridTemplateColumns: '130px 150px 1fr 140px 100px 150px', padding: '0 20px', minHeight: 46, background: '#FFFFFF', borderBottom: idx < orders.length - 1 ? '1px solid #E4E4E7' : 'none' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>#{order.order_number}</div>
                                <div style={{ fontSize: 12, color: '#52525C' }}>{order.mobile_number}</div>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="truncate text-left pr-4 hover:underline"
                                    style={{ fontSize: 12, color: '#5137EF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    {order.items}
                                </button>
                                <div style={{ fontSize: 12, color: '#52525C' }}>{order.order_time}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{order.amount}</div>
                                <div>
                                    <button
                                        onClick={() => s.chevron && cycleStatus(order.id, order.status)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, background: s.bg, border: s.border, color: s.color, fontSize: 12, fontWeight: 500, cursor: s.chevron ? 'pointer' : 'default' }}
                                    >
                                        {order.status}
                                        {s.chevron && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>keyboard_arrow_down</span>}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                    {orders.map((order, idx) => {
                        const s = STATUS_STYLES[order.status];
                        return (
                            <div key={order.id} style={{ padding: '13px 16px', background: '#FFFFFF', borderBottom: idx < orders.length - 1 ? '1px solid #E4E4E7' : 'none' }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A', flexShrink: 0 }}>#{order.order_number}</span>
                                    <button
                                        onClick={() => setSelectedOrder(order)}
                                        className="flex-1 min-w-0 text-center truncate hover:underline"
                                        style={{ fontSize: 11, color: '#5137EF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                        {order.items}
                                    </button>
                                    <button
                                        onClick={() => s.chevron && cycleStatus(order.id, order.status)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, background: s.bg, border: s.border, color: s.color, fontSize: 11, fontWeight: 500, flexShrink: 0, cursor: s.chevron ? 'pointer' : 'default' }}
                                    >
                                        {order.status}
                                        {s.chevron && <span className="material-symbols-outlined" style={{ fontSize: 12 }}>keyboard_arrow_down</span>}
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ fontSize: 11, color: '#52525C' }}>{order.mobile_number}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{order.amount}</span>
                                </div>
                                <p style={{ fontSize: 10, color: '#99A1AF', marginTop: 2 }}>{order.order_time}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Order Detail Modal */}
                {selectedOrder && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.4)' }}
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        className="bg-white overflow-hidden mx-4"
                        style={{ width: '100%', maxWidth: 420, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.20)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Purple header */}
                        <div className="flex items-center justify-between" style={{ background: '#5137EF', padding: '14px 20px' }}>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white" style={{ fontSize: 13, letterSpacing: '0.5px' }}>NEW ORDERS</span>
                                <span className="text-white/70" style={{ fontSize: 12 }}>(4 mins ago)</span>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <span className="material-symbols-outlined text-white" style={{ fontSize: 20 }}>close</span>
                            </button>
                        </div>

                        {/* Body */}
                        <div style={{ padding: '20px 24px' }}>
                            <div className="flex items-start justify-between" style={{ marginBottom: 4 }}>
                                <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 24 }}>#{selectedOrder.order_number}</p>
                                <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 24 }}>₹{selectedOrder.amount}</p>
                            </div>
                            <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                                <p className="text-[#52525C]" style={{ fontSize: 14 }}>{selectedOrder.mobile_number}</p>
                                <button style={{ fontSize: 14, fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                                    Print Receipt
                                </button>
                            </div>
                            <div style={{ height: 1, background: '#E4E4E7', marginBottom: 16 }} />
                            <p className="font-bold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 14 }}>
                                Order Items ({totalItems})
                            </p>
                            <div className="flex flex-col" style={{ gap: 12 }}>
                                {selectedOrder.orderItems.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <span className="font-bold text-[#0A0A0A]" style={{ fontSize: 15, minWidth: 28 }}>{item.qty}x</span>
                                        <span className="text-[#0A0A0A]" style={{ fontSize: 15 }}>{item.name}</span>
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

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
    const { activeSite, refreshSites } = useSite();
    const searchParams = useSearchParams();
    const [showBanner, setShowBanner] = useState(false);
    const [itemCount, setItemCount] = useState(0);

    // After creating a new store via onboarding, refresh the site list and show a banner
    useEffect(() => {
        const onboarded = searchParams.get('onboarded');
        const items = searchParams.get('items');
        if (onboarded === 'true') {
            setShowBanner(true);
            setItemCount(Number(items ?? 0));
            refreshSites(); // pick up the newly created store
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
                            <a
                                href={`/shop/${siteSlug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 transition-colors"
                            >
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
