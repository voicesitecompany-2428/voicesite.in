'use client';

import React from 'react';
import { useOnboarding } from '@/components/OnboardingContext';

export default function DashboardPage() {
    const { openModal } = useOnboarding();

    return (
        <div className="container mx-auto max-w-[1000px] p-6 md:p-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] py-20">
            <div className="flex flex-col items-center text-center mb-24 w-full max-w-3xl">
                <button
                    onClick={openModal}
                    className="group relative flex items-center justify-center w-36 h-36 md:w-48 md:h-48 rounded-full bg-primary shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 mb-8 focus:outline-none focus:ring-4 focus:ring-blue-100 ring-offset-4 ring-offset-background-light"
                >
                    <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <div className="absolute -inset-4 rounded-full border-2 border-primary/20 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-700 animate-pulse"></div>
                    <span className="material-symbols-outlined text-white" style={{ fontSize: '80px', fontVariationSettings: "'FILL' 1" }}>mic</span>
                </button>
                <h1 className="text-[#111418] text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight mb-4">
                    Create your sites with your voice
                </h1>
                <p className="text-gray-500 text-lg md:text-xl font-normal leading-relaxed max-w-2xl">
                    Simply describe your vision, and our AI will build your entire website or menu in seconds.
                </p>
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-5xl">
                <div className="hidden md:block absolute top-[3rem] left-[15%] right-[15%] h-0.5 bg-gray-200 -z-10"></div>

                {/* Step 1 */}
                <div className="flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 z-10 relative">
                        <span className="material-symbols-outlined text-primary text-4xl">graphic_eq</span>
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#111418] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">1</div>
                    </div>
                    <h3 className="text-[#111418] text-xl font-bold mb-2">Speak</h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-[250px]">
                        Describe your business, style, and goals naturally.
                    </p>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 z-10 relative">
                        <span className="material-symbols-outlined text-primary text-4xl">auto_awesome</span>
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#111418] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">2</div>
                    </div>
                    <h3 className="text-[#111418] text-xl font-bold mb-2">AI Generates</h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-[250px]">
                        Our engine instantly creates layout, copy, and images.
                    </p>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center text-center group">
                    <div className="w-24 h-24 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:border-primary/50 group-hover:scale-110 transition-all duration-300 z-10 relative">
                        <span className="material-symbols-outlined text-primary text-4xl">rocket_launch</span>
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#111418] text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">3</div>
                    </div>
                    <h3 className="text-[#111418] text-xl font-bold mb-2">Launch</h3>
                    <p className="text-gray-500 text-sm leading-relaxed max-w-[250px]">
                        Review your professional site and go live in one click.
                    </p>
                </div>
            </div>
        </div>
    );
}
