'use client';

import Link from 'next/link';

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
                            <Link href="#" className="text-slate-500 hover:text-white transition-colors text-sm">Instagram</Link>
                            <Link href="#" className="text-slate-500 hover:text-white transition-colors text-sm">LinkedIn</Link>
                            <Link href="#" className="text-slate-500 hover:text-white transition-colors text-sm">WhatsApp</Link>
                        </div>
                    </div>

                    {/* Column 2: Product */}
                    <div>
                        <h5 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Product</h5>
                        <ul className="space-y-3">
                            {['QR Menu', 'Pay & Eat', 'Pricing', '14-Day Free Trial'].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Company */}
                    <div>
                        <h5 className="text-white font-bold mb-5 text-sm uppercase tracking-wider">Company</h5>
                        <ul className="space-y-3">
                            {['About vsite', 'Contact Us', 'Privacy Policy', 'Terms of Service'].map((item) => (
                                <li key={item}>
                                    <Link href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">
                                        {item}
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
                                <Link href="mailto:hello@vsite.in" className="hover:text-white transition-colors">
                                    hello@vsite.in
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
                    <p>© 2025 vsite. All rights reserved. Made in Tamil Nadu.</p>
                    <div className="flex gap-6">
                        <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
