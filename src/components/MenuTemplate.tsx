'use client';

import Image from "next/image";
import { Shop } from '@/lib/supabase';

export default function MenuTemplate({ shop }: { shop: Shop }) {
    return (
        <main className="min-h-screen bg-[#FDFBF7] text-[#2C2C2C] font-serif selection:bg-orange-100">
            {/* 1. Header Section */}
            <header className="relative w-full h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
                {/* Background Image */}
                {shop.image_url ? (
                    <Image
                        src={shop.image_url}
                        alt={shop.name}
                        fill
                        className="object-cover brightness-50"
                        priority
                    />
                ) : (
                    <div className="absolute inset-0 bg-[#2C2C2C]" />
                )}

                {/* Title Overlay */}
                <div className="relative z-10 text-center px-4 max-w-full">
                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-lg tracking-tight mb-4 break-words">
                        {shop.name}
                    </h1>
                    {shop.tagline && (
                        <p className="text-lg md:text-2xl text-orange-100 font-light italic tracking-wide">
                            {shop.tagline}
                        </p>
                    )}
                </div>
            </header>

            {/* 2. Menu Grid */}
            <section className="px-4 py-16 md:py-24 max-w-7xl mx-auto">
                {/* Intro Text */}
                {shop.description && (
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-sans">
                            {shop.description}
                        </p>
                    </div>
                )}

                {/* Grid */}
                {shop.products && shop.products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-8 gap-y-16 max-w-5xl mx-auto">
                        {shop.products.filter(p => p.is_live !== false).map((product, index) => (
                            <div key={index} className="flex flex-col gap-4 group">
                                {/* Image */}
                                <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden shadow-lg bg-gray-100">
                                    {product.image_url ? (
                                        <Image
                                            src={product.image_url}
                                            alt={product.name}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                            <span className="material-symbols-outlined text-4xl">restaurant_menu</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="text-left px-2">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className="text-2xl md:text-3xl font-bold text-[#1a1a1a]">
                                            {product.name}
                                        </h3>
                                    </div>

                                    {product.description && (
                                        <p className="text-gray-500 font-sans text-sm md:text-base mb-3 leading-relaxed line-clamp-2">
                                            {product.description}
                                        </p>
                                    )}

                                    <div className="text-[#C2410C] text-xl md:text-2xl font-bold font-sans">
                                        ₹{product.price.toLocaleString("en-IN")}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                        <p className="text-gray-400 text-lg font-sans">No menu items yet.</p>
                    </div>
                )}
            </section>

            {/* 3. Footer / Details */}
            <footer className="bg-[#1a1a1a] text-white py-20 px-4 mt-20">
                <div className="max-w-4xl mx-auto text-center font-sans space-y-8">
                    {/* Contact & Location removed as per request */}


                    <div className="pt-8 text-sm text-gray-600">
                        Created by VoiceSite.in
                    </div>
                </div>
            </footer>
        </main>
    );
}
