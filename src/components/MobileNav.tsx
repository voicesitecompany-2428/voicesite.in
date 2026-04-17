'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlan } from './PlanContext';
import { useNotifications } from './NotificationContext';

const NAV_ITEMS = [
    { label: 'Dashboard',  icon: 'bar_chart',   href: '/manage/dashboard',         gated: false },
    { label: 'Orders',     icon: 'description',  href: '/manage/orders',            gated: true  },
    { label: 'Products',   icon: 'package_2',    href: '/manage/product-inventory', gated: false },
    { label: 'Settings',   icon: 'settings',     href: '/manage/settings',          gated: false },
];

const ACTIVE_COLOR  = '#5137EF';
const DEFAULT_COLOR = '#71717A';

export default function MobileNav() {
    const pathname = usePathname();
    const { isPayEat } = usePlan();
    const { missingImageCount, settingsIncomplete, bannerDot } = useNotifications();

    // Settings tab is also "active" for sub-pages reachable from Settings on mobile
    const isSettingsActive =
        pathname === '/manage/settings' ||
        pathname.startsWith('/manage/banner-management') ||
        pathname.startsWith('/manage/transactions') ||
        pathname.startsWith('/manage/qr') ||
        pathname.startsWith('/manage/subscription');

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 bg-white z-50 lg:hidden flex items-stretch"
            style={{
                borderTop: '1px solid #E4E4E7',
                height: 'calc(60px + env(safe-area-inset-bottom))',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            {NAV_ITEMS.map((item) => {
                const locked = item.gated && !isPayEat;
                const href = locked ? '/manage/subscription' : item.href;
                const isActive =
                    !locked && (
                        item.href === '/manage/settings'
                            ? isSettingsActive
                            : pathname === item.href ||
                              (item.href !== '/manage/dashboard' && pathname.startsWith(item.href))
                    );
                const color = locked ? '#C4C4C4' : isActive ? ACTIVE_COLOR : DEFAULT_COLOR;

                // Mobile dot: Products → missing images; Settings → incomplete or bannerDot
                const showDot =
                    (item.href === '/manage/product-inventory' && missingImageCount > 0) ||
                    (item.href === '/manage/settings' && (settingsIncomplete || bannerDot));

                return (
                    <Link
                        key={item.href}
                        href={href}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 3,
                            textDecoration: 'none',
                            color,
                            position: 'relative',
                        }}
                    >
                        {/* Icon with dot overlay */}
                        <div style={{ position: 'relative', display: 'inline-flex' }}>
                            <span
                                className="material-symbols-outlined"
                                style={{
                                    fontSize: 24,
                                    fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                                }}
                            >
                                {item.icon}
                            </span>
                            {showDot && (
                                <span style={{
                                    position: 'absolute', top: 0, right: -2,
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: '#E7000B',
                                    border: '1.5px solid #FFFFFF',
                                }} />
                            )}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, lineHeight: '14px' }}>
                            {item.label}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}
