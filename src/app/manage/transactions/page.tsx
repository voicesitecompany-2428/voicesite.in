'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePlan } from '@/components/PlanContext';
import { useSite } from '@/components/SiteContext';
import { supabase } from '@/lib/supabase';

type TxnStatus = 'Success' | 'Failed' | 'Pending' | 'Refunded';
type PaymentMode = 'Card' | 'UPI' | 'Cash' | 'NetBanking' | 'Wallet';

interface Transaction {
    id: string;
    txn_id: string;
    order_id: string | null;
    transacted_at: string;
    customer_mobile: string | null;
    amount: number;
    status: TxnStatus;
    payment_mode: PaymentMode;
}

const COLS = ['TRANSACTION ID', 'ORDER ID', 'DATE', 'MOBILE NUMBER', 'AMOUNT', 'STATUS', 'MODE'];

function formatDate(iso: string): string {
    const d = new Date(iso);
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${time}, ${date}`;
}

function StatusChip({ status }: { status: TxnStatus }) {
    const map: Record<TxnStatus, { color: string; icon: string }> = {
        Success:  { color: '#16A34A', icon: 'check_circle' },
        Failed:   { color: '#E7000B', icon: 'cancel' },
        Pending:  { color: '#F97316', icon: 'schedule' },
        Refunded: { color: '#5137EF', icon: 'replay' },
    };
    const { color, icon } = map[status] ?? map.Pending;
    return (
        <div className="flex items-center gap-1">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color, fontVariationSettings: "'FILL' 1" }}>{icon}</span>
            <span style={{ fontSize: 13, fontWeight: 500, color }}>{status}</span>
        </div>
    );
}

export default function TransactionsPage() {
    const { isPayEat } = usePlan();
    const { activeSite } = useSite();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const siteId = activeSite?.id;

    const fetchTransactions = useCallback(async () => {
        if (!siteId) return;
        setLoading(true);
        const { data } = await supabase
            .from('transactions')
            .select('*')
            .eq('site_id', siteId)
            .order('transacted_at', { ascending: false })
            .limit(200);
        setTransactions((data as Transaction[]) ?? []);
        setLoading(false);
    }, [siteId]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    // Realtime — new transactions appear instantly without refresh
    useEffect(() => {
        if (!siteId) return;
        const channel = supabase
            .channel(`transactions-${siteId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `site_id=eq.${siteId}` }, payload => {
                setTransactions(prev => [payload.new as Transaction, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `site_id=eq.${siteId}` }, payload => {
                const updated = payload.new as Transaction;
                setTransactions(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [siteId]);

    const shortOrderId = (orderId: string | null) =>
        orderId ? `#${orderId.slice(-6).toUpperCase()}` : '—';

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-8">

            {/* Page header */}
            <div className="flex items-start justify-between mb-5 lg:mb-6">
                <div>
                    <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: '32px' }}>Transactions</h1>
                    <p className="text-[#52525C] mt-1" style={{ fontSize: 14, fontWeight: 400, lineHeight: '22px' }}>
                        All payment records for your store
                    </p>
                </div>
            </div>

            {/* Locked state */}
            {!isPayEat && (
                <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>lock</span>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Transactions — Pay-Eat Plan Required</p>
                    <p className="text-[#71717A]" style={{ fontSize: 13, marginBottom: 20, maxWidth: 320 }}>
                        Transaction history is available on the QR Ordering plan. Upgrade to view all payment records.
                    </p>
                    <Link href="/manage/subscription" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
                        Upgrade Plan
                    </Link>
                </div>
            )}

            {isPayEat && (
                <>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #E4E4E7', borderTopColor: '#5137EF', animation: 'spin 0.7s linear infinite' }} />
                            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16">
                            <span className="material-symbols-outlined text-[#D4D4D8] mb-3" style={{ fontSize: 40 }}>receipt_long</span>
                            <p className="font-medium text-[#52525C]" style={{ fontSize: 15 }}>No transactions yet</p>
                            <p className="text-[#71717A] mt-1" style={{ fontSize: 13 }}>Transactions will appear here once customers place orders.</p>
                        </div>
                    ) : (
                        <>
                            {/* ── DESKTOP TABLE ── */}
                            <div className="hidden lg:block overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                                <div
                                    className="grid"
                                    style={{ gridTemplateColumns: '160px 110px 190px 160px 90px 120px 1fr', background: '#F4F4F4', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}
                                >
                                    {COLS.map(col => (
                                        <div key={col} className="text-[#71717A]" style={{ padding: '12px 0', fontSize: 12, fontWeight: 500, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                                            {col}
                                        </div>
                                    ))}
                                </div>
                                {transactions.map((txn, idx) => (
                                    <div
                                        key={txn.id}
                                        className="grid items-center"
                                        style={{ gridTemplateColumns: '160px 110px 190px 160px 90px 120px 1fr', padding: '0 24px', minHeight: 50, background: '#FFFFFF', borderBottom: idx < transactions.length - 1 ? '1px solid #E4E4E7' : 'none' }}
                                    >
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>{txn.txn_id}</div>
                                        <div style={{ fontSize: 13, color: '#52525C' }}>{shortOrderId(txn.order_id)}</div>
                                        <div style={{ fontSize: 13, color: '#52525C' }}>{formatDate(txn.transacted_at)}</div>
                                        <div style={{ fontSize: 13, color: '#52525C' }}>{txn.customer_mobile ? `+91 ${txn.customer_mobile}` : '—'}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{txn.amount}</div>
                                        <StatusChip status={txn.status} />
                                        <div style={{ fontSize: 13, color: '#52525C' }}>{txn.payment_mode}</div>
                                    </div>
                                ))}
                            </div>

                            {/* ── MOBILE CARDS ── */}
                            <div className="lg:hidden overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                                {transactions.map((txn, idx) => (
                                    <div key={txn.id} style={{ padding: '14px 16px', background: '#FFFFFF', borderBottom: idx < transactions.length - 1 ? '1px solid #E4E4E7' : 'none' }}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{txn.txn_id}</span>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>₹{txn.amount}</span>
                                        </div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span style={{ fontSize: 12, color: '#52525C' }}>{shortOrderId(txn.order_id)} · {txn.payment_mode}</span>
                                            <StatusChip status={txn.status} />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span style={{ fontSize: 11, color: '#99A1AF' }}>{formatDate(txn.transacted_at)}</span>
                                            <span style={{ fontSize: 11, color: '#99A1AF' }}>{txn.customer_mobile ? `+91 ${txn.customer_mobile}` : '—'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
