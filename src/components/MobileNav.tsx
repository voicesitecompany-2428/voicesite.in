'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOnboarding } from './OnboardingContext';

export default function MobileNav() {
    const pathname = usePathname();
    const { openModal } = useOnboarding();

    return (
        <nav className=" fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around items-center h-16 pb-safe md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
            <Link
                href="/manage/my-shop"
                className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/manage/my-shop' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[24px] mb-1 ${pathname === '/manage/my-shop' ? 'font-filled' : ''}`}>storefront</span>
                <span className="text-[10px] font-medium">Shop</span>
            </Link>

            <Link
                href="/manage/menu"
                className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/manage/menu' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[24px] mb-1 ${pathname === '/manage/menu' ? 'font-filled' : ''}`}>menu_book</span>
                <span className="text-[10px] font-medium">Menu</span>
            </Link>

            <div className="relative -top-5">
                <button
                    onClick={openModal}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 active:scale-95 transition-transform"
                >
                    <span className="material-symbols-outlined text-[32px]">add</span>
                </button>
            </div>

            <Link
                href="/manage/recharge"
                className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/manage/recharge' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[24px] mb-1 ${pathname === '/manage/recharge' ? 'font-filled' : ''}`}>bolt</span>
                <span className="text-[10px] font-medium">Recharge</span>
            </Link>

            <Link
                href="/manage/settings"
                className={`flex flex-col items-center justify-center w-full h-full ${pathname === '/manage/settings' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[24px] mb-1 ${pathname === '/manage/settings' ? 'font-filled' : ''}`}>settings</span>
                <span className="text-[10px] font-medium">Settings</span>
            </Link>
        </nav>
    );
}
