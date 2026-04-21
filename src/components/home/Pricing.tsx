'use client';

import Link from 'next/link';

const qrFeatures = [
    'AI-built digital menu',
    'Professional food photos (auto-matched)',
    'AI-written item descriptions',
    'Live menu editing — anytime',
    'Show offers, specials, sold-out items',
    'NFC table card + QR sticker delivered',
    'Unlimited menu updates',
];

const payEatFeatures = [
    'Everything in QR Menu, plus —',
    'Live ordering to kitchen',
    'UPI, GPay, PhonePe + cash payments',
    'Automatic digital billing',
    'FIFO order queue management',
    'Live inventory — mark sold-out items instantly',
    'Handle unlimited simultaneous table orders',
];

export default function Pricing() {
    return (
        <section id="pricing" className="py-14 sm:py-24 px-4 bg-background-light">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Simple, Honest Pricing</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Less Than What You Spend on Printing.<br />
                        <span className="text-slate-500">Every Month.</span>
                    </h2>
                    <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
                        One-time setup fee. One small monthly subscription.
                        No hidden charges. No per-order commission. No surprise bills.
                        Your revenue stays 100% yours.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 gap-8 mb-10">
                    {/* QR Menu */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 flex flex-col shadow-sm">
                        <div className="mb-6">
                            <h3 className="text-2xl font-extrabold font-display text-slate-900 mb-1">QR Menu</h3>
                            <p className="text-sm text-slate-500 mb-6">View-only digital menu for your tables</p>
                            <div className="text-slate-400 text-sm mb-1">One-time setup fee: <span className="text-slate-700 font-semibold">₹[X]</span></div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold font-display text-slate-900">₹[X]</span>
                                <span className="text-slate-400">/ month</span>
                            </div>
                        </div>

                        <ul className="space-y-3 flex-1 mb-8">
                            {qrFeatures.map((f, i) => (
                                <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                                    <span className="material-symbols-outlined text-primary text-base shrink-0">check</span>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/signup"
                            className="flex items-center justify-center gap-2 border-2 border-primary text-primary px-6 py-3.5 rounded-full font-bold hover:bg-primary hover:text-white transition-all"
                        >
                            Start Free — 14 Days
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                    </div>

                    {/* Pay & Eat */}
                    <div className="bg-primary rounded-3xl p-5 sm:p-8 flex flex-col shadow-2xl shadow-primary/30 relative overflow-hidden">
                        <div className="absolute top-5 right-5 bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                            Most Popular
                        </div>

                        <div className="mb-6">
                            <h3 className="text-2xl font-extrabold font-display text-white mb-1">Pay &amp; Eat</h3>
                            <p className="text-sm text-white/70 mb-6">Full digital ordering + payment</p>
                            <div className="text-white/50 text-sm mb-1">One-time setup fee: <span className="text-white font-semibold">₹[X]</span></div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-extrabold font-display text-white">₹[X]</span>
                                <span className="text-white/60">/ month</span>
                            </div>
                        </div>

                        <ul className="space-y-3 flex-1 mb-8">
                            {payEatFeatures.map((f, i) => (
                                <li key={f} className={`flex items-center gap-2.5 text-sm ${i === 0 ? 'text-white font-bold' : 'text-white/85'}`}>
                                    {i === 0
                                        ? <span className="w-4 shrink-0" />
                                        : <span className="material-symbols-outlined text-white/60 text-base shrink-0">check</span>
                                    }
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <Link
                            href="/signup"
                            className="flex items-center justify-center gap-2 bg-white text-primary px-6 py-3.5 rounded-full font-bold hover:bg-slate-100 transition-all shadow-lg"
                        >
                            Start Free — 14 Days
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                    </div>
                </div>

                {/* Banner */}
                <div className="bg-white rounded-2xl border border-primary/20 px-8 py-6 flex items-center gap-4 shadow-sm">
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
