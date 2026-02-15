'use client';

export default function Featurette() {
    return (
        <section className="border-t border-slate-200 bg-white py-12 md:py-16">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className="group relative h-80 overflow-hidden rounded-3xl border border-slate-100 shadow-lg">
                        {/* Abstract Map Background Placeholder */}
                        <div className="h-full w-full bg-[#e5e7eb] transition-transform duration-700 group-hover:scale-105 relative">
                            {/* Simplified map pattern */}
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#9ca3af 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                            {/* Map overlay content could go here */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <span className="material-symbols-outlined text-6xl text-gray-400">public</span>
                            </div>
                        </div>

                        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay"></div>
                        <div className="absolute bottom-6 left-6 right-6 rounded-xl border border-white/50 bg-white/90 p-4 shadow-sm backdrop-blur-md">
                            <div className="flex items-center gap-3">
                                <span className="relative flex h-3 w-3">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
                                </span>
                                <p className="text-sm font-semibold text-slate-800">50+ New sites launched in Mumbai today</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="mb-3 text-2xl font-bold text-slate-900 md:mb-4 md:text-3xl">Local SEO Built-in</h3>
                        <p className="mb-6 text-base text-slate-600 md:text-lg">
                            When you speak your location, we automatically optimize your site for local searches. Get found by customers in your neighborhood on Google Maps and Search.
                        </p>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-slate-700">
                                <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
                                <span>Automatic Google Maps Integration</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-700">
                                <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
                                <span>Local Keyword Optimization</span>
                            </li>
                            <li className="flex items-center gap-3 text-slate-700">
                                <span className="material-symbols-outlined text-xl text-green-500">check_circle</span>
                                <span>WhatsApp Click-to-Chat Button</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
}
