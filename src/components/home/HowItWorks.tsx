'use client';

export default function HowItWorks() {
    return (
        <section id="how-it-works" className="bg-white py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mx-auto mb-12 max-w-2xl text-center md:mb-16">
                    <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary sm:text-sm">Workflow</h2>
                    <h3 className="mb-4 text-2xl font-bold text-slate-900 md:text-3xl lg:text-4xl">From Voice to Website in Minutes</h3>
                    <p className="text-base text-slate-500 sm:text-lg">Forget complex dashboards. If you can send a voice note, you can build a website.</p>
                </div>
                <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
                    {/* Step 1 */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-background-light p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
                        <div className="absolute right-0 top-0 select-none p-4 text-6xl font-bold text-slate-300 opacity-10">1</div>
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white text-primary shadow-sm transition-transform duration-300 group-hover:scale-110">
                            <span className="material-symbols-outlined text-3xl">mic</span>
                        </div>
                        <h4 className="mb-3 text-xl font-bold text-slate-900">Just Talk</h4>
                        <p className="leading-relaxed text-slate-600">
                            Tap the mic and describe your business. Tell us about your services, hours, and story naturally.
                        </p>
                    </div>
                    {/* Step 2 */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-background-light p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
                        <div className="absolute right-0 top-0 select-none p-4 text-6xl font-bold text-slate-300 opacity-10">2</div>
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white text-purple-600 shadow-sm transition-transform duration-300 group-hover:scale-110">
                            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                        </div>
                        <h4 className="mb-3 text-xl font-bold text-slate-900">AI Structures It</h4>
                        <p className="leading-relaxed text-slate-600">
                            Our AI processes your voice, writes the copy, selects images, and designs the layout instantly.
                        </p>
                    </div>
                    {/* Step 3 */}
                    <div className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-background-light p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5">
                        <div className="absolute right-0 top-0 select-none p-4 text-6xl font-bold text-slate-300 opacity-10">3</div>
                        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white text-green-500 shadow-sm transition-transform duration-300 group-hover:scale-110">
                            <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                        </div>
                        <h4 className="mb-3 text-xl font-bold text-slate-900">Website Goes Live</h4>
                        <p className="leading-relaxed text-slate-600">
                            Review your new site on your phone. Hit publish and share your link with customers immediately.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
