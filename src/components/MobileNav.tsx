'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useOnboarding } from './OnboardingContext';

export default function MobileNav() {
    const pathname = usePathname();
    const { openModal } = useOnboarding();

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex items-center justify-between h-[calc(64px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] md:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.05)] px-2 safe-area-bottom">
            <Link
                href="/manage/my-shop"
                className={`flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform duration-200 group ${pathname === '/manage/my-shop' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[26px] mb-1 group-hover:text-blue-500 transition-colors ${pathname === '/manage/my-shop' ? 'font-filled' : ''}`}>storefront</span>
                <span className="text-[10px] font-medium">Shop</span>
            </Link>

            <Link
                href="/manage/menu"
                className={`flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform duration-200 group ${pathname === '/manage/menu' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[26px] mb-1 group-hover:text-blue-500 transition-colors ${pathname === '/manage/menu' ? 'font-filled' : ''}`}>menu_book</span>
                <span className="text-[10px] font-medium">Menu</span>
            </Link>

            <div className="relative -top-6 flex-shrink-0 mx-2">
                <button
                    onClick={openModal}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white shadow-xl shadow-blue-200 active:scale-90 transition-all duration-200 hover:bg-blue-700 hover:shadow-blue-300 ring-4 ring-white"
                >
                    <span className="material-symbols-outlined text-[32px]">add</span>
                </button>
            </div>

            <Link
                href="/manage/recharge"
                className={`flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform duration-200 group ${pathname === '/manage/recharge' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[26px] mb-1 group-hover:text-blue-500 transition-colors ${pathname === '/manage/recharge' ? 'font-filled' : ''}`}>bolt</span>
                <span className="text-[10px] font-medium">Recharge</span>
            </Link>

            <Link
                href="/manage/settings"
                className={`flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-transform duration-200 group ${pathname === '/manage/settings' ? 'text-blue-600' : 'text-gray-500'}`}
            >
                <span className={`material-symbols-outlined text-[26px] mb-1 group-hover:text-blue-500 transition-colors ${pathname === '/manage/settings' ? 'font-filled' : ''}`}>settings</span>
                <span className="text-[10px] font-medium">Settings</span>
            </Link>
        </nav>
    );
}
