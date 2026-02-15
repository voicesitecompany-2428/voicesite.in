'use client';

export default function SocialProof() {
    return (
        <section className="overflow-hidden bg-background-light py-16 md:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col justify-between gap-6 md:mb-12 md:flex-row md:items-end">
                    <div className="max-w-lg">
                        <h2 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">Loved by Small Businesses</h2>
                        <p className="text-base text-slate-600 md:text-lg">Join thousands of shop owners across India who moved online without typing a single line of code.</p>
                    </div>
                    {/* Navigation Buttons (Hidden on mobile) */}
                    <div className="hidden gap-2 md:flex">
                        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-primary hover:text-primary">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-primary hover:text-primary">
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Testimonials Grid (Simulating a slider view) */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Card 1 */}
                    <div className="flex flex-col h-full rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="mb-4 flex items-center gap-1 text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className="material-symbols-outlined filled text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            ))}
                        </div>
                        <p className="mb-8 flex-1 leading-relaxed text-slate-700">"I run a small bakery in Pune. I didn't have time to learn website builders. With VoiceSite, I just described my cakes while kneading dough, and my site was ready!"</p>
                        <div className="mt-auto flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 object-cover ring-2 ring-slate-100">
                                {/* Placeholder Avatar */}
                                <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-blue-300">person</span>
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-slate-900">Rajesh Sharma</h5>
                                <p className="text-xs text-slate-500">Owner, Sharma Sweets</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="flex flex-col h-full rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                        <div className="mb-4 flex items-center gap-1 text-yellow-400">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className="material-symbols-outlined filled text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            ))}
                        </div>
                        <p className="mb-8 flex-1 leading-relaxed text-slate-700">"Getting my boutique online seemed expensive. VoiceSite.in made it practically free and instantaneous. The AI even wrote better descriptions than I could!"</p>
                        <div className="mt-auto flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-purple-100 object-cover ring-2 ring-slate-100">
                                {/* Placeholder Avatar */}
                                <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-purple-300">person_3</span>
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-slate-900">Priya Patel</h5>
                                <p className="text-xs text-slate-500">Founder, Ethnic Trends</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="flex flex-col h-full rounded-2xl border border-slate-100 bg-white p-8 shadow-sm md:hidden lg:flex">
                        <div className="mb-4 flex items-center gap-1 text-yellow-400">
                            {[...Array(4)].map((_, i) => (
                                <span key={i} className="material-symbols-outlined filled text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            ))}
                            <span className="material-symbols-outlined filled text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>star_half</span>
                        </div>
                        <p className="mb-8 flex-1 leading-relaxed text-slate-700">"My hardware store needed visibility. I spoke the inventory list into the app, and it created categorized pages automatically. Unbelievable tech."</p>
                        <div className="mt-auto flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-green-100 object-cover ring-2 ring-slate-100">
                                {/* Placeholder Avatar */}
                                <span className="material-symbols-outlined flex h-full w-full items-center justify-center text-green-300">person_2</span>
                            </div>
                            <div>
                                <h5 className="text-sm font-bold text-slate-900">Amit Verma</h5>
                                <p className="text-xs text-slate-500">Manager, City Hardware</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
