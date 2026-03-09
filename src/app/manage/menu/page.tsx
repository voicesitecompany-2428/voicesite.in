'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';
import { PageSkeleton } from '@/components/Skeletons';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { hapticFeedback } from '@/utils/hapticFeedback';
import toast from 'react-hot-toast';
import { ShopCard } from '@/components/manage/ShopCard';

export default function MyMenuPage() {
    const { user } = useAuth();
    const [shops, setShops] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedShopId, setExpandedShopId] = useState<string | null>(null);
    const [subscription, setSubscription] = useState<any>(null);

    useEffect(() => {
        if (user) {
            fetchShops();
            fetchSubscription();
        }
    }, [user]);

    const fetchSubscription = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('user_subscriptions')
            .select('menu_plan, menu_limit')
            .eq('user_id', user.id)
            .single();
        if (data) setSubscription(data);
    };

    const fetchShops = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('sites')
                .select('*, products(*)')
                .eq('type', 'Menu')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setShops(data || []);
            if (data && data.length > 0 && !expandedShopId) {
                setExpandedShopId(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching menus:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleShopLive = async (id: string, currentStatus: boolean | undefined) => {
        const newStatus = !currentStatus;
        hapticFeedback('light');
        try {
            const { error } = await supabase
                .from('sites')
                .update({ is_live: newStatus })
                .eq('id', id);

            if (error) throw error;
            setShops(shops.map(s => s.id === id ? { ...s, is_live: newStatus } : s));
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const handleDeleteShop = async (shopId: string) => {
        hapticFeedback('medium');
        try {
            const { error } = await supabase.rpc('delete_site', { site_id: shopId });
            if (error) throw error;
            setShops(shops.filter(s => s.id !== shopId));
            setExpandedShopId(null);
        } catch (error) {
            console.error('Error deleting menu:', error);
            toast.error('Failed to delete menu');
        }
    };

    const refreshData = useCallback(async () => {
        await Promise.all([fetchShops(), fetchSubscription()]);
    }, [user]);

    const { refreshing, handleRefresh } = usePullToRefresh(refreshData);

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto pb-32 md:pb-8">
            <div className="flex items-center justify-between mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold">Menu Management</h1>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 active:scale-95"
                >
                    <span className={`material-symbols-outlined text-[18px] ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                    <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
            </div>

            <div className="space-y-6">
                {loading ? (
                    <PageSkeleton count={2} />
                ) : shops.length === 0 ? (
                    <div className="text-center p-12 bg-gray-50 rounded-xl border-dashed border-2 border-gray-200">
                        <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">restaurant_menu</span>
                        <p className="text-gray-500 text-lg font-medium">No menus found.</p>
                        <p className="text-gray-400 text-sm mt-2">Create one to get started!</p>
                    </div>
                ) : (
                    shops.map(shop => (
                        <ShopCard
                            key={shop.id}
                            shop={shop}
                            subscription={subscription}
                            siteType="Menu"
                            isExpanded={expandedShopId === shop.id}
                            onToggleExpand={() => setExpandedShopId(expandedShopId === shop.id ? null : shop.id)}
                            onToggleLive={() => toggleShopLive(shop.id, shop.is_live)}
                            onUpdate={fetchShops}
                            onDelete={() => handleDeleteShop(shop.id)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
