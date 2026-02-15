'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

export default function FinalCTA() {
    return (
        <section className="bg-[#101922] py-24 text-center">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center"
                >
                    <h2 className="mb-8 text-4xl font-black text-white md:text-6xl">
                        Start Your Website<br />in 60 Seconds
                    </h2>

                    <Link
                        href="/manage"
                        className="group relative inline-flex h-16 items-center justify-center overflow-hidden rounded-full bg-[#1C81E8] px-10 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                    >
                        <motion.div
                            animate={{ scale: [1, 1.03, 1] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100"
                        />
                        <span className="relative">Start Speaking Now</span>
                    </Link>

                    <p className="mt-8 text-sm text-gray-400">
                        No credit card required • Free forever plan available
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
