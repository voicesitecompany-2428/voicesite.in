'use client';

import Link from 'next/link';

const qrFeatures = [
    'Clean digital menu (no printing needed)',
    'Auto-generated food images & descriptions',
    'Edit menu anytime (add/remove/update)',
    'Highlight offers & sold-out items live',
    'Works for dine-in & takeaway',
    'NFC card + QR stickers included',
];

const payEatFeatures = [
    'Everything in Smart QR Menu, plus —',
    'Customers place orders directly from phone',
    'Accept UPI, GPay, PhonePe & cash',
    'Instant order to kitchen (live)',
    'Automatic billing (no manual work)',
    'Smart queue (handles rush smoothly)',
    'Sell more with faster table turnover',
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-14 sm:py-24 px-4 bg-background-light">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div className="text-center mb-10 sm:mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Simple, Honest Pricing</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Less Than What You Spend on Printing.<br />
                        <span className="text-slate-500">Every Month.</span>
                    </h2>
                    <p className="mt-5 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">
                        One-time setup. One small monthly fee.
                        No hidden charges. No per-order commission. Your revenue stays 100% yours.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">

                    {/* Smart QR Menu */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 flex flex-col shadow-sm">
                        {/* Plan name */}
                        <div className="mb-6">
                            <span className="inline-block border border-green-500 text-green-600 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                                Smart QR Menu
                            </span>
                            <p className="text-slate-500 text-sm mb-5">View-only digital menu for your tables</p>

                            {/* Pricing */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold font-display text-slate-900">₹399</span>
                                    <span className="text-slate-400 text-sm">/ month</span>
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600">
                                <span className="material-symbols-outlined text-slate-400 text-base">info</span>
                                One-time setup fee: <span className="font-bold text-slate-800 ml-1">₹1,999</span>
                            </div>
                        </div>

                        {/* Features */}
                        <ul className="space-y-3 flex-1 mb-8">
                            {qrFeatures.map((f) => (
                                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                                    <span className="material-symbols-outlined text-green-500 text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Link
                            href="/signup"
                            className="flex items-center justify-center gap-2 border-2 border-green-500 text-green-600 px-6 py-3.5 rounded-full font-bold hover:bg-green-500 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        >
                            Start Free — 14 Days
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                        <p className="text-center text-xs text-slate-400 mt-2">No credit card. No commitment.</p>
                    </div>

                    {/* QR Ordering + Payment */}
                    <div className="bg-white rounded-3xl border-2 border-primary p-5 sm:p-8 flex flex-col shadow-xl shadow-primary/10">

                        {/* Plan name + Most Popular badge row */}
                        <div className="mb-6">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <span className="inline-block border border-primary text-primary text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                    QR Ordering + Payment
                                </span>
                                <span className="inline-flex items-center gap-1 bg-primary text-white text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full">
                                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                    Most Popular
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm mb-5">Full digital ordering + payment</p>

                            {/* Pricing */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-extrabold font-display text-slate-900">₹799</span>
                                    <span className="text-slate-400 text-sm">/ month</span>
                                </div>
                            </div>
                            <div className="inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-sm text-slate-600">
                                <span className="material-symbols-outlined text-primary text-base">info</span>
                                One-time setup fee: <span className="font-bold text-slate-800 ml-1">₹1,999</span>
                            </div>
                        </div>

                        {/* Features */}
                        <ul className="space-y-3 flex-1 mb-8">
                            {payEatFeatures.map((f, i) => (
                                <li key={f} className={`flex items-start gap-2.5 text-sm ${i === 0 ? 'text-primary font-bold' : 'text-slate-700'}`}>
                                    {i === 0
                                        ? <span className="w-4 shrink-0" />
                                        : <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                    }
                                    {f}
                                </li>
                            ))}
                        </ul>

                        {/* CTA */}
                        <Link
                            href="/signup"
                            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-full font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            Start Free — 14 Days
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                        <p className="text-center text-xs text-slate-400 mt-2">No credit card. No commitment.</p>
                    </div>
                </div>

                {/* 14-day free trial banner */}
                <div className="bg-white rounded-2xl border border-primary/20 px-6 sm:px-8 py-5 flex items-start sm:items-center gap-4 shadow-sm">
                    <span className="material-symbols-outlined text-primary text-3xl shrink-0">redeem</span>
                    <div>
                        <p className="font-bold text-slate-900">Both plans include a 14-day completely free trial.</p>
                        <p className="text-slate-500 text-sm mt-0.5">No credit card. No payment details. No commitment. Use the full product free for 14 days — then decide.</p>
                    </div>
                </div>

            </div>
        </section>
    );
}
