'use client';

import Image from 'next/image';

const features = [
    {
        title: 'Real Food Photos — Instantly',
        description:
            'No photoshoot. No effort. Upload your menu and our AI automatically matches each dish with high-quality professional food images. Your menu looks premium from day one — without spending anything.',
        impact: 'Menus with food photos get up to 30% higher order value.',
        span: 'md:col-span-2',
        accent: 'bg-primary/5 border-primary/15',
    },
    {
        title: 'AI Menu Engineering That Sells More — Automatically',
        description:
            'We place your high-profit dishes where customers look first. Add smart upsells, highlight best items, and guide customers to spend more — without changing prices. Update items, prices, or availability instantly.',
        impact: 'Earn 10–15% more per customer — without increasing prices.',
        span: 'md:col-span-1',
        accent: 'bg-white border-slate-200',
        image: '/AIMenu.png',
        imageAlt: 'AI-powered digital menu that increases restaurant revenue automatically',
    },
    {
        title: 'Menus Designed for Your Business Type — Not One Template for All',
        description:
            'Cafe, restaurant, bakery, or cloud kitchen — each gets a tailored layout. No generic designs. Just clean, fast menus that customers understand instantly and order with confidence.',
        impact: 'Faster decisions → more orders, less confusion.',
        span: 'md:col-span-1',
        accent: 'bg-white border-slate-200',
        image: '/diff menu stock.png',
        imageAlt: 'Different digital menu templates for restaurants, cafés, bakeries and cloud kitchens',
    },
    {
        title: 'Handle Full-House Crowds Without Extra Staff',
        description:
            'When your restaurant is packed, your staff shouldn\'t be running around handing out paper menus or explaining what\'s sold out. Customers scan the QR code and order directly from their table. The kitchen gets orders in real time — no shouting, no confusion. Items that run out are hidden instantly, so your team never has to say "sorry, that\'s not available." Orders are processed first-in, first-out so every table is served fairly and nothing gets missed. Fewer staff needed on the floor, faster service, happier customers — even on your busiest night.',
        impact: 'Self-ordering reduces service staff costs and handles peak-hour crowds with zero extra effort.',
        span: 'md:col-span-2',
        accent: 'bg-white border-slate-200',
        image: '/handlecrowd.png',
        imageAlt: 'Digital menu QR ordering system handling restaurant crowd efficiently',
    },
];

export default function AIFeatures() {
    return (
        <section id="features" className="py-14 sm:py-24 px-4 bg-background-light">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Powered by AI</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Your Menu Isn&apos;t Just Digital.<br />
                        <span className="text-slate-500">It&apos;s Built to Increase Your Revenue.</span>
                    </h2>
                    <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
                        Most restaurants just put their menu online. Vsite goes further — it actively helps you increase what customers order and how much they spend.
                    </p>
                </div>

                {/* Bento Grid — Row 1: [2col] + [1col] | Row 2: [1col] + [2col] */}
                <div className="grid md:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className={`rounded-3xl border p-5 sm:p-8 flex flex-col ${f.span} ${f.accent}`}
                        >
                            <h3 className="text-xl font-bold font-display text-slate-900 mb-3">{f.title}</h3>
                            <p className="text-slate-600 leading-relaxed text-sm flex-1">{f.description}</p>

                            {/* Card 1: hero image — 2-col span, no image field */}
                            {f.span === 'md:col-span-2' && !f.image && (
                                <div className="mt-6 rounded-2xl overflow-hidden border border-primary/10 shadow-sm aspect-video relative">
                                    <Image
                                        src="/ai-menu-preview.jpg"
                                        alt="AI-generated digital menu with professional food photos"
                                        fill
                                        sizes="(max-width: 768px) 100vw, 66vw"
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            {/* Cards 2 & 3: single-col images — 4:3 mobile, 16:9 md+ */}
                            {f.image && f.span === 'md:col-span-1' && (
                                <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 shadow-sm aspect-[4/3] md:aspect-video relative">
                                    <Image
                                        src={f.image}
                                        alt={f.imageAlt ?? ''}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 33vw"
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            {/* Card 4: crowd image — 2-col span with image field */}
                            {f.image && f.span === 'md:col-span-2' && (
                                <div className="mt-6 rounded-2xl overflow-hidden border border-slate-100 shadow-sm aspect-video relative">
                                    <Image
                                        src={f.image}
                                        alt={f.imageAlt ?? ''}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 66vw"
                                        className="object-cover"
                                    />
                                </div>
                            )}

                            <div className="mt-6 flex items-start gap-2 px-4 py-3 bg-primary/8 rounded-xl">
                                <span className="material-symbols-outlined text-primary text-base mt-0.5 shrink-0">trending_up</span>
                                <p className="text-xs text-primary font-semibold">{f.impact}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
