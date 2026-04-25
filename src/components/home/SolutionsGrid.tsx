import Link from 'next/link';

// SolutionsGrid is a homepage section that surfaces every F&B sub-vertical
// vsite serves. Each tile links to a dedicated landing page — this is what
// signals to Google (and AI engines) that vsite covers the full F&B SMB
// category, not just restaurants. Sitelinks under "vsite" branded queries
// are likely to draw from this set.

const solutions = [
    { icon: 'restaurant', label: 'Restaurants',          href: '/restaurant-menu-software' },
    { icon: 'local_cafe', label: 'Cafés',                href: '/cafe-menu-software' },
    { icon: 'cake',       label: 'Bakeries',             href: '/bakery-menu-software' },
    { icon: 'kitchen',    label: 'Cloud Kitchens',       href: '/cloud-kitchen-software' },
    { icon: 'icecream',   label: 'Ice Cream Parlours',   href: '/ice-cream-shop-menu' },
    { icon: 'celebration',label: 'Sweet & Mithai Shops', href: '/sweet-shop-menu' },
    { icon: 'wine_bar',   label: 'Bars & Pubs',          href: '/bar-pub-menu' },
    { icon: 'qr_code_2',  label: 'QR Code Menus',        href: '/qr-menu' },
    { icon: 'auto_awesome', label: 'AI Menu Builder',    href: '/ai-menu-builder' },
    { icon: 'image',      label: 'AI Food Photos',       href: '/ai-food-photo-generator' },
    { icon: 'phone_android', label: 'Contactless Menus', href: '/contactless-menu' },
    { icon: 'edit_note',  label: 'Online Menu Maker',    href: '/online-menu-maker' },
];

export default function SolutionsGrid() {
    return (
        <section id="solutions" className="bg-white py-20 border-y border-slate-100">
            <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-12">
                    <p className="text-primary text-xs font-bold uppercase tracking-widest">Solutions</p>
                    <h2 className="text-3xl sm:text-4xl font-extrabold font-display text-slate-900 mt-3">
                        Built for Every F&amp;B Business in India
                    </h2>
                    <p className="text-slate-600 mt-4 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                        Restaurants, cafés, bakeries, cloud kitchens, ice cream parlours, sweet shops, bars —
                        whatever you serve, vsite gives you a smart digital menu and QR ordering in 3 minutes.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {solutions.map((s) => (
                        <Link
                            key={s.href}
                            href={s.href}
                            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:border-primary/40 hover:shadow-md transition-all"
                        >
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                                <span className="material-symbols-outlined text-primary text-xl">{s.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                                    {s.label}
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-primary transition-colors">
                                arrow_forward
                            </span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
