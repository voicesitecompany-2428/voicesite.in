'use client';

const categories = [
    'Restaurant',
    'Café',
    'Food Truck',
    'Hotel',
    'Tiffin Centre',
    'Bakery',
    'Bar & Lounge',
    'Cloud Kitchen',
    'Fast Food',
    'Street Food',
];

export default function CategoryStrip() {
    const doubled = [...categories, ...categories];

    return (
        <section className="py-8 sm:py-10 bg-white border-y border-slate-100 overflow-hidden">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
                Built for every kind of F&amp;B business
            </p>
            <div className="relative">
                {/* Fade edges */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 sm:w-24 z-10 bg-gradient-to-r from-white to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 sm:w-24 z-10 bg-gradient-to-l from-white to-transparent" />

                <div className="flex gap-3 sm:gap-4 animate-[marquee_30s_linear_infinite] hover:[animation-play-state:paused] whitespace-nowrap w-max">
                    {doubled.map((label, i) => (
                        <div
                            key={i}
                            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-background-light border border-slate-200 shrink-0"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-700">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <style jsx>{`
                @keyframes marquee {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
        </section>
    );
}
