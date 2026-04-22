'use client';

import Image from 'next/image';

const steps = [
    {
        materialIcon: 'storefront',
        number: '01',
        title: 'Enter Your Business Details',
        description:
            'Type in your restaurant name and pick your business type — restaurant, café, food truck, hotel, tiffin centre, bakery, or anything else. This takes 30 seconds and helps our AI understand how to structure your menu.',
    },
    {
        materialIcon: 'photo_camera',
        number: '02',
        title: 'Upload a Photo of Your Menu',
        description:
            'Take a photo of your existing menu — printed, laminated, or even handwritten on a piece of paper. Our AI reads every item, writes professional descriptions, picks the right food photo from our library for each dish, and arranges your menu in a layout designed to increase what customers order. No photoshoot. No writing. No design work.',
        callout: 'Even a handwritten menu works. Really.',
        image: '/how-it-works-step2.jpg',
        imageAlt: 'Paper menu photo transformed into a professional digital menu',
    },
    {
        materialIcon: 'nfc',
        number: '03',
        title: 'Put Your Card on the Table. Go Live.',
        description:
            'We send you a professional NFC-enabled table card and a QR code sticker. Place it on your tables. Customers can either scan the QR code with their phone camera or simply tap their phone on the card — and your menu opens instantly. No app to download. No account to create. Just their phone.',
        badge: 'Average time from signup to live menu: 2 minutes 47 seconds',
        image: '/nfc-on-table.jpg',
        imageAlt: 'vsite NFC card placed on a restaurant table',
    },
];

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="py-14 sm:py-24 px-4 bg-background-light relative">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="text-center mb-16">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Setup in 3 Minutes</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        No Tech Skills. No Developer.<br />
                        <span className="text-slate-500">No Days of Waiting.</span>
                    </h2>
                    <p className="mt-5 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        We built vsite so that anyone — regardless of age or tech experience —
                        can go from paper menu to digital menu in under 3 minutes.
                    </p>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Vertical connector line */}
                    <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-gradient-to-b from-primary/20 via-primary/50 to-primary/20 hidden md:block" />

                    <div className="space-y-10">
                        {steps.map((step, i) => (
                            <div key={step.number} className="relative flex gap-6 md:gap-10 items-start">
                                {/* Step circle */}
                                <div className="shrink-0 w-16 h-16 rounded-full bg-primary text-white flex flex-col items-center justify-center relative z-10 shadow-xl shadow-primary/30 gap-0.5">
                                    <span className="text-[10px] font-bold text-white/60 leading-none">{step.number}</span>
                                    <span className="material-symbols-outlined text-xl leading-none">{step.materialIcon}</span>
                                </div>

                                {/* Content card */}
                                <div className="flex-1 rounded-2xl p-4 sm:p-8 bg-white border border-slate-200 shadow-sm">
                                    <h3 className="text-xl font-bold font-display text-slate-900 mb-3">{step.title}</h3>
                                    <p className="text-slate-600 leading-relaxed">{step.description}</p>
                                    {step.callout && (
                                        <p className="mt-4 text-sm font-medium text-primary italic">
                                            * {step.callout}
                                        </p>
                                    )}
                                    {step.image && (
                                        <div className="mt-5 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                                            <Image
                                                src={step.image}
                                                alt={step.imageAlt ?? ''}
                                                width={800}
                                                height={450}
                                                className="w-full h-auto object-cover"
                                            />
                                        </div>
                                    )}
                                    {step.badge && (
                                        <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                                            <span className="material-symbols-outlined text-base">timer</span>
                                            {step.badge}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
