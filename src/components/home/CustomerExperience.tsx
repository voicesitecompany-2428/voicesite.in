'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

const steps = [
    {
        number: '01',
        title: 'Customers scan your QR',
        desc: 'They scan the QR code on the table using their phone.',
        image: '/step1-HIW.png',
        imageAlt: 'QR code stand on restaurant table',
    },
    {
        number: '02',
        title: 'Menu opens instantly',
        desc: 'Your digital menu opens instantly with photos, prices & descriptions.',
        image: '/step2-HIW.png',
        imageAlt: 'Digital menu on phone screen',
    },
    {
        number: '03',
        title: 'They place the order',
        desc: 'Customers place order and pay securely via UPI, GPay or cash.',
        image: '/step3-HTW.png',
        imageAlt: 'Customer placing order on phone',
    },
    {
        number: '04',
        title: 'You get the order, they enjoy!',
        desc: 'You receive the order instantly & serve happy customers.',
        image: '/step4-HIW.png',
        imageAlt: 'Kitchen display showing new order',
    },
];

const benefits = [
    { icon: 'rocket_launch', title: 'Faster Service', desc: 'Reduce wait time and serve more tables.' },
    { icon: 'bar_chart', title: 'More Orders', desc: 'Upsell easily with photos, combos & recommendations.' },
    { icon: 'savings', title: 'Lower Costs', desc: 'No commission. Keep more of what you earn.' },
    { icon: 'settings', title: 'Easy to Use', desc: 'Setup in minutes. Manage everything from your phone.' },
    { icon: 'verified_user', title: 'Safe & Contactless', desc: 'Perfect for modern customers who prefer contactless ordering.' },
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
        <section className="py-14 sm:py-24 px-4 bg-white relative overflow-hidden">
            <div className="relative z-10 mx-auto max-w-6xl">
                {/* Header */}
                <div className="text-center mb-10 sm:mb-14">
                    <span className="inline-block text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full mb-4">
                        How Customers Use It
                    </span>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        4 Simple Steps.<br />
                        Happy Customers.{' '}
                        <span className="text-primary">More Orders.</span>
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
                        Contactless ordering that increases speed, efficiency and sales — built for Tamil Nadu restaurants.
                    </p>
                </div>

                {/* Step cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm"
                        >
                            {/* Top content */}
                            <div className="p-4 sm:p-5 flex-1">
                                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center mb-4 shadow-md shadow-primary/30">
                                    <span className="text-white font-bold text-xs">{step.number}</span>
                                </div>
                                <h3 className="font-extrabold font-display text-slate-900 text-sm sm:text-base leading-snug mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
                                    {step.desc}
                                </p>
                            </div>

                            {/* Step image */}
                            <div className="relative w-full aspect-[4/3] bg-white/5">
                                <Image
                                    src={step.image}
                                    alt={step.imageAlt}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Why Restaurants Love It */}
                <div className="rounded-2xl bg-primary/8 border border-primary/15 px-6 sm:px-10 py-8 mb-10">
                    <h3 className="text-center font-extrabold font-display text-primary text-lg sm:text-xl mb-7">
                        Why Restaurants Love It
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 sm:gap-6">
                        {benefits.map((b) => (
                            <div key={b.title} className="flex flex-col items-center text-center gap-2">
                                <div className="w-11 h-11 rounded-full bg-white border border-primary/20 flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined text-primary text-xl">{b.icon}</span>
                                </div>
                                <div className="font-bold text-slate-900 text-sm">{b.title}</div>
                                <p className="text-slate-500 text-xs leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Video */}
                <div className="rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden bg-black">
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
