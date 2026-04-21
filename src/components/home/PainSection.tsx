'use client';

import Link from 'next/link';

const rows = [
    {
        before: 'Reprinting costs ₹2,000–5,000 every time a price changes',
        after: 'Update any item in 10 seconds. Zero printing cost. Ever.',
    },
    {
        before: "Customers can't see what the dish looks like — they order less",
        after: 'Every item has a professional photo. Customers order more.',
    },
    {
        before: 'Rush hour: waiter runs between tables explaining the menu',
        after: 'Customers read everything on their own phone. Waiter focuses on serving.',
    },
    {
        before: "Want to add today's special? You can't, without printing",
        after: 'Add a live offer or special in 30 seconds. It shows instantly.',
    },
    {
        before: 'Monsoon, oil stains, torn pages — menus look unprofessional',
        after: 'A clean, beautiful digital menu every single time.',
    },
    {
        before: 'No idea which dish is popular, which one nobody orders',
        after: 'See exactly what customers are viewing and ordering. Real data.',
    },
    {
        before: '10 customers arrive together — queue, confusion, someone leaves',
        after: 'With Pay & Eat — all 10 can order simultaneously from their phone.',
    },
];

export default function PainSection() {
    return (
        <section className="py-14 sm:py-24 px-4 bg-background-light">
            <div className="mx-auto max-w-5xl">
                <div className="text-center mb-10 sm:mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">The Problem</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Paper Menus Are Silently<br />Costing You Money.<br />
                        <span className="text-slate-500">Every Single Day.</span>
                    </h2>
                    <p className="mt-5 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Most restaurant owners in Tamil Nadu don&apos;t realise how much a paper menu
                        is actually holding their business back.
                    </p>
                </div>

                {/* Desktop: side-by-side table */}
                <div className="hidden sm:block rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-2">
                        <div className="bg-red-50 px-6 py-4 border-b border-slate-200 border-r flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-400 text-lg">close</span>
                            <span className="font-bold text-red-700 text-sm uppercase tracking-wide">Paper Menu — Right Now</span>
                        </div>
                        <div className="bg-green-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600 text-lg">check_circle</span>
                            <span className="font-bold text-green-700 text-sm uppercase tracking-wide">With vsite</span>
                        </div>
                    </div>
                    {rows.map((row, i) => (
                        <div key={i} className={`grid grid-cols-2 ${i < rows.length - 1 ? 'border-b border-slate-200' : ''}`}>
                            <div className="px-6 py-5 border-r border-slate-200 bg-white flex items-start gap-3">
                                <span className="material-symbols-outlined text-red-300 text-base mt-0.5 shrink-0">remove_circle</span>
                                <p className="text-sm text-slate-600 leading-relaxed">{row.before}</p>
                            </div>
                            <div className="px-6 py-5 bg-white flex items-start gap-3">
                                <span className="material-symbols-outlined text-green-500 text-base mt-0.5 shrink-0">check_circle</span>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">{row.after}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mobile: stacked cards */}
                <div className="sm:hidden space-y-3">
                    {rows.map((row, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                            <div className="flex items-start gap-3 px-4 py-4 border-b border-slate-100 bg-red-50">
                                <span className="material-symbols-outlined text-red-400 text-base mt-0.5 shrink-0">remove_circle</span>
                                <p className="text-sm text-slate-600 leading-relaxed">{row.before}</p>
                            </div>
                            <div className="flex items-start gap-3 px-4 py-4">
                                <span className="material-symbols-outlined text-green-500 text-base mt-0.5 shrink-0">check_circle</span>
                                <p className="text-sm text-slate-700 font-medium leading-relaxed">{row.after}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 text-center">
                    <Link
                        href="/signup"
                        className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-bold text-base sm:text-lg shadow-lg shadow-primary/25 hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                        Fix This For Free — Start Your 14-Day Trial
                        <span className="material-symbols-outlined text-xl">arrow_forward</span>
                    </Link>
                </div>
            </div>
        </section>
    );
}
