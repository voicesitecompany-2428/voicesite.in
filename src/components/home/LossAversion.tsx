'use client';

import Link from 'next/link';
import Image from 'next/image';

const stats = [
    {
        number: '1',
        icon: 'trending_up',
        iconBg: 'bg-red-100',
        iconColor: 'text-red-500',
        numberBg: 'bg-red-500',
        value: '₹2,400+',
        valueColor: 'text-red-600',
        label: 'LOST EVERY DAY',
        lines: [
            "Customers order less when they don't see what they're craving.",
            'No photos. No upsell. No impulse decisions.',
        ],
        noteIcon: 'calculate',
        noteIconColor: 'text-red-400',
        noteBg: 'bg-red-50',
        note: 'That\'s ~₹120 extra per table × 20 tables/day = ₹2,400 gone.',
        noteColor: 'text-red-700',
    },
    {
        number: '2',
        icon: 'print',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        numberBg: 'bg-primary',
        value: '₹3,500+',
        valueColor: 'text-primary',
        label: '/ MONTH',
        lines: [
            'Every time prices change, menus get reprinted.',
            'Design → Print → Distribute → Repeat.',
        ],
        noteIcon: 'timer',
        noteIconColor: 'text-primary',
        noteBg: 'bg-primary/8',
        note: 'Digital menu: update in 10 seconds. Cost: ₹0',
        noteColor: 'text-primary',
    },
    {
        number: '3',
        icon: 'support_agent',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        numberBg: 'bg-green-500',
        value: '2+ HOURS',
        valueColor: 'text-green-600',
        label: 'WASTED DAILY',
        lines: [
            'Waiters explain the same menu again and again.',
        ],
        noteIcon: 'schedule',
        noteIconColor: 'text-green-600',
        noteBg: 'bg-green-50',
        note: "That's time they could use to serve more tables faster.",
        noteColor: 'text-green-800',
    },
    {
        number: '4',
        icon: 'table_restaurant',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
        numberBg: 'bg-amber-500',
        value: '2–3 TABLES',
        valueColor: 'text-amber-600',
        label: 'LOST EVERY PEAK HOUR',
        lines: [
            'Slow ordering = longer wait = customers walk away.',
        ],
        noteIcon: 'speed',
        noteIconColor: 'text-amber-600',
        noteBg: 'bg-amber-50',
        note: 'Faster ordering = more table turnover = more revenue',
        noteColor: 'text-amber-800',
    },
];

export default function LossAversion() {
    return (
        <section className="py-14 sm:py-24 px-4 bg-white">
            <div className="mx-auto max-w-5xl">

                {/* Header — headline left, visual comparison right */}
                <div className="flex flex-col lg:flex-row items-center gap-10 mb-14">
                    {/* Left: text */}
                    <div className="flex-1">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight mb-5">
                            Paper Menus Are{' '}
                            <span className="text-red-600">Quietly Killing</span>{' '}
                            Your Daily Revenue
                        </h2>
                        <div className="w-12 h-1 bg-red-500 rounded-full mb-5" />
                        <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
                            This isn&apos;t about printing costs. This is about how much money
                            your restaurant is{' '}
                            <span className="text-red-600 font-semibold">losing every single day</span>{' '}
                            without you realising it.
                        </p>
                    </div>

                    {/* Right: comparison image */}
                    <div className="shrink-0 w-full max-w-sm lg:max-w-xs xl:max-w-sm mx-auto lg:mx-0">
                        <Image
                            src="/losscomparestock.jpg"
                            alt="Digital menu vs paper menu comparison"
                            width={600}
                            height={500}
                            className="w-full h-auto object-contain drop-shadow-xl"
                            priority
                        />
                    </div>
                </div>

                {/* 2×2 Stat Cards */}
                <div className="grid sm:grid-cols-2 gap-5 mb-8">
                    {stats.map((s) => (
                        <div key={s.number} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="p-5 sm:p-6">
                                {/* Top row: number badge + icon */}
                                <div className="flex items-start gap-3 mb-4">
                                    <div className={`w-7 h-7 rounded-full ${s.numberBg} flex items-center justify-center shrink-0`}>
                                        <span className="text-white text-xs font-bold">{s.number}</span>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl ${s.iconBg} flex items-center justify-center`}>
                                        <span className={`material-symbols-outlined text-2xl ${s.iconColor}`}>{s.icon}</span>
                                    </div>
                                </div>

                                {/* Value + label */}
                                <div className={`text-3xl sm:text-4xl font-extrabold font-display ${s.valueColor} leading-none mb-1`}>
                                    {s.value}
                                </div>
                                <div className="text-slate-900 font-extrabold text-sm sm:text-base uppercase tracking-wide mb-3">
                                    {s.label}
                                </div>

                                {/* Description lines */}
                                <div className="space-y-1 mb-4">
                                    {s.lines.map((line, i) => (
                                        <p key={i} className="text-slate-500 text-sm leading-relaxed">{line}</p>
                                    ))}
                                </div>
                            </div>

                            {/* Footer note */}
                            <div className={`${s.noteBg} px-5 sm:px-6 py-3 flex items-start gap-2 border-t border-slate-100`}>
                                <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${s.noteIconColor}`}>{s.noteIcon}</span>
                                <p className={`text-xs sm:text-sm font-medium ${s.noteColor}`}>{s.note}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom callout — total loss */}
                <div className="rounded-2xl bg-red-50 border border-red-100 p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        {/* Icon */}
                        <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shrink-0 shadow-lg">
                            <span className="material-symbols-outlined text-white text-3xl">trending_down</span>
                        </div>

                        {/* Text */}
                        <div className="flex-1">
                            <p className="text-slate-700 font-semibold text-base mb-1">Your Real Loss Isn&apos;t ₹3,500…</p>
                            <p className="text-3xl sm:text-4xl font-extrabold font-display text-red-600 leading-tight mb-2">
                                It&apos;s ₹18,000 – ₹32,000<br className="sm:hidden" />
                                <span className="text-slate-900"> Every Month</span>
                            </p>
                            <p className="text-slate-500 text-sm mb-4">And that&apos;s just from:</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { icon: 'shopping_cart', label: 'Missed upsells' },
                                    { icon: 'hourglass_empty', label: 'Slow service' },
                                    { icon: 'person_off', label: 'Lost customers' },
                                ].map((pill) => (
                                    <div key={pill.label} className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                                        <span className="material-symbols-outlined text-red-500 text-sm">{pill.icon}</span>
                                        {pill.label}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-red-100 text-center">
                        <p className="text-slate-500 text-sm mb-4">vsite costs a fraction of that — and the first 14 days are completely free.</p>
                        <Link
                            href="/signup"
                            className="inline-flex items-center gap-2 bg-primary text-white px-8 py-3.5 rounded-full font-bold text-base hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            Start Your Free Trial
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                    </div>
                </div>

            </div>
        </section>
    );
}
