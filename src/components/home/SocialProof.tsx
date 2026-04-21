'use client';

const testimonials = [
    {
        quote:
            'I took a photo of my handwritten menu on Sunday evening. By Monday morning, I had a proper digital menu with photos and everything. My customers were genuinely surprised.',
        name: 'Karthik R.',
        business: 'Saravana Café, Coimbatore',
        initials: 'KR',
        bg: 'bg-primary',
    },
    {
        quote:
            'During lunch rush, we had 8 tables ordering at the same time through Pay & Eat. No queue. No confusion. My one waiter handled everything. This alone was worth it.',
        name: 'Priya M.',
        business: 'The Curry House, Chennai',
        initials: 'PM',
        bg: 'bg-purple-600',
    },
    {
        quote:
            'The AI picked better food photos than I could have found myself. Customers keep telling me the menu looks very professional. Setup was 3 minutes, exactly like they said.',
        name: 'Senthil K.',
        business: 'Annachi Food Truck, Madurai',
        initials: 'SK',
        bg: 'bg-slate-700',
    },
];

export default function SocialProof() {
    return (
        <section className="py-14 sm:py-24 px-4 bg-white">
            <div className="mx-auto max-w-6xl">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Early Adopters</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Be One of the First Restaurants<br />in Tamil Nadu to Never Print a Menu Again.
                    </h2>
                    <p className="mt-5 text-lg text-slate-500 max-w-2xl mx-auto">
                        vsite is built specifically for restaurants, cafés, food trucks, and hotels
                        in South India — starting right here in Tamil Nadu.
                    </p>
                </div>

                {/* Testimonial Cards */}
                <div className="grid gap-6 md:grid-cols-3">
                    {testimonials.map((t) => (
                        <div
                            key={t.name}
                            className="flex flex-col rounded-3xl border border-slate-100 bg-background-light p-5 sm:p-8 shadow-sm"
                        >
                            {/* Star rating */}
                            <div className="flex gap-1 mb-5">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="material-symbols-outlined text-amber-400 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                        star
                                    </span>
                                ))}
                            </div>

                            {/* Quote */}
                            <blockquote className="flex-1 text-slate-700 text-base leading-relaxed italic mb-6">
                                &ldquo;{t.quote}&rdquo;
                            </blockquote>

                            {/* Author */}
                            <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                                <div className={`w-11 h-11 rounded-full ${t.bg} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                    {t.initials}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{t.name}</div>
                                    <div className="text-slate-400 text-xs">{t.business}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-center text-xs text-slate-400 mt-8 italic">
                    * Testimonials to be replaced with real customer quotes after beta launch.
                </p>
            </div>
        </section>
    );
}
