'use client';

import Link from 'next/link';

const stats = [
    {
        value: '₹3,500',
        label: 'Average cost of reprinting menus when prices change',
        vsiteNote: 'vsite: ₹0. Update in 10 seconds.',
    },
    {
        value: '₹2,400/day',
        label: 'Missed upsell revenue when there are no food photos',
        sub: '(20 tables × ₹120 average uplift per table with photo menus)',
        vsiteNote: 'vsite: Professional photos on every item, from day one.',
    },
    {
        value: '4 minutes',
        label: 'Average time a waiter spends per table explaining the menu',
        sub: "At 30 tables a day, that's 2 full hours of waiter time — wasted.",
        vsiteNote: 'vsite: Menu answers everything. Waiter just serves.',
    },
    {
        value: '2–3 tables lost',
        label: 'Per peak hour due to queue chaos and slow ordering',
        vsiteNote: 'vsite Pay & Eat: All tables order simultaneously. No queue.',
    },
];

export default function LossAversion() {
    return (
        <section className="py-14 sm:py-24 px-4 bg-white">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-red-500">The Real Cost of a Paper Menu</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Every Day You Wait Is Money<br />
                        <span className="text-slate-500">You&apos;re Leaving on the Table.</span>
                    </h2>
                    <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
                        This isn&apos;t a sales pitch. It&apos;s simple maths.
                        Here&apos;s what a paper menu is actually costing a typical 15-table restaurant in Tamil Nadu every month.
                    </p>
                </div>

                {/* Stat Blocks */}
                <div className="grid sm:grid-cols-2 gap-6 mb-10">
                    {stats.map((s) => (
                        <div key={s.value} className="rounded-2xl border border-slate-200 bg-background-light p-5 sm:p-7">
                            <div className="text-4xl font-extrabold font-display text-slate-900 mb-2">{s.value}</div>
                            <p className="text-slate-700 font-medium text-sm mb-1">{s.label}</p>
                            {s.sub && <p className="text-slate-400 text-xs mb-3 italic">{s.sub}</p>}
                            <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-500 text-base shrink-0">check_circle</span>
                                <span className="text-sm text-green-700 font-medium">{s.vsiteNote}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Callout Card */}
                <div className="rounded-3xl bg-[#0e0e2c] text-white p-6 sm:p-10 text-center relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute -top-10 -left-10 w-60 h-60 bg-primary/20 rounded-full blur-3xl" />
                        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-purple-700/15 rounded-full blur-3xl" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-white/70 text-lg mb-2">A 15-table restaurant loses an estimated</p>
                        <p className="text-4xl sm:text-5xl font-extrabold font-display text-white mb-2">₹18,000 – ₹32,000</p>
                        <p className="text-white/70 text-lg mb-6">per month in printing costs, missed upsells, and slow table turnover.</p>
                        <p className="text-white/60 mb-8">vsite costs a fraction of that — and the first 14 days are completely free.</p>
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-all shadow-xl"
                        >
                            Start My Free Trial
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
