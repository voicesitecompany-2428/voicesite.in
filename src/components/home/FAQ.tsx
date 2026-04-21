'use client';

import { useState } from 'react';

const faqs = [
    {
        q: 'Do my customers need to download an app to use the digital menu?',
        a: 'No. Customers simply tap the NFC card or scan the QR sticker with their phone camera. The menu opens instantly in their browser — no app download, no sign-up, no friction.',
    },
    {
        q: 'How long does it take to set up my digital menu?',
        a: 'About 3 minutes. Take a photo of your existing paper menu, upload it, and our AI reads it, matches professional food photos, writes item descriptions, and builds your full digital menu automatically.',
    },
    {
        q: 'What if I want to update my menu prices or add new items?',
        a: 'You can edit your menu anytime from your dashboard — change prices, add or remove dishes, mark items as sold out, or post a daily special. Changes go live instantly for all customers.',
    },
    {
        q: 'Is vsite available only in Tamil Nadu?',
        a: 'vsite is built for restaurants across South India, starting with Tamil Nadu. The platform supports English and Tamil and is designed for the local F&B context — tiffin centres, cafés, hotels, food trucks, and more.',
    },
    {
        q: 'What happens after the 14-day free trial?',
        a: 'After your trial ends, you choose a plan to continue. No credit card is needed to start, and there is no automatic charge. Your menu stays safe — we will remind you before anything changes.',
    },
];

export default function FAQ() {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <section className="py-14 sm:py-24 px-4 bg-background-light">
            <div className="mx-auto max-w-3xl">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">FAQ</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Questions You Might Have
                    </h2>
                    <p className="mt-5 text-lg text-slate-500">
                        Everything you need to know before getting started.
                    </p>
                </div>

                {/* Accordion */}
                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                        >
                            <button
                                onClick={() => setOpen(open === i ? null : i)}
                                className="w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-4 sm:py-5 text-left"
                            >
                                <span className="font-bold text-slate-900 text-base leading-snug">{faq.q}</span>
                                <span className="material-symbols-outlined text-primary text-xl shrink-0 transition-transform duration-200"
                                    style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    expand_more
                                </span>
                            </button>
                            {open === i && (
                                <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-slate-600 text-sm leading-relaxed border-t border-slate-100 pt-4">
                                    {faq.a}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
