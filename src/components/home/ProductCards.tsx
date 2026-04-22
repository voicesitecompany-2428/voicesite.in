'use client';

import Link from 'next/link';

const qrMenuFlow = [
    { icon: 'qr_code_scanner', label: 'Customer scans or taps' },
    { icon: 'menu_book', label: 'Views your full digital menu' },
    { icon: 'person', label: 'Decides what to order' },
];

const payEatFlow = [
    { icon: 'qr_code_scanner', label: 'Customer scans or taps' },
    { icon: 'shopping_cart', label: 'Selects items from menu' },
    { icon: 'payments', label: 'Pays directly (UPI/Cash)' },
    { icon: 'receipt_long', label: 'Order goes to kitchen (live)' },
    { icon: 'storefront', label: 'Customer picks up at counter' },
];

const qrFeatures = [
    'Clean digital menu (no printing needed)',
    'Auto-generated food images & descriptions',
    'Edit menu anytime (add/remove/update)',
    'Highlight offers & sold-out items live',
    'Works for dine-in & takeaway',
    'NFC card + QR stickers included',
];

const payEatFeatures = [
    'Customers place orders directly from phone',
    'Accept UPI, GPay, PhonePe & cash',
    'Instant order to kitchen (live)',
    'Automatic billing (no manual work)',
    'Smart queue (handles rush smoothly)',
    'Sell more with faster table turnover',
];

const restaurantTypes = [
    { icon: 'coffee', label: 'Cafes' },
    { icon: 'restaurant', label: 'Restaurants' },
    { icon: 'cloud', label: 'Cloud Kitchens' },
    { icon: 'takeout_dining', label: 'QSR & Takeaway' },
    { icon: 'sports_bar', label: 'Bars & Pubs' },
    { icon: 'food_bank', label: 'Food Courts' },
];

export default function ProductCards() {
    return (
        <section className="py-14 sm:py-24 px-4 bg-background-light">
            <div className="mx-auto max-w-5xl">

                {/* Header */}
                <div className="text-center mb-10 sm:mb-14">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary">Choose How You Want to Run Your Orders</span>
                    <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-display text-slate-900 leading-tight">
                        Start with a Simple QR Menu.<br />
                        <span className="text-primary">Upgrade to Full Ordering When You&apos;re Ready.</span>
                    </h2>
                    <p className="mt-4 text-base sm:text-lg text-slate-500 max-w-xl mx-auto">
                        No pressure. No complexity.<br />
                        Pick what your restaurant actually needs today.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">

                    {/* Card 1 — Smart QR Menu */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 flex flex-col shadow-sm">
                        {/* Option badge */}
                        <div className="mb-5">
                            <span className="inline-block border border-green-500 text-green-600 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                Option 1
                            </span>
                        </div>

                        {/* Icon + title */}
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-green-600 text-3xl">qr_code</span>
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900">Smart QR Menu</h3>
                                <p className="text-green-600 font-semibold text-sm">View Only – No Ordering</p>
                            </div>
                        </div>

                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                            Let customers scan → view → decide.<br />You keep taking orders your way.
                        </p>

                        {/* How it works mini flow */}
                        <div className="rounded-xl border border-green-100 bg-green-50 p-4 mb-6">
                            <p className="text-green-700 font-bold text-xs uppercase tracking-wider mb-3">How it works</p>
                            <div className="flex items-start gap-1 flex-wrap">
                                {qrMenuFlow.map((step, i) => (
                                    <div key={step.label} className="flex items-center gap-1">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-slate-600 text-lg">{step.icon}</span>
                                            </div>
                                            <span className="text-[9px] text-slate-500 text-center leading-tight max-w-[56px]">{step.label}</span>
                                        </div>
                                        {i < qrMenuFlow.length - 1 && (
                                            <span className="material-symbols-outlined text-slate-300 text-base mb-4">arrow_forward</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Features */}
                        <div className="mb-6 flex-1">
                            <p className="text-green-600 font-bold text-sm mb-3">What you get:</p>
                            <ul className="space-y-2.5">
                                {qrFeatures.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <span className="material-symbols-outlined text-green-500 text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Best for */}
                        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-6">
                            <p className="flex items-center gap-1.5 text-amber-700 font-bold text-sm mb-1">
                                <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                Best for:
                            </p>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Restaurants that want to look modern and save printing cost without changing their current order flow.
                            </p>
                        </div>

                        {/* CTA */}
                        <Link
                            href="/signup"
                            className="flex items-center justify-center gap-2 border-2 border-green-500 text-green-600 px-6 py-3.5 rounded-full font-bold hover:bg-green-500 hover:text-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                        >
                            Start Free QR Menu
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                        <p className="text-center text-xs text-slate-400 mt-2">Get started in 2 minutes. No card required.</p>
                    </div>

                    {/* Card 2 — QR Ordering + Payment */}
                    <div className="bg-white rounded-3xl border-2 border-primary p-6 sm:p-8 flex flex-col shadow-xl shadow-primary/10 relative overflow-hidden">
                        {/* Most Popular ribbon */}
                        <div className="absolute top-0 right-0">
                            <div className="bg-primary text-white text-[10px] font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-bl-2xl flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                Most Popular
                            </div>
                        </div>

                        {/* Option badge */}
                        <div className="mb-5">
                            <span className="inline-block border border-primary text-primary text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                Option 2
                            </span>
                        </div>

                        {/* Icon + title */}
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-white text-3xl">shopping_cart</span>
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-extrabold font-display text-slate-900">QR Ordering + Payment</h3>
                                <p className="text-primary font-semibold text-sm">Scan → Order → Pay → Pickup</p>
                            </div>
                        </div>

                        <p className="text-slate-600 text-sm leading-relaxed mb-6">
                            Turn every table into a self-ordering system.<br />No waiting. No manual billing.
                        </p>

                        {/* How it works mini flow */}
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 mb-6">
                            <p className="text-primary font-bold text-xs uppercase tracking-wider mb-3">How it works</p>
                            <div className="flex items-start gap-1 flex-wrap">
                                {payEatFlow.map((step, i) => (
                                    <div key={step.label} className="flex items-center gap-1">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-primary/20 flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-slate-600 text-lg">{step.icon}</span>
                                            </div>
                                            <span className="text-[9px] text-slate-500 text-center leading-tight max-w-[56px]">{step.label}</span>
                                        </div>
                                        {i < payEatFlow.length - 1 && (
                                            <span className="material-symbols-outlined text-slate-300 text-base mb-4">arrow_forward</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Features */}
                        <div className="mb-6 flex-1">
                            <p className="text-primary font-bold text-sm mb-3">Everything in QR Menu, plus:</p>
                            <ul className="space-y-2.5">
                                {payEatFeatures.map((f) => (
                                    <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                                        <span className="material-symbols-outlined text-primary text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Best for */}
                        <div className="rounded-xl bg-primary/8 border border-primary/15 p-4 mb-6">
                            <p className="flex items-center gap-1.5 text-amber-700 font-bold text-sm mb-1">
                                <span className="material-symbols-outlined text-amber-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                Best for:
                            </p>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Restaurants that want to serve faster, reduce staff load, and increase revenue per table.
                            </p>
                        </div>

                        {/* CTA */}
                        <Link
                            href="/signup"
                            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3.5 rounded-full font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                            Start Pay &amp; Eat Free
                            <span className="material-symbols-outlined text-xl">arrow_forward</span>
                        </Link>
                        <p className="text-center text-xs text-slate-400 mt-2">Get started in 2 minutes. No card required.</p>
                    </div>
                </div>

                {/* Works for every restaurant type */}
                <div className="bg-white rounded-2xl border border-slate-200 px-6 sm:px-10 py-7">
                    <p className="text-center font-bold text-slate-900 text-base mb-6">Works for every restaurant type</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                        {restaurantTypes.map((t) => (
                            <div key={t.label} className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-xl bg-background-light flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-600 text-2xl">{t.icon}</span>
                                </div>
                                <span className="text-xs font-medium text-slate-600 text-center">{t.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs">
                        <span className="material-symbols-outlined text-base">verified_user</span>
                        Secure. Reliable. Made for Restaurants.
                    </div>
                </div>

            </div>
        </section>
    );
}
