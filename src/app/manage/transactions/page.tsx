'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePlan } from '@/components/PlanContext';

type TxnStatus = 'Success' | 'Failed';
type PaymentMode = 'Card' | 'UPI' | 'Cash';

interface Transaction {
    id: string;
    txn_id: string;
    order_id: string;
    date: string;
    mobile_number: string;
    amount: number;
    status: TxnStatus;
    mode: PaymentMode;
}

const TRANSACTIONS: Transaction[] = [
    { id: '1', txn_id: 'TXN12345678', order_id: '#4108160', date: '09:45 am, 29 Mar 2026', mobile_number: '+91 8610042270', amount: 245,  status: 'Success', mode: 'Card' },
    { id: '2', txn_id: 'TXN12345679', order_id: '#4108161', date: '10:12 am, 29 Mar 2026', mobile_number: '+91 9500540962', amount: 374,  status: 'Success', mode: 'UPI'  },
    { id: '3', txn_id: 'TXN12345680', order_id: '#4108162', date: '11:30 am, 29 Mar 2026', mobile_number: '+91 8754856985', amount: 1054, status: 'Failed',  mode: 'Card' },
    { id: '4', txn_id: 'TXN12345681', order_id: '#4108163', date: '12:05 pm, 29 Mar 2026', mobile_number: '+91 8610042270', amount: 817,  status: 'Success', mode: 'Cash' },
    { id: '5', txn_id: 'TXN12345682', order_id: '#4108164', date: '02:18 pm, 29 Mar 2026', mobile_number: '+91 8754053013', amount: 216,  status: 'Success', mode: 'UPI'  },
    { id: '6', txn_id: 'TXN12345683', order_id: '#4108165', date: '03:44 pm, 29 Mar 2026', mobile_number: '+91 7845126758', amount: 714,  status: 'Failed',  mode: 'Card' },
    { id: '7', txn_id: 'TXN12345684', order_id: '#4108166', date: '04:55 pm, 29 Mar 2026', mobile_number: '+91 8546791257', amount: 312,  status: 'Success', mode: 'UPI'  },
    { id: '8', txn_id: 'TXN12345685', order_id: '#4108167', date: '06:10 pm, 29 Mar 2026', mobile_number: '+91 9876543210', amount: 540,  status: 'Failed',  mode: 'Cash' },
];

const COLS = ['TRANSACTION ID', 'ORDER ID', 'DATE', 'MOBILE NUMBER', 'AMOUNT', 'STATUS', 'MODE'];

function StatusChip({ status }: { status: TxnStatus }) {
    const isSuccess = status === 'Success';
    return (
        <div className="flex items-center gap-1">
            <span
                className="material-symbols-outlined"
                style={{ fontSize: 15, color: isSuccess ? '#16A34A' : '#E7000B', fontVariationSettings: "'FILL' 1" }}
            >
                {isSuccess ? 'check_circle' : 'cancel'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 500, color: isSuccess ? '#16A34A' : '#E7000B' }}>
                {status}
            </span>
        </div>
    );
}

export default function TransactionsPage() {
    const { isPayEat } = usePlan();
    const [transactions] = useState<Transaction[]>(TRANSACTIONS);

    return (
        <div className="px-4 md:px-8 py-5 md:py-8">

            {/* Page header */}
            <div className="flex items-start justify-between mb-5 md:mb-6">
                <div>
                    <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 26, lineHeight: '32px' }}>Transactions</h1>
                    <p className="text-[#52525C] mt-1" style={{ fontSize: 14, fontWeight: 400, lineHeight: '22px' }}>
                        Track and manage all payment transactions
                    </p>
                </div>
                {isPayEat && (
                    <button
                        className="flex items-center gap-1.5 transition-colors hover:bg-neutral-50 shrink-0"
                        style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#0A0A0A', background: '#FFFFFF' }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>upload</span>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                )}
            </div>

            {/* QR Menu plan — Coming Soon */}
            {!isPayEat && (
                <div className="flex flex-col items-center justify-center text-center" style={{ border: '1px solid #E4E4E7', borderRadius: 14, padding: '48px 24px', background: '#FAFAFA' }}>
                    <div className="flex items-center justify-center" style={{ width: 52, height: 52, borderRadius: '50%', background: '#EEEEFF', marginBottom: 16 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 26, color: '#5137EF' }}>lock</span>
                    </div>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 16, marginBottom: 6 }}>Transactions — Coming Soon</p>
                    <p className="text-[#71717A]" style={{ fontSize: 13, marginBottom: 20, maxWidth: 320 }}>
                        Transaction history is available on the Pay-Eat plan. Upgrade to view and export payment records.
                    </p>
                    <Link href="/manage/subscription" className="flex items-center gap-1.5 text-white hover:opacity-90 transition-opacity" style={{ background: '#5137EF', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>arrow_upward</span>
                        Upgrade Plan
                    </Link>
                </div>
            )}

            {isPayEat && <>

            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden md:block overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                <div
                    className="grid"
                    style={{ gridTemplateColumns: '160px 110px 190px 160px 90px 120px 1fr', background: '#F4F4F4', borderBottom: '1px solid #E4E4E7', padding: '0 24px' }}
                >
                    {COLS.map(col => (
                        <div key={col} className="text-[#71717A]" style={{ padding: '12px 0', fontSize: 12, fontWeight: 500, lineHeight: '18px', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
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
                        <div style={{ fontSize: 13, color: '#52525C' }}>{txn.order_id}</div>
                        <div style={{ fontSize: 13, color: '#52525C' }}>{txn.date}</div>
                        <div style={{ fontSize: 13, color: '#52525C' }}>{txn.mobile_number}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0A0A0A' }}>₹{txn.amount}</div>
                        <StatusChip status={txn.status} />
                        <div style={{ fontSize: 13, color: '#52525C' }}>{txn.mode}</div>
                    </div>
                ))}
            </div>

            {/* ── MOBILE CARDS ── */}
            <div className="md:hidden overflow-hidden" style={{ border: '1px solid #E4E4E7', borderRadius: 14 }}>
                {transactions.map((txn, idx) => (
                    <div
                        key={txn.id}
                        style={{ padding: '14px 16px', background: '#FFFFFF', borderBottom: idx < transactions.length - 1 ? '1px solid #E4E4E7' : 'none' }}
                    >
                        {/* Row 1: TXN ID + Amount */}
                        <div className="flex items-center justify-between mb-1.5">
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{txn.txn_id}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A' }}>₹{txn.amount}</span>
                        </div>
                        {/* Row 2: Order ID + Status */}
                        <div className="flex items-center justify-between mb-1">
                            <span style={{ fontSize: 12, color: '#52525C' }}>{txn.order_id} · {txn.mode}</span>
                            <StatusChip status={txn.status} />
                        </div>
                        {/* Row 3: Date + Phone */}
                        <div className="flex items-center justify-between">
                            <span style={{ fontSize: 11, color: '#99A1AF' }}>{txn.date}</span>
                            <span style={{ fontSize: 11, color: '#99A1AF' }}>{txn.mobile_number}</span>
                        </div>
                    </div>
                ))}
            </div>
            </>}
        </div>
    );
}
