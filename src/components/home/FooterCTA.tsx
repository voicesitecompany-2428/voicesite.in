'use client';

import Link from 'next/link';

const productLinks = [
    { label: 'QR Menu', href: '/pricing' },
    { label: 'Pay & Eat', href: '/pricing' },
    { label: 'Pricing', href: '/pricing' },
    { label: '14-Day Free Trial', href: '/signup' },
];

const companyLinks = [
    { label: 'About vsite', href: '/about' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
];

export default function FooterCTA() {
    return (
        <footer className="bg-[#0e0e2c] pt-20 pb-10 px-4 border-t border-white/5">
            <div className="mx-auto max-w-7xl">
                {/* 4-column grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
                    {/* Column 1: Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="text-2xl font-extrabold font-display text-white tracking-tight">
                            vsite
                        </Link>
                        <p className="mt-4 text-slate-400 text-sm leading-relaxed">
                            Your menu, digital. Your orders, faster.
                        </p>
                        <div className="mt-6 flex gap-4">
                            <a href="https://www.instagram.com/vsitein" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors text-sm">Instagram</a>
                            <a href="https://www.linkedin.com/company/vsitein" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors text-sm">LinkedIn</a>
                            <a href="https://wa.me/91XXXXXXXXXX" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors text-sm">WhatsApp</a>
                        </div>
                    </div>

                    {/* Column 2: Product */}
                    <div>
                        <h5 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Product</h5>
                        <ul className="space-y-3">
                            {productLinks.map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-slate-400 hover:text-primary transition-colors text-sm">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Company */}
                    <div>
                        <h5 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Company</h5>
                        <ul className="space-y-3">
                            {companyLinks.map((item) => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-slate-400 hover:text-primary transition-colors text-sm">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Language & Support */}
                    <div>
                        <h5 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Language & Support</h5>
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="material-symbols-outlined text-slate-500 text-base">language</span>
                                <div className="flex gap-2 text-slate-400">
                                    <button className="hover:text-white transition-colors">English</button>
                                    <span>·</span>
                                    <button className="hover:text-white transition-colors">Tamil</button>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-slate-400">
                                <span className="material-symbols-outlined text-slate-500 text-base shrink-0">phone</span>
                                <span>WhatsApp: +91 XXXXX XXXXX</span>
                            </div>
                            <div className="flex items-start gap-2 text-sm text-slate-400">
                                <span className="material-symbols-outlined text-slate-500 text-base shrink-0">mail</span>
                                <a href="mailto:hello@vsite.in" className="hover:text-white transition-colors">
                                    hello@vsite.in
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
                    <p>© 2026 vsite. All rights reserved. Made in Tamil Nadu.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
