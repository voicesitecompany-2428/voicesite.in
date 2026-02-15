'use client';

import Link from 'next/link';

export default function Navbar() {
    return (
        <nav className="fixed z-50 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md transition-all duration-300">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between sm:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                            <span className="material-symbols-outlined text-xl">graphic_eq</span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">
                            VoiceSite<span className="text-slate-400">.in</span>
                        </span>
                    </Link>

                    {/* Desktop Nav Links */}
                    <div className="hidden items-center space-x-8 md:flex">
                        <Link href="#how-it-works" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
                            How it works
                        </Link>
                        {/* 
                        <Link href="#" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
                            Pricing
                        </Link>
                        <Link href="#" className="text-sm font-medium text-slate-600 transition-colors hover:text-primary">
                            Examples
                        </Link> 
                        */}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center space-x-4">
                        <Link href="/manage" className="hidden text-sm font-medium text-slate-900 hover:text-primary sm:block">
                            Log in
                        </Link>
                        <Link
                            href="/manage"
                            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-slate-800"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
