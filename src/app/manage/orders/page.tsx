'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePlan } from '@/components/PlanContext';

type OrderStatus = 'Preparing' | 'Ready' | 'Completed';

interface OrderItem { qty: number; name: string; }

interface Order {
    id: string;
    order_number: string;
    mobile_number: string;
    items: string;
    order_time: string;
    amount: number;
    status: OrderStatus;
    orderItems: OrderItem[];
}

const STATUS_STYLES: Record<OrderStatus, { color: string; bg: string; border: string; chevron: boolean }> = {
    Preparing: { color: '#F97316', bg: 'transparent', border: '1px solid #F97316', chevron: true },
    Ready:     { color: '#16A34A', bg: 'transparent', border: '1px solid #16A34A', chevron: true },
    Completed: { color: '#5137EF', bg: '#EEEEFF',     border: 'none',              chevron: false },
};

const NEXT_STATUS: Record<OrderStatus, OrderStatus> = {
    Preparing: 'Ready',
    Ready: 'Completed',
    Completed: 'Preparing',
};

const ORDERS_DATA: Order[] = [
    {
        id: '1', order_number: '4108160', mobile_number: '+91 8610042270',
        items: 'Cardamom Tea, Cheese Cake, Waffle &+3', order_time: 'Today 07:47 pm', amount: 700, status: 'Preparing',
        orderItems: [{ qty: 1, name: 'Cardamom Tea' }, { qty: 2, name: 'Cheese Cake' }, { qty: 1, name: 'Waffle' }, { qty: 1, name: 'Mutton Biryani' }, { qty: 3, name: 'Butter Naan' }, { qty: 1, name: 'Dal Makhani' }],
    },
    {
        id: '2', order_number: '4108161', mobile_number: '+91 9500540962',
        items: 'Chocolate Waffle x 3', order_time: 'Today 06:30 pm', amount: 374, status: 'Preparing',
        orderItems: [{ qty: 3, name: 'Chocolate Waffle' }],
    },
    {
        id: '3', order_number: '4108162', mobile_number: '+91 8754856985',
        items: 'Cheese cake, Sandwich, chocolate milk shake x 2', order_time: 'Today 06:28 pm', amount: 1054, status: 'Ready',
        orderItems: [{ qty: 1, name: 'Cheese Cake' }, { qty: 1, name: 'Sandwich' }, { qty: 2, name: 'Chocolate Milk Shake' }],
    },
    {
        id: '4', order_number: '4108163', mobile_number: '+91 8610042270',
        items: 'Cardamom Tea, Cheese Cake, Waffle &+3', order_time: 'Today 06:22 pm', amount: 817, status: 'Ready',
        orderItems: [{ qty: 1, name: 'Cardamom Tea' }, { qty: 1, name: 'Cheese Cake' }, { qty: 1, name: 'Waffle' }, { qty: 1, name: 'Mutton Biryani' }, { qty: 1, name: 'Gulab Jamun' }, { qty: 1, name: 'Paneer Tikka' }, { qty: 1, name: 'Jeera Rice' }],
    },
    {
        id: '5', order_number: '4108164', mobile_number: '+91 8754053013',
        items: 'Cake 84 + cheese toppings x 2', order_time: 'Today 06:20 pm', amount: 216, status: 'Completed',
        orderItems: [{ qty: 2, name: 'Cake 84 + Cheese Toppings' }],
    },
    {
        id: '6', order_number: '4108165', mobile_number: '+91 7845126758',
        items: 'Chocolate Milk Shake x 1', order_time: 'Today 05:12 pm', amount: 714, status: 'Completed',
        orderItems: [{ qty: 1, name: 'Chocolate Milk Shake' }],
    },
    {
        id: '7', order_number: '4108166', mobile_number: '+91 8546791257',
        items: 'Cheese Sandwich x 4', order_time: 'Today 05:10 pm', amount: 312, status: 'Completed',
        orderItems: [{ qty: 4, name: 'Cheese Sandwich' }],
    },
];

function StatusBadge({ status, chevron, onCycle }: { status: OrderStatus; chevron: boolean; onCycle: () => void }) {
    const s = STATUS_STYLES[status];
    return (
        <button
            onClick={() => chevron && onCycle()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, background: s.bg, border: s.border, color: s.color, fontSize: 12, fontWeight: 500, cursor: chevron ? 'pointer' : 'default' }}
        >
            {status}
            {chevron && <span className="material-symbols-outlined" style={{ fontSize: 13 }}>keyboard_arrow_down</span>}
        </button>
    );
}

export default function OrdersPage() {
    const { isPayEat } = usePlan();
    const [orders, setOrders] = useState<Order[]>(ORDERS_DATA);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const cycleStatus = (id: string, current: OrderStatus) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: NEXT_STATUS[current] } : o));
    };

    const COLS = ['ORDER ID', 'MOBILE NUMBER', 'ITEMS', 'ORDER TIME', 'AMOUNT', 'STATUS'];
    const totalItems = selectedOrder ? selectedOrder.orderItems.reduce((sum, i) => sum + i.qty, 0) : 0;

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-8">

            {/* Page header */}
            <div className="mb-5 lg:mb-6">
                <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: '32px' }}>Orders</h1>
                <p className="text-[#52525C] mt-1" style={{ fontSize: 14, fontWeight: 400, lineHeight: '22px' }}>
                    Manage your customers orders
                </p>
            </div>

            {/* QR Menu plan — Coming Soon */}
            {!isPayEat && (
                <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>lock</span>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Orders — Coming Soon</p>
                    <p className="text-[#71717A]" style={{ fontSize: 13, marginBottom: 20, maxWidth: 320 }}>
                        Order management is available on the Pay-Eat plan. Upgrade to start accepting and tracking orders.
                    </p>
                    <Link href="/manage/subscription" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
                        Upgrade Plan
                    </Link>
                </div>
            )}

            {/* Pay-Eat plan — Desktop table + Mobile cards */}
            {isPayEat && <>

            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden lg:block overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                <div className="grid" style={{ gridTemplateColumns: '150px 160px 1fr 150px 110px 170px', background: '#F4F4F4', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}>
                    {COLS.map(col => (
                        <div key={col} className="text-[#71717A]" style={{ padding: '12px 0', fontSize: 12, fontWeight: 500, lineHeight: '18px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                            {col}
                        </div>
                    ))}
                </div>

                {orders.length === 0 ? (
                    <div className="py-20 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[#D4D4D8]" style={{ fontSize: 48 }}>receipt_long</span>
                        <p className="font-medium text-[#71717A]" style={{ fontSize: 14 }}>No orders yet</p>
                    </div>
                ) : (
                    orders.map((order, idx) => {
                        const s = STATUS_STYLES[order.status] ?? STATUS_STYLES.Preparing;
                        return (
                            <div
                                key={order.id}
                                className="grid items-center"
                                style={{ gridTemplateColumns: '150px 160px 1fr 150px 110px 170px', padding: '0 24px', minHeight: 50, background: '#FFFFFF', borderBottom: idx < orders.length - 1 ? '1px solid #E4E4E7' : 'none' }}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>#{order.order_number}</div>
                                <div style={{ fontSize: 13, color: '#52525C' }}>{order.mobile_number}</div>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="truncate text-left pr-4 hover:underline"
                                    style={{ fontSize: 13, color: '#5137EF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                >
                                    {order.items}
                                </button>
                                <div style={{ fontSize: 13, color: '#52525C' }}>{order.order_time}</div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{order.amount}</div>
                                <div>
                                    <button
                                        onClick={() => s.chevron && cycleStatus(order.id, order.status)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: s.bg, border: s.border, color: s.color, fontSize: 12, fontWeight: 500, cursor: s.chevron ? 'pointer' : 'default' }}
                                    >
                                        {order.status}
                                        {s.chevron && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>keyboard_arrow_down</span>}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="lg:hidden overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                {orders.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-2">
                        <span className="material-symbols-outlined text-[#D4D4D8]" style={{ fontSize: 40 }}>receipt_long</span>
                        <p className="font-medium text-[#71717A]" style={{ fontSize: 14 }}>No orders yet</p>
                    </div>
                ) : orders.map((order, idx) => {
                    const s = STATUS_STYLES[order.status];
                    return (
                        <div
                            key={order.id}
                            style={{ padding: '14px 16px', background: '#FFFFFF', borderBottom: idx < orders.length - 1 ? '1px solid #E4E4E7' : 'none' }}
                        >
                            {/* Row 1: Order ID · Items (center) · Status */}
                            <div className="flex items-center gap-2 mb-1.5">
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', flexShrink: 0 }}>#{order.order_number}</span>
                                <button
                                    onClick={() => setSelectedOrder(order)}
                                    className="flex-1 min-w-0 text-center"
                                    style={{ fontSize: 12, color: '#5137EF', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                    {order.items}
                                </button>
                                <div style={{ flexShrink: 0 }}>
                                    <StatusBadge
                                        status={order.status}
                                        chevron={s.chevron}
                                        onCycle={() => cycleStatus(order.id, order.status)}
                                    />
                                </div>
                            </div>
                            {/* Row 2: Phone + Amount */}
                            <div className="flex items-center justify-between">
                                <span style={{ fontSize: 12, color: '#52525C' }}>{order.mobile_number}</span>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#0A0A0A' }}>₹{order.amount}</span>
                            </div>
                            {/* Row 3: Time */}
                            <p style={{ fontSize: 11, color: '#99A1AF', marginTop: 3 }}>{order.order_time}</p>
                        </div>
                    );
                })}
            </div>

            {/* ── ORDER DETAIL MODAL ── */}
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
            </>}
        </div>
    );
}
