'use client';

import Link from 'next/link';

export default function FooterCTA() {
    return (
        <footer className="bg-background-dark py-12 px-4 md:py-20">
            <div className="mx-auto max-w-4xl text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20 md:mb-8 md:h-16 md:w-16">
                    <span className="material-symbols-outlined text-2xl text-primary md:text-3xl">mic</span>
                </div>
                <h2 className="mb-4 text-3xl font-bold tracking-tight text-white md:mb-6 md:text-4xl lg:text-5xl">
                    Start Your Website in <span className="text-primary">60 Seconds</span>
                </h2>
                <p className="mx-auto mb-8 max-w-2xl text-base text-slate-400 md:mb-10 md:text-xl">
                    No credit card required. Join the voice revolution and get your business online today.
                </p>
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link
                        href="/manage"
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary-dark sm:w-auto"
                    >
                        Build Now
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                </div>

                <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 text-sm text-slate-500 md:flex-row">
                    <p>© 2023 VoiceSite.in. All rights reserved.</p>
                    <div className="mt-4 flex gap-6 md:mt-0">
                        <Link href="#" className="transition-colors hover:text-white">Privacy</Link>
                        <Link href="#" className="transition-colors hover:text-white">Terms</Link>
                        <Link href="#" className="transition-colors hover:text-white">Support</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
