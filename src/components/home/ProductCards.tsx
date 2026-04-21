'use client';

import Link from 'next/link';

const qrMenuFeatures = [
    'AI-built digital menu from your uploaded photo',
    'Professional food images selected automatically',
    'AI-written descriptions for every item',
    'Live editing — add, remove, update items any time',
    'Show offers, specials, and sold-out items instantly',
    'NFC table card + QR sticker delivered to you',
    'Works for dine-in and takeaway',
];

const payEatFeatures = [
    'Everything in QR Menu, plus —',
    'Live orders sent directly to your kitchen',
    'Accept UPI, GPay, PhonePe, and cash — all in one place',
    'Automatic digital billing — no manual bill writing',
    'FIFO order queue — handles crowd automatically',
    'Inventory management — mark items as sold out live',
    'All 10 tables can order at the same time with zero chaos',
];

export default function ProductCards() {
    return (
        <section className="py-14 sm:py-24 px-4 bg-white">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Choose What You Need</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Two Ways to Go Digital.<br />
                        <span className="text-slate-500">Start Simple. Grow When You&apos;re Ready.</span>
                    </h2>
                    <p className="mt-5 text-lg text-slate-500 max-w-xl mx-auto">
                        No pressure to do everything at once.
                        Pick the plan that fits where your restaurant is today.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* QR Menu Card */}
                    <div className="rounded-3xl border border-slate-200 bg-background-light p-5 sm:p-8 flex flex-col">
                        <div className="mb-6">
                            <span className="inline-block bg-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                                View-Only Digital Menu
                            </span>
                            <h3 className="text-2xl font-extrabold font-display text-slate-900 mb-3">QR Menu</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Replace your paper menu with a beautiful digital menu your customers can scan or tap to view — instantly.
                            </p>
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">What you get:</p>
                            <ul className="space-y-2.5">
                                {qrMenuFeatures.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">check</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-200">
                            <p className="text-sm text-slate-500 mb-4">
                                <strong>Perfect for:</strong> Restaurants that want to look professional and ditch printing costs — without changing how they currently take orders.
                            </p>
                            <Link
                                href="/signup"
                                className="flex items-center justify-center gap-2 bg-white border-2 border-primary text-primary px-6 py-3.5 rounded-full font-bold hover:bg-primary hover:text-white transition-all"
                            >
                                Get QR Menu Free
                                <span className="material-symbols-outlined text-xl">arrow_forward</span>
                            </Link>
                        </div>
                    </div>

                    {/* Pay & Eat Card */}
                    <div className="rounded-3xl bg-primary p-5 sm:p-8 flex flex-col relative overflow-hidden shadow-2xl shadow-primary/30">
                        {/* Most popular badge */}
                        <div className="absolute top-6 right-6 bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                            Most Popular
                        </div>

                        <div className="mb-6">
                            <span className="inline-block bg-white/20 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4">
                                Full Digital Ordering + Payment
                            </span>
                            <h3 className="text-2xl font-extrabold font-display text-white mb-3">Pay &amp; Eat</h3>
                            <p className="text-white/80 leading-relaxed">
                                Customers scan or tap, order from their phone, pay via UPI or cash, and get a digital bill. Your kitchen gets the order live.
                            </p>
                        </div>

                        <div className="mb-6">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-3">What you get:</p>
                            <ul className="space-y-2.5">
                                {payEatFeatures.map((f, i) => (
                                    <li key={f} className={`flex items-start gap-2.5 text-sm ${i === 0 ? 'text-white font-bold' : 'text-white/85'}`}>
                                        {i === 0
                                            ? <span className="w-4 shrink-0" />
                                            : <span className="material-symbols-outlined text-white/60 text-base mt-0.5 shrink-0">check</span>
                                        }
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="mt-auto pt-4 border-t border-white/20">
                            <p className="text-sm text-white/70 mb-4">
                                <strong className="text-white">Perfect for:</strong> Restaurants that want to handle more customers, reduce staff pressure, and increase revenue per table.
                            </p>
                            <Link
                                href="/signup"
                                className="flex items-center justify-center gap-2 bg-white text-primary px-6 py-3.5 rounded-full font-bold hover:bg-slate-100 transition-all shadow-lg"
                            >
                                Get Pay &amp; Eat Free
                                <span className="material-symbols-outlined text-xl">arrow_forward</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
