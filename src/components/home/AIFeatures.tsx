'use client';

import Image from 'next/image';

const features = [
    {
        materialIcon: 'image',
        title: 'Real Food Photos — Without a Photoshoot',
        description:
            'We have a library of thousands of professional food photos, covering every dish in Indian and South Indian cuisine. When you upload your menu, our AI automatically matches each item to the right high-quality photo. Your menu looks like it was shot by a professional photographer — on day one, for free.',
        impact: 'Menus with food photos see 30% higher order values on average.',
        span: 'md:col-span-2',
        accent: 'bg-primary/5 border-primary/15',
        iconBg: 'bg-primary/10 text-primary',
    },
    {
        materialIcon: 'dashboard_customize',
        title: 'Smart Layout That Guides What Customers Order',
        description:
            "Menu engineering is a proven science used by top restaurant chains worldwide. Our AI places your high-margin, highest-selling dishes in the prime visual positions — so they get noticed first and ordered more. You don't change your prices. You don't add anything. The layout does the work.",
        impact: 'Strategic menu layout can increase revenue per table by 10–15% with zero extra effort.',
        span: '',
        accent: 'bg-white border-slate-200',
        iconBg: 'bg-slate-100 text-slate-600',
    },
    {
        materialIcon: 'edit_note',
        title: 'Descriptions That Make Customers Hungry',
        description:
            '"Crispy golden dosa with house-made sambar and fresh coconut chutney" sells more than "Dosa — ₹60." Our AI writes a proper, mouthwatering description for every single item on your menu — automatically. You never have to write a word.',
        impact: 'Described items sell 27% more than items listed without descriptions.',
        span: '',
        accent: 'bg-white border-slate-200',
        iconBg: 'bg-slate-100 text-slate-600',
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
                        <span className="text-slate-500">It&apos;s Engineered to Make You More Money.</span>
                    </h2>
                    <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
                        Most restaurants put their menu online and call it done.
                        vsite goes further — our AI actively optimises your menu to increase what customers order.
                    </p>
                </div>

                {/* Bento Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                    {features.map((f) => (
                        <div
                            key={f.title}
                            className={`rounded-3xl border p-5 sm:p-8 flex flex-col ${f.span} ${f.accent}`}
                        >
                            <div className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center mb-6`}>
                                <span className="material-symbols-outlined text-3xl">{f.materialIcon}</span>
                            </div>
                            <h3 className="text-xl font-bold font-display text-slate-900 mb-3">{f.title}</h3>
                            <p className="text-slate-600 leading-relaxed text-sm flex-1">{f.description}</p>
                            {f.span === 'md:col-span-2' && (
                                <div className="mt-6 rounded-2xl overflow-hidden border border-primary/10 shadow-sm">
                                    <Image
                                        src="/ai-menu-preview.jpg"
                                        alt="AI-generated digital menu with professional food photos"
                                        width={900}
                                        height={500}
                                        className="w-full h-auto object-cover"
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
