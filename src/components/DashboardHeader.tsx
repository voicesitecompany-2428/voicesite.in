'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface SubscriptionData {
    id: string;
    // plan: 'base' | 'pro' | 'menu_base' | 'menu_pro'; // Deprecated
    store_plan: 'base' | 'pro';
    menu_plan: 'menu_base' | 'menu_pro';
    shop_limit: number;
    menu_limit: number;
    // price_monthly: number; // Deprecated - tracked per plan type if needed
    store_expires_at: string;
    menu_expires_at: string;
}

export default function DashboardHeader() {
    const router = useRouter();
    const { user } = useAuth();
    const [sub, setSub] = useState<SubscriptionData | null>(null);
    const [shopsUsed, setShopsUsed] = useState(0);
    const [menusUsed, setMenusUsed] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!user) return;

        // Fetch subscription
        let { data: subData } = await supabase
            .from('user_subscriptions')
            .select('id, store_plan, menu_plan, shop_limit, menu_limit, store_expires_at, menu_expires_at')
            .eq('user_id', user.id)
            .single();

        // If no subscription exists, create a default one
        if (!subData) {
            const { data: newSub, error: createError } = await supabase
                .from('user_subscriptions')
                .insert({
                    user_id: user.id,
                    store_plan: 'base',
                    menu_plan: 'menu_base',
                    shop_limit: 0,
                    menu_limit: 0,
                    // price_monthly: 349, // handled via context usually
                    store_expires_at: new Date().toISOString(),
                    menu_expires_at: new Date().toISOString() // Menu starts expired/inactive? Or give trial? Let's give trial if that's the pattern. Or just default.
                    // Actually, let's keep consistent with AuthContext which sets store as primary.
                })
                .select('id, store_plan, menu_plan, shop_limit, menu_limit, store_expires_at, menu_expires_at')
                .single();

            if (newSub) {
                subData = newSub;
            } else if (createError) {
                console.error('Failed to create default subscription:', createError);
            }
        }

        if (subData) setSub(subData as SubscriptionData);

        // Count existing sites
        const { data: userSites } = await supabase
            .from('sites')
            .select('id, type')
            .eq('user_id', user.id);

        if (userSites) {
            const shopCount = userSites.filter(s => s.type === 'Shop').length;
            const menuCount = userSites.filter(s => s.type === 'Menu').length;
            setShopsUsed(shopCount);
            setMenusUsed(menuCount);
        }

        setLoading(false);
    };

    useEffect(() => {
        if (!user) return;

        fetchData();

        // Realtime Subscription Listener
        const channel = supabase
            .channel('header_sub_updates')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_subscriptions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newSub = payload.new as SubscriptionData;
                    setSub(newSub);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    if (loading) {
        return (
            <div className="border-b border-gray-100 bg-white px-4 py-3 md:px-6">
                <div className="flex items-center gap-3">
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                    <div className="h-4 w-32 animate-pulse rounded bg-gray-100"></div>
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-100"></div>
                </div>
            </div>
        );
    }

    if (!sub) return null;

    // Helper for days left
    const getDaysLeft = (expiry: string) => Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    const storeDays = getDaysLeft(sub.store_expires_at);
    const menuDays = getDaysLeft(sub.menu_expires_at);

    const getStoreLabel = (plan: string) => plan === 'pro' ? 'Pro Store' : 'Base Store';
    const getMenuLabel = (plan: string) => plan === 'menu_pro' ? 'Menu Pro' : 'Menu Starter';

    const storeExpiring = storeDays <= 7;
    const menuExpiring = menuDays <= 7;

    return (
        <div className="border-b border-gray-100 bg-white px-3 py-2 md:px-6 md:py-3">
            <div className="flex flex-col gap-2">
                {/* Row 1: Limit Cards (Grid) */}
                <div className="grid grid-cols-2 gap-2 w-full">
                    {/* Shop Credits */}
                    <div className="flex items-center gap-2 rounded-xl bg-[#f0f2f4] px-2.5 py-2 overflow-hidden">
                        <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '20px' }}>storefront</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">Store</span>
                                <span className="text-xs font-bold text-[#111418]">{shopsUsed}/{sub.shop_limit}</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${shopsUsed >= sub.shop_limit ? 'bg-orange-500' : 'bg-primary'}`}
                                    style={{ width: `${sub.shop_limit > 0 ? (shopsUsed / sub.shop_limit) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Menu Credits */}
                    <div className="flex items-center gap-2 rounded-xl bg-[#f0f2f4] px-2.5 py-2 overflow-hidden">
                        <span className="material-symbols-outlined text-blue-600 shrink-0" style={{ fontSize: '20px' }}>menu_book</span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide truncate">Menu</span>
                                <span className="text-xs font-bold text-[#111418]">{menusUsed}/{sub.menu_limit}</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${menusUsed >= sub.menu_limit ? 'bg-orange-500' : 'bg-blue-500'}`}
                                    style={{ width: `${sub.menu_limit > 0 ? (menusUsed / sub.menu_limit) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Status & Actions */}
                <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Store Expiry Badge */}
                        {sub.shop_limit > 0 && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-medium whitespace-nowrap ${storeExpiring ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                <span className="material-symbols-outlined text-[14px]">{storeExpiring ? 'history' : 'history'}</span>
                                {`Store: ${storeDays}d left`}
                            </div>
                        )}

                        {/* Menu Expiry Badge - Only show if menu plan active */}
                        {sub.menu_limit > 0 && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-medium whitespace-nowrap ${menuExpiring ? 'bg-red-50 border-red-100 text-red-600' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                                <span className="material-symbols-outlined text-[14px]">{menuExpiring ? 'history' : 'history'}</span>
                                {`Menu: ${menuDays}d left`}
                            </div>
                        )}
                    </div>



                </div>
            </div>
        </div>
    );
}
