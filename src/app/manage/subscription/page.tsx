'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthContext';
import { supabase } from '@/lib/supabase';

type PlanKey = 'qr_menu' | 'pay_eat';

interface Sub {
    store_plan: string;
    store_expires_at: string | null;
    product_limit: number;
    banner_limit: number;
    site_limit: number;
    price_monthly: number;
}

const PLANS: Record<PlanKey, {
    name: string;
    tagline: string;
    price: number;
    color: string;
    features: string[];
    limits: { products: number; banners: number; sites: number };
}> = {
    qr_menu: {
        name: 'QR Menu',
        tagline: 'Free forever',
        price: 0,
        color: '#16A34A',
        features: [
            'Digital menu for your customers',
            'Up to 15 products',
            '3 promotional banners',
            '1 store',
            'Shareable QR code',
            'Basic analytics',
        ],
        limits: { products: 15, banners: 3, sites: 1 },
    },
    pay_eat: {
        name: 'Pay-Eat QR Menu',
        tagline: '₹499 / month',
        price: 499,
        color: '#5137EF',
        features: [
            'Everything in QR Menu',
            'Online ordering system',
            'Up to 50 products',
            '10 promotional banners',
            '3 stores',
            'Full order management',
            'Transaction & billing history',
        ],
        limits: { products: 50, banners: 10, sites: 3 },
    },
};

type ModalState = 'idle' | 'paying' | 'success';

export default function SubscriptionPage() {
    const { user } = useAuth();
    const [sub, setSub] = useState<Sub | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);
    const [modalState, setModalState] = useState<ModalState>('idle');

    const currentPlan: PlanKey =
        sub?.store_plan === 'pay_eat' ? 'pay_eat' : 'qr_menu';

    useEffect(() => {
        if (!user) return;
        supabase
            .from('user_subscriptions')
            .select('store_plan, store_expires_at, product_limit, banner_limit, site_limit, price_monthly')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
                setSub(data);
                setLoading(false);
            });
    }, [user]);

    const openModal = (plan: PlanKey) => {
        if (plan === currentPlan) return;
        setSelectedPlan(plan);
        setModalState('idle');
    };

    const closeModal = () => {
        if (modalState === 'paying') return;
        setSelectedPlan(null);
        setModalState('idle');
    };

    const handleConfirm = async () => {
        if (!selectedPlan || !user || modalState === 'paying') return;
        setModalState('paying');

        // Simulate payment delay
        await new Promise(r => setTimeout(r, 1500));

        const plan = PLANS[selectedPlan];

        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                store_plan: selectedPlan,
                product_limit: plan.limits.products,
                banner_limit: plan.limits.banners,
                site_limit: plan.limits.sites,
                price_monthly: plan.price,
                store_expires_at: selectedPlan === 'pay_eat'
                    ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    : null,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

        if (!error) {
            if (plan.price > 0) {
                await supabase.from('billing_history').insert({
                    user_id: user.id,
                    plan_name: plan.name,
                    amount: plan.price,
                    currency: 'INR',
                    status: 'Success',
                });
            }

            setSub(prev => prev ? {
                ...prev,
                store_plan: selectedPlan,
                product_limit: plan.limits.products,
                banner_limit: plan.limits.banners,
                site_limit: plan.limits.sites,
                price_monthly: plan.price,
            } : prev);

            setModalState('success');
            setTimeout(() => {
                setSelectedPlan(null);
                setModalState('idle');
            }, 2000);
        } else {
            setModalState('idle');
        }
    };

    const isUpgrade = selectedPlan === 'pay_eat';

    return (
        <div className="px-4 md:px-8 py-6 md:py-8 max-w-3xl">

            {/* Header */}
            <div className="mb-6">
                <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 30, lineHeight: '36px' }}>
                    Subscription
                </h1>
                <p className="text-[#52525C] mt-1" style={{ fontSize: 16, lineHeight: '24px' }}>
                    Choose a plan that works for your business
                </p>
            </div>

            {/* Current plan badge */}
            {!loading && sub && (
                <div
                    className="inline-flex items-center gap-2 mb-6"
                    style={{
                        background: '#F4F4F5',
                        borderRadius: 20,
                        padding: '6px 14px',
                        border: '1px solid #E4E4E7',
                    }}
                >
                    <div
                        style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: PLANS[currentPlan].color,
                            flexShrink: 0,
                        }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>
                        Current plan: <span style={{ color: PLANS[currentPlan].color }}>{PLANS[currentPlan].name}</span>
                    </span>
                </div>
            )}

            {/* Skeleton */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1].map(i => (
                        <div key={i} className="skeleton" style={{ height: 360, borderRadius: 14 }} />
                    ))}
                </div>
            )}

            {/* Plan cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, plan]) => {
                        const isCurrent = key === currentPlan;
                        const isPaid = plan.price > 0;

                        return (
                            <div
                                key={key}
                                style={{
                                    background: isPaid
                                        ? 'linear-gradient(145deg, #5137EF 0%, #7C3AED 100%)'
                                        : '#FFFFFF',
                                    border: isCurrent
                                        ? `2px solid ${plan.color}`
                                        : isPaid ? 'none' : '1px solid #E4E4E7',
                                    borderRadius: 16,
                                    padding: 24,
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 0,
                                }}
                            >
                                {/* Current badge */}
                                {isCurrent && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: -1,
                                            right: 16,
                                            background: plan.color,
                                            color: '#fff',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: '3px 10px',
                                            borderRadius: '0 0 8px 8px',
                                        }}
                                    >
                                        CURRENT
                                    </div>
                                )}

                                {/* Plan name & tagline */}
                                <div style={{ marginBottom: 16 }}>
                                    <p
                                        style={{
                                            fontSize: 18,
                                            fontWeight: 600,
                                            color: isPaid ? '#FFFFFF' : '#0A0A0A',
                                            lineHeight: '24px',
                                            marginBottom: 4,
                                        }}
                                    >
                                        {plan.name}
                                    </p>
                                    <p style={{ fontSize: 26, fontWeight: 700, color: isPaid ? '#FFFFFF' : plan.color, lineHeight: '32px' }}>
                                        {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                                        {plan.price > 0 && (
                                            <span style={{ fontSize: 14, fontWeight: 400, opacity: 0.8 }}> /month</span>
                                        )}
                                    </p>
                                </div>

                                {/* Features */}
                                <div style={{ flex: 1, marginBottom: 20 }}>
                                    {plan.features.map(f => (
                                        <div key={f} className="flex items-start gap-2" style={{ marginBottom: 10 }}>
                                            <span
                                                className="material-symbols-outlined"
                                                style={{
                                                    fontSize: 16,
                                                    color: isPaid ? 'rgba(255,255,255,0.9)' : plan.color,
                                                    flexShrink: 0,
                                                    marginTop: 1,
                                                    fontVariationSettings: "'FILL' 1",
                                                }}
                                            >
                                                check_circle
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: 13,
                                                    color: isPaid ? 'rgba(255,255,255,0.9)' : '#3F3F46',
                                                    lineHeight: '18px',
                                                }}
                                            >
                                                {f}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Limits row */}
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: 8,
                                        marginBottom: 20,
                                        padding: '10px 12px',
                                        background: isPaid ? 'rgba(255,255,255,0.12)' : '#F4F4F5',
                                        borderRadius: 10,
                                    }}
                                >
                                    {[
                                        { label: 'Products', value: plan.limits.products },
                                        { label: 'Banners', value: plan.limits.banners },
                                        { label: 'Stores', value: plan.limits.sites },
                                    ].map(item => (
                                        <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
                                            <p style={{ fontSize: 16, fontWeight: 700, color: isPaid ? '#fff' : '#0A0A0A', lineHeight: '20px' }}>
                                                {item.value}
                                            </p>
                                            <p style={{ fontSize: 11, color: isPaid ? 'rgba(255,255,255,0.7)' : '#71717A', lineHeight: '14px' }}>
                                                {item.label}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* CTA button */}
                                <button
                                    onClick={() => openModal(key)}
                                    disabled={isCurrent}
                                    style={{
                                        width: '100%',
                                        height: 44,
                                        borderRadius: 10,
                                        fontSize: 14,
                                        fontWeight: 600,
                                        cursor: isCurrent ? 'not-allowed' : 'pointer',
                                        border: isCurrent
                                            ? 'none'
                                            : isPaid ? '2px solid rgba(255,255,255,0.4)' : `2px solid ${plan.color}`,
                                        background: isCurrent
                                            ? 'rgba(255,255,255,0.15)'
                                            : isPaid ? 'rgba(255,255,255,0.2)' : 'transparent',
                                        color: isCurrent
                                            ? (isPaid ? 'rgba(255,255,255,0.5)' : '#99A1AF')
                                            : isPaid ? '#FFFFFF' : plan.color,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {isCurrent
                                        ? 'Current Plan'
                                        : key === 'pay_eat' ? 'Upgrade — ₹499/mo' : 'Switch to Free'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info note */}
            <p className="mt-5 text-center text-[#71717A]" style={{ fontSize: 12 }}>
                Payments are processed securely. Plans renew monthly. Cancel anytime.
            </p>

            {/* ── MODAL ── */}
            {selectedPlan && (
                <div
                    className="fixed inset-0 flex items-end md:items-center justify-center"
                    style={{ zIndex: 80, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
                    onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
                >
                    <div
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '20px 20px 0 0',
                            width: '100%',
                            maxWidth: 440,
                            padding: '28px 24px 36px',
                        }}
                        className="md:rounded-2xl md:mx-4"
                    >
                        {modalState === 'success' ? (
                            /* ── Success state ── */
                            <div className="flex flex-col items-center py-6 gap-4">
                                <div
                                    style={{
                                        width: 64, height: 64, borderRadius: '50%',
                                        background: '#DCFCE7',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}
                                >
                                    <span
                                        className="material-symbols-outlined"
                                        style={{ fontSize: 32, color: '#16A34A', fontVariationSettings: "'FILL' 1" }}
                                    >
                                        check_circle
                                    </span>
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 18, marginBottom: 6 }}>
                                        {isUpgrade ? 'Plan Upgraded!' : 'Plan Changed!'}
                                    </p>
                                    <p className="text-[#52525C]" style={{ fontSize: 14 }}>
                                        You&apos;re now on the <strong>{PLANS[selectedPlan].name}</strong> plan.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            /* ── Payment / Confirm state ── */
                            <>
                                {/* Modal header */}
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 18, lineHeight: '24px' }}>
                                            {isUpgrade ? 'Upgrade Plan' : 'Switch Plan'}
                                        </p>
                                        <p className="text-[#52525C]" style={{ fontSize: 13, marginTop: 2 }}>
                                            {isUpgrade
                                                ? 'You\'re upgrading to Pay-Eat QR Menu'
                                                : 'You\'re switching to the free QR Menu plan'}
                                        </p>
                                    </div>
                                    {modalState !== 'paying' && (
                                        <button
                                            onClick={closeModal}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                                        >
                                            <span className="material-symbols-outlined text-[#71717A]" style={{ fontSize: 20 }}>close</span>
                                        </button>
                                    )}
                                </div>

                                {/* Plan summary card */}
                                <div
                                    style={{
                                        background: '#F8F7FF',
                                        border: '1px solid #E4E4E7',
                                        borderRadius: 12,
                                        padding: '14px 16px',
                                        marginBottom: 20,
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-[#0A0A0A]" style={{ fontSize: 15 }}>
                                                {PLANS[selectedPlan].name}
                                            </p>
                                            <p style={{ fontSize: 12, color: '#71717A', marginTop: 2 }}>
                                                {PLANS[selectedPlan].limits.products} products · {PLANS[selectedPlan].limits.banners} banners · {PLANS[selectedPlan].limits.sites} store(s)
                                            </p>
                                        </div>
                                        <p
                                            className="font-bold"
                                            style={{ fontSize: 18, color: PLANS[selectedPlan].color }}
                                        >
                                            {PLANS[selectedPlan].price === 0 ? 'Free' : `₹${PLANS[selectedPlan].price}`}
                                        </p>
                                    </div>

                                    {isUpgrade && (
                                        <div
                                            style={{
                                                marginTop: 12,
                                                paddingTop: 12,
                                                borderTop: '1px dashed #E4E4E7',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <span style={{ fontSize: 13, color: '#52525C' }}>Due today</span>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A' }}>
                                                ₹{PLANS[selectedPlan].price}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Mock payment fields — only for paid plan */}
                                {isUpgrade && (
                                    <div style={{ marginBottom: 20 }}>
                                        <p style={{ fontSize: 12, fontWeight: 500, color: '#71717A', marginBottom: 10, letterSpacing: '0.05em' }}>
                                            MOCK PAYMENT DETAILS
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            <div
                                                style={{
                                                    border: '1px solid #E4E4E7', borderRadius: 8,
                                                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                                                }}
                                            >
                                                <span className="material-symbols-outlined text-[#99A1AF]" style={{ fontSize: 16 }}>credit_card</span>
                                                <span style={{ fontSize: 14, color: '#71717A', fontFamily: 'monospace' }}>•••• •••• •••• 4242</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <div
                                                    style={{
                                                        flex: 1, border: '1px solid #E4E4E7', borderRadius: 8,
                                                        padding: '10px 14px', fontSize: 14, color: '#71717A',
                                                    }}
                                                >
                                                    12/28
                                                </div>
                                                <div
                                                    style={{
                                                        flex: 1, border: '1px solid #E4E4E7', borderRadius: 8,
                                                        padding: '10px 14px', fontSize: 14, color: '#71717A',
                                                    }}
                                                >
                                                    •••
                                                </div>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: 11, color: '#99A1AF', marginTop: 8 }}>
                                            This is a mock payment — no real charge will occur.
                                        </p>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleConfirm}
                                        disabled={modalState === 'paying'}
                                        style={{
                                            width: '100%',
                                            height: 48,
                                            borderRadius: 10,
                                            fontSize: 15,
                                            fontWeight: 600,
                                            border: 'none',
                                            cursor: modalState === 'paying' ? 'not-allowed' : 'pointer',
                                            background: isUpgrade
                                                ? 'linear-gradient(90deg, #5137EF 0%, #7C3AED 100%)'
                                                : '#0A0A0A',
                                            color: '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 8,
                                            opacity: modalState === 'paying' ? 0.8 : 1,
                                        }}
                                    >
                                        {modalState === 'paying' ? (
                                            <>
                                                <span
                                                    style={{
                                                        width: 18, height: 18, borderRadius: '50%',
                                                        border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTopColor: '#fff',
                                                        animation: 'spin 0.7s linear infinite',
                                                        display: 'inline-block',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                                Processing...
                                            </>
                                        ) : isUpgrade ? (
                                            `Pay ₹${PLANS[selectedPlan].price}`
                                        ) : (
                                            'Confirm Switch'
                                        )}
                                    </button>

                                    {modalState !== 'paying' && (
                                        <button
                                            onClick={closeModal}
                                            style={{
                                                width: '100%', height: 44, borderRadius: 10,
                                                fontSize: 14, fontWeight: 500,
                                                border: '1px solid #E4E4E7',
                                                background: '#FFFFFF', color: '#52525C',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
