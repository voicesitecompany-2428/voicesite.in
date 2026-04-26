'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
    return (
        <section className="relative pt-24 pb-20 px-4 overflow-hidden bg-[#0e0e2c] sm:pt-32 lg:pt-40">
            {/* Animated Background Orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/25 rounded-full blur-[120px]" />
                <div className="absolute top-1/2 -right-24 w-80 h-80 bg-purple-700/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-[80px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">
                <div className="flex flex-col items-center gap-14 lg:flex-row lg:items-center lg:gap-16">

                    {/* Text Content */}
                    <div className="flex-1 text-center lg:text-left space-y-7 max-w-2xl mx-auto lg:mx-0">
                        {/* Badge Pill */}
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/8 border border-white/15 text-white/85 text-sm">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                            </span>
                            14-Day Free Trial — Zero Risk. No Credit Card. No Hidden Charges.
                        </div>

                        {/* H1 */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold font-display text-white leading-[1.1] tracking-tight">
                            Your Restaurant&apos;s<br />
                            Digital Menu.<br />
                            <span className="text-[#c3c0ff]">Live in 3 Minutes.</span>
                        </h1>

                        {/* Sub-headline */}
                        <p className="text-lg text-white/70 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            Take a photo of your existing menu — paper, printed, or even handwritten.
                            Our AI reads it, picks professional food photos, writes the descriptions,
                            and builds your complete digital menu automatically.
                            Put the card on your table. Customers tap or scan. Done.
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Link
                                href="/signup"
                                className="inline-flex items-center justify-center gap-2 bg-white text-primary px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-all shadow-xl shadow-black/20 active:scale-95"
                            >
                                Get My Free Digital Menu
                                <span className="material-symbols-outlined text-xl">arrow_forward</span>
                            </Link>
                            <Link
                                href="#how-it-works"
                                className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition-all"
                            >
                                <span className="material-symbols-outlined text-xl">play_circle</span>
                                See How It Works
                            </Link>
                        </div>

                        {/* Trust Strip */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm text-white/70 pt-2 max-w-md mx-auto lg:mx-0">
                            {[
                                'No app download for customers',
                                'Works on any Android or iPhone',
                                'Update your menu live, any time',
                                'NFC card + QR sticker included',
                            ].map((item) => (
                                <div key={item} className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-400 text-base shrink-0">check_circle</span>
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Phone Mockup */}
                    <div className="relative flex-1 w-full max-w-[240px] sm:max-w-xs md:max-w-sm mx-auto lg:mx-0 lg:max-w-[340px] py-5 px-5 sm:py-4 sm:px-4 lg:p-0">
                        <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl" />
                        <div className="relative bg-[#1a1a3a] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl">
                            <div className="rounded-[2rem] overflow-hidden aspect-[9/16] relative">
                                <Image
                                    src="/mockup home page.jpeg"
                                    alt="vsite digital menu mockup"
                                    fill
                                    sizes="(max-width: 640px) 240px, (max-width: 768px) 288px, (max-width: 1024px) 320px, 340px"
                                    className="object-cover object-top"
                                    priority
                                />
                            </div>

                            {/* Floating card 1: Menu is Live */}
                            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                                </span>
                                <span className="text-xs font-bold text-slate-800">Menu is Live</span>
                            </div>

                            {/* Floating card 2: Tap or Scan */}
                            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl px-3 py-2 flex items-center gap-2 border border-slate-100">
                                <span className="material-symbols-outlined text-primary text-base">nfc</span>
                                <span className="text-xs font-bold text-slate-800">Tap or Scan</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
