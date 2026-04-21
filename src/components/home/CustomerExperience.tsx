'use client';

import { useEffect, useRef } from 'react';

const steps = [
    {
        step: '01',
        icon: 'nfc',
        title: 'Customer taps or scans',
        desc: 'They tap the NFC card or scan the QR sticker. No app. No sign-up.',
    },
    {
        step: '02',
        icon: 'menu_book',
        title: 'Menu opens instantly',
        desc: 'Full digital menu on their phone in under a second — photos, prices, descriptions.',
    },
    {
        step: '03',
        icon: 'add_shopping_cart',
        title: 'They pick and order',
        desc: 'Customer selects items and places the order directly from their phone.',
        payEat: true,
    },
    {
        step: '04',
        icon: 'payments',
        title: 'They pay via UPI or cash',
        desc: 'GPay, PhonePe, UPI, or cash — all accepted. Digital bill sent instantly.',
        payEat: true,
    },
];

export default function CustomerExperience() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    video.currentTime = 0;
                    video.play().catch(() => {});
                } else {
                    video.pause();
                }
            },
            { threshold: 0.3 }
        );

        observer.observe(video);
        return () => observer.disconnect();
    }, []);

    return (
        <section className="py-14 sm:py-24 px-4 bg-[#0e0e2c] relative overflow-hidden">
            {/* Background orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-72 h-72 bg-primary/15 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-700/10 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-5xl">
                {/* Header */}
                <div className="text-center mb-10 sm:mb-16">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">How Customers Use It</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-white leading-tight">
                        4 Steps. Zero Confusion.
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-white/60 max-w-xl mx-auto">
                        Your customers already do this on Zomato every day.
                        The only difference — every rupee stays with you.
                    </p>
                </div>

                {/* Steps grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-14">
                    {steps.map((s) => (
                        <div
                            key={s.step}
                            className={`rounded-2xl p-4 sm:p-5 border ${
                                s.payEat
                                    ? 'bg-primary/10 border-primary/30'
                                    : 'bg-white/5 border-white/10'
                            }`}
                        >
                            {/* Step number */}
                            <div className="text-4xl sm:text-5xl font-extrabold font-display text-white/8 leading-none mb-3 select-none">
                                {s.step}
                            </div>
                            {/* Icon */}
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 ${s.payEat ? 'bg-primary/30 border border-primary/40' : 'bg-white/10 border border-white/15'}`}>
                                <span className={`material-symbols-outlined text-xl sm:text-2xl ${s.payEat ? 'text-primary' : 'text-white/70'}`}>{s.icon}</span>
                            </div>
                            {/* Badge */}
                            {s.payEat && (
                                <span className="inline-block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-2 py-0.5 rounded-full mb-2">
                                    Pay &amp; Eat
                                </span>
                            )}
                            <h3 className="font-bold text-white text-sm sm:text-base font-display mb-1.5">{s.title}</h3>
                            <p className="text-white/55 text-xs sm:text-sm leading-relaxed">{s.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Video — plays from start when scrolled into view, pauses when scrolled away */}
                <div className="rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden bg-black">
                    <video
                        ref={videoRef}
                        src="/customer-flow.mp4"
                        muted
                        loop
                        playsInline
                        preload="metadata"
                        className="w-full h-auto block"
                    />
                </div>
            </div>
        </section>
    );
}
