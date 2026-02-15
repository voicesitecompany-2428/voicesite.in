'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function HeroSection() {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 lg:pb-32 lg:pt-48">
            {/* Background Elements */}
            <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-full w-full max-w-7xl -translate-x-1/2">
                <div className="animate-blob absolute right-0 top-20 h-72 w-72 rounded-full bg-primary/10 opacity-70 blur-3xl mix-blend-multiply filter"></div>
                <div className="animate-blob animation-delay-2000 absolute left-0 top-20 h-72 w-72 rounded-full bg-purple-200 opacity-70 blur-3xl mix-blend-multiply filter"></div>
                <div className="animate-blob animation-delay-4000 absolute -bottom-8 left-20 h-72 w-72 rounded-full bg-pink-200 opacity-70 blur-3xl mix-blend-multiply filter"></div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-20">
                    {/* Text Content */}
                    <div className="mx-auto flex-1 max-w-2xl text-center lg:mx-0 lg:text-left">
                        <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                            </span>
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">V 2.0 is Live</span>
                        </div>
                        <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-[1.1]">
                            Just <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent after:content-['Speak'] after:animate-[changeText_6s_infinite]"></span><br />
                            Your Website
                        </h1>
                        <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-slate-600 sm:text-xl lg:mx-0">
                            The fastest way for business owners to get online. No coding, no drag-and-drop. Just talk, and AI builds it for you.
                        </p>
                        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
                            <button className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-8 py-3.5 text-lg font-semibold text-white shadow-xl shadow-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/40 sm:w-auto sm:py-4">
                                <span className="absolute inset-0 h-full w-full -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></span>
                                <span className="material-symbols-outlined text-2xl">mic</span>
                                Start Speaking
                            </button>
                            <button className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-8 py-3.5 text-lg font-medium text-slate-700 transition-all duration-300 hover:border-primary/30 hover:bg-slate-50 hover:text-primary sm:w-auto sm:py-4">
                                <span className="material-symbols-outlined text-xl">play_circle</span>
                                See Demo
                            </button>
                        </div>
                        <div className="mt-8 flex items-center justify-center gap-4 text-sm font-medium text-slate-500 lg:justify-start">
                            {/* User Avatars */}
                            <div className="flex -space-x-2">
                                <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-300"></div>
                                <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-400"></div>
                                <div className="h-8 w-8 rounded-full border-2 border-white bg-gray-500"></div>
                            </div>
                            <p>Trusted by 2,000+ owners</p>
                        </div>
                    </div>

                    {/* Hero Image/Visual */}
                    <div className="animate-float relative w-full max-w-xs flex-1 lg:max-w-none">
                        <div className="relative mx-auto aspect-[9/18] w-full overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-slate-900 shadow-2xl sm:aspect-[9/16] sm:max-w-[360px] sm:rounded-[2.5rem] sm:border-[8px] z-10">
                            {/* Screen Content */}
                            <div className="absolute inset-0 flex flex-col bg-white">
                                {/* Mobile Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 h-14">
                                    <div className="h-4 w-20 rounded-full bg-slate-200"></div>
                                    <div className="h-8 w-8 rounded-full bg-slate-100"></div>
                                </div>
                                {/* Mobile Hero Mockup */}
                                <div className="flex flex-col items-center space-y-4 p-6 text-center">
                                    <div className="relative h-32 w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-purple-100"></div>
                                    <div className="h-6 w-3/4 rounded-lg bg-slate-800"></div>
                                    <div className="h-3 w-full rounded-full bg-slate-200"></div>
                                    <div className="h-3 w-5/6 rounded-full bg-slate-200"></div>
                                </div>
                                {/* Voice Interface Overlay */}
                                <div className="mt-auto rounded-t-3xl border-t border-slate-100 bg-white/90 p-6 pb-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] backdrop-blur-sm">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="flex h-8 items-center justify-center gap-1">
                                            <div className="h-3 w-1 animate-[bounce_1s_infinite] rounded-full bg-primary"></div>
                                            <div className="h-5 w-1 animate-[bounce_1.2s_infinite] rounded-full bg-primary"></div>
                                            <div className="h-8 w-1 animate-[bounce_0.8s_infinite] rounded-full bg-primary"></div>
                                            <div className="h-5 w-1 animate-[bounce_1.1s_infinite] rounded-full bg-primary"></div>
                                            <div className="h-3 w-1 animate-[bounce_0.9s_infinite] rounded-full bg-primary"></div>
                                        </div>
                                        <p className="text-sm font-medium text-slate-500">"Add a gallery of my bakery items..."</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative Elements behind phone */}
                        <div className="absolute left-1/2 top-1/2 -z-10 h-[80%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-primary/20 to-purple-200 opacity-60 blur-3xl filter"></div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @keyframes changeText {
                    0%, 30% { content: "Speak"; }
                    33%, 63% { content: "Dictate"; }
                    66%, 96% { content: "Describe"; }
                    100% { content: "Speak"; }
                }
            `}</style>
        </section>
    );
}
