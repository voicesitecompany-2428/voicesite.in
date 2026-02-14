'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useOnboarding } from './OnboardingContext';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { openModal } = useOnboarding();
    const { user, signOut } = useAuth();

    // State for limits & profile
    const [isLimitReached, setIsLimitReached] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [profile, setProfile] = React.useState<{ full_name?: string, avatar_url?: string } | null>(null);

    const menuItems = [
        { name: 'My Shop', icon: 'storefront', href: '/manage/my-shop' },
        { name: 'My Menu', icon: 'menu_book', href: '/manage/menu' },
        { name: 'Recharge', icon: 'bolt', href: '/manage/recharge' },
        { name: 'Settings', icon: 'settings', href: '/manage/settings' },
    ];

    const handleSignOut = async () => {
        await signOut();
        router.push('/manage');
    };

    // Get display name and avatar initial from profile or user metadata
    const userName = profile?.full_name || user?.user_metadata?.full_name || '';
    const userEmail = user?.email || '';
    const userAvatar = profile?.avatar_url || user?.user_metadata?.avatar_url || '';
    const displayName = userName || userEmail;
    const avatarLetter = displayName.charAt(0).toUpperCase();

    React.useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                // Fetch Profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                }

                // Fetch sub
                const { data: sub } = await supabase
                    .from('user_subscriptions')
                    .select('store_plan, shop_limit, store_expires_at')
                    .eq('user_id', user.id)
                    .single();

                if (!sub) { setLoading(false); return; }

                // Count sites logic...
                const { data: sites } = await supabase
                    .from('sites')
                    .select('id, type')
                    .eq('user_id', user.id);

                const shopCount = sites?.filter(s => s.type === 'Shop').length || 0;

                const now = new Date();
                const expiresAt = new Date(sub.store_expires_at);
                const isExpired = expiresAt < now;
                const limit = sub.shop_limit || 0;

                if (isExpired || shopCount >= limit) {
                    setIsLimitReached(true);
                } else {
                    setIsLimitReached(false);
                }

                // AUTO-FIX: Call ownership fix to ensure backend counts match frontend visibility
                // Fire and forget, don't block UI
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    fetch('/api/debug/fix-ownership', {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    }).catch(err => console.error('Fix ownership failed', err));
                }

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    return (
        <aside className="hidden md:flex w-64 flex-col border-r border-gray-100 bg-white">
            <div className="flex h-full flex-col justify-between p-4">
                <div className="flex flex-col gap-4">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer mb-2">
                        <div
                            className="flex items-center justify-center rounded-full size-12 shadow-sm border border-gray-100 bg-blue-600 text-white font-bold text-lg overflow-hidden shrink-0"
                        >
                            {userAvatar ? (
                                <img src={userAvatar} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                                avatarLetter
                            )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <h1 className="text-[#111418] text-sm font-semibold leading-normal truncate">
                                {displayName}
                            </h1>
                            <p className="text-gray-500 text-xs font-normal leading-normal truncate">
                                {userEmail}
                            </p>
                        </div>
                    </div>

                    <nav className="flex flex-col gap-1">
                        {/* Create Site Action - Special Styling */}
                        <button
                            className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#f0f2f4] hover:bg-gray-200 transition-colors group w-full text-left mb-2"
                            onClick={openModal}
                        >
                            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: '24px' }}>add_circle</span>
                            <div className="flex flex-col">
                                <p className="text-[#111418] text-sm font-medium leading-normal">Create Site</p>
                            </div>
                        </button>

                        {menuItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${pathname === item.href
                                    ? 'bg-blue-50'
                                    : 'hover:bg-gray-50'
                                    }`}
                            >
                                <span
                                    className={`material-symbols-outlined transition-colors ${pathname === item.href
                                        ? 'text-primary'
                                        : 'text-gray-500 group-hover:text-[#111418]'
                                        }`}
                                    style={{ fontSize: '24px' }}
                                >
                                    {item.icon}
                                </span>
                                <p
                                    className={`text-sm font-medium leading-normal transition-colors ${pathname === item.href
                                        ? 'text-primary'
                                        : 'text-gray-500 group-hover:text-[#111418]'
                                        }`}
                                >
                                    {item.name}
                                </p>
                            </Link>
                        ))}
                    </nav>
                </div>

                <button
                    onClick={handleSignOut}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-4 bg-gray-100 hover:bg-red-50 hover:text-red-600 transition-colors text-gray-600 text-sm font-bold leading-normal tracking-[0.015em]"
                >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    <span className="truncate">Sign Out</span>
                </button>
            </div>
        </aside>
    );
}
