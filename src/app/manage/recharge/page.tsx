'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthContext';

interface SubscriptionData {
    id: string;
    // plan: 'base' | 'pro' | 'menu_base' | 'menu_pro'; // Deprecated
    store_plan: 'base' | 'pro';
    menu_plan: 'menu_base' | 'menu_pro';
    shop_limit: number;
    menu_limit: number;
    store_expires_at: string;
    menu_expires_at: string;
}

export default function RechargePage() {
    const { user } = useAuth();
    const [sub, setSub] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [planType, setPlanType] = useState<'store' | 'menu'>('store');
    const [selectedPlan, setSelectedPlan] = useState<string>('base');
    // Note: selectedPlan can be 'base'|'pro' OR 'menu_base'|'menu_pro' depending on tab

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            let { data: subData, error: fetchError } = await supabase
                .from('user_subscriptions')
                .select('id, store_plan, menu_plan, shop_limit, menu_limit, store_expires_at, menu_expires_at')
                .eq('user_id', user.id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            // Lazy create if missing (Legacy support or fresh users)
            if (!subData) {
                // ... (AuthContext handles this usually, but fallback here)
                const { data: newSub, error: createError } = await supabase
                    .from('user_subscriptions')
                    .insert({
                        user_id: user.id,
                        store_plan: 'base',
                        menu_plan: 'menu_base',
                        shop_limit: 1,
                        menu_limit: 0,
                        store_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                        menu_expires_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (createError) throw createError;
                if (newSub) subData = newSub;
            }

            if (subData) {
                setSub(subData as SubscriptionData);

                // Set initial selection based on CURRENT active tab's plan
                // But we default tab to 'store'.
                // If the user hasn't interated, we set state from DB.

                // Let's default selectedPlan to the current STORE plan initially
                // If they switch tabs, we update it.
                setSelectedPlan(subData.store_plan || 'base');
            } else {
                setError('Failed to initialize subscription.');
            }
        } catch (err: any) {
            console.error('Error loading subscription:', err);
            setError(err.message || 'Failed to load subscription.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    // Update selected plan when switching tabs
    useEffect(() => {
        if (!sub) return;
        if (planType === 'store') {
            setSelectedPlan(sub.store_plan || 'base');
        } else {
            setSelectedPlan(sub.menu_plan || 'menu_base');
        }
    }, [planType, sub]);

    const handleUpdateSubscription = async () => {
        if (!sub) return;
        setUpdating(true);

        const isStore = planType === 'store';
        const now = new Date();
        const newExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

        try {
            const updateData: any = {};

            if (isStore) {
                updateData.store_plan = selectedPlan;
                updateData.shop_limit = selectedPlan === 'pro' ? 2 : 1;
                updateData.store_expires_at = newExpiry;
            } else {
                updateData.menu_plan = selectedPlan;
                updateData.menu_limit = selectedPlan === 'menu_pro' ? 2 : 1; // 1 for base, 2 for pro
                updateData.menu_expires_at = newExpiry;
            }

            const { error } = await supabase
                .from('user_subscriptions')
                .update(updateData)
                .eq('id', sub.id);

            if (error) throw error;

            // Add to Billing History
            const planName = isStore ? selectedPlan + ' Store' : selectedPlan + ' Menu';
            const price = getPrice(selectedPlan); // We need to access getPrice logic, might need to hoist it or just duplicate simple logic or verify the price matches. 
            // Better to use the derived `finalPrice` logic logic or calculating it here.
            // Let's hoist price calculation or just duplicate for simplicity and safety without large refactor.
            const getPlanPrice = (p: string) => {
                switch (p) {
                    case 'base': return 349;
                    case 'pro': return 649;
                    case 'menu_base': return 249;
                    case 'menu_pro': return 449;
                    default: return 0;
                }
            };

            if (!user) throw new Error('User not authenticated');
            await supabase.from('billing_history').insert({
                user_id: user.id,
                plan_name: planName,
                amount: getPlanPrice(selectedPlan),
                status: 'Success'
            });

            await fetchData();
            alert('Plan updated successfully!');
        } catch (err) {
            console.error(err);
            alert('Failed to update plan.');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>;
    if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg m-6 border border-red-100">Error: {error} <button onClick={fetchData} className="ml-4 underline font-bold">Retry</button></div>;
    if (!sub) return null;

    // Derived State for UI
    const isStore = planType === 'store';
    const currentPlan = isStore ? sub.store_plan : sub.menu_plan;
    const expiresAt = isStore ? sub.store_expires_at : sub.menu_expires_at;

    // Pricing
    const getPrice = (plan: string) => {
        switch (plan) {
            case 'base': return 349;
            case 'pro': return 649;
            case 'menu_base': return 249;
            case 'menu_pro': return 449;
            default: return 0;
        }
    };
    const finalPrice = getPrice(selectedPlan);

    // Lock Logic
    const daysLeft = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const isPlanActive = daysLeft > 0;
    const limit = isStore ? sub.shop_limit : sub.menu_limit;

    return (
        <div className="container mx-auto max-w-5xl p-6">
            <h1 className="text-3xl font-black text-[#111418] mb-2">Recharge & Plans</h1>
            <p className="text-gray-500 mb-8">Choose the plan that suits your business needs.</p>

            {/* Active Plan Info Banner */}
            {isPlanActive && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <div>
                        <p className="font-bold text-[#111418] text-sm md:text-base">
                            Your {isStore ? 'Store' : 'Menu'} plan is active.
                        </p>
                        <p className="text-sm text-gray-600">
                            Expires on {new Date(expiresAt).toLocaleDateString()} ({daysLeft} days left).
                        </p>
                    </div>
                </div>
            )}

            {/* Expired Plan Info Banner (Only if they HAD a plan, i.e., limit > 0) */}
            {!isPlanActive && limit > 0 && (
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-yellow-600">warning</span>
                    <div>
                        <p className="font-bold text-[#111418] text-sm md:text-base">
                            Your {isStore ? 'Store' : 'Menu'} plan has ended.
                        </p>
                        <p className="text-sm text-gray-600">
                            Recharge now to continue using premium features.
                        </p>
                    </div>
                </div>
            )}

            {/* New User Banner (No active plan and NO history/limit) */}
            {!isPlanActive && limit === 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">rocket_launch</span>
                    <div>
                        <p className="font-bold text-[#111418] text-sm md:text-base">
                            Start your journey with {isStore ? 'Store' : 'Menu'} plans.
                        </p>
                        <p className="text-sm text-gray-600">
                            Choose a plan below to create your first {isStore ? 'store' : 'digital menu'}.
                        </p>
                    </div>
                </div>
            )}


            {/* Plan Type Toggles */}
            <div className="flex justify-center mb-10">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex relative">
                    <button
                        onClick={() => setPlanType('store')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${planType === 'store' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">storefront</span>
                        Online Store Plans
                    </button>
                    <button
                        onClick={() => setPlanType('menu')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${planType === 'menu' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">restaurant_menu</span>
                        Digital Menu Plans
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Select Plan */}
                <div className={`${isPlanActive ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-8`}>

                    {/* STORE PLANS */}
                    {planType === 'store' && (
                        <section>
                            <h2 className="text-lg font-bold text-[#111418] mb-4 flex items-center gap-2">
                                Select Store Plan {isPlanActive && <span className="text-sm font-normal text-gray-500">(Read Only)</span>}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Base Plan Card */}
                                <div
                                    onClick={() => !isPlanActive && setSelectedPlan('base')}
                                    className={`relative p-6 rounded-2xl border-2 transition-all ${selectedPlan === 'base' ? 'border-primary bg-blue-50/50' : 'border-gray-100 bg-white'} ${isPlanActive ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-gray-200'}`}
                                >
                                    {isStore && sub.store_plan === 'base' && sub.shop_limit > 0 && (
                                        <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl z-10">
                                            CURRENT PLAN
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-[#111418]">Base Store</h3>
                                            <p className="text-sm text-gray-500">For standard websites</p>
                                        </div>
                                        {selectedPlan === 'base' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </div>
                                    <div className="text-2xl font-bold text-[#111418] mb-4">₹349<span className="text-sm font-normal text-gray-400">/mo</span></div>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 1 Online Store (Shop Credit)</li>
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 10 Products limit</li>
                                    </ul>
                                </div>

                                {/* Pro Plan Card */}
                                <div
                                    onClick={() => !isPlanActive && setSelectedPlan('pro')}
                                    className={`relative p-6 rounded-2xl border-2 transition-all ${selectedPlan === 'pro' ? 'border-primary bg-blue-50/50' : 'border-gray-100 bg-white'} ${isPlanActive ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-gray-200'}`}
                                >
                                    {isStore && sub.store_plan === 'pro' && sub.shop_limit > 0 && (
                                        <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl z-10">
                                            CURRENT PLAN
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-[#111418]">Pro Store</h3>
                                            <p className="text-sm text-gray-500">For growing brands</p>
                                        </div>
                                        {selectedPlan === 'pro' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </div>
                                    <div className="text-2xl font-bold text-[#111418] mb-4">₹649<span className="text-sm font-normal text-gray-400">/mo</span></div>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 2 Online Stores (Shop Credits)</li>
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 15 Products limit</li>
                                    </ul>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* MENU PLANS */}
                    {planType === 'menu' && (
                        <section>
                            <h2 className="text-lg font-bold text-[#111418] mb-4 flex items-center gap-2">
                                Select Menu Plan {isPlanActive && <span className="text-sm font-normal text-gray-500">(Read Only)</span>}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Menu Starter Card */}
                                <div
                                    onClick={() => !isPlanActive && setSelectedPlan('menu_base')}
                                    className={`relative p-6 rounded-2xl border-2 transition-all ${selectedPlan === 'menu_base' ? 'border-primary bg-blue-50/50' : 'border-gray-100 bg-white'} ${isPlanActive ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-gray-200'}`}
                                >
                                    {!isStore && sub.menu_plan === 'menu_base' && sub.menu_limit > 0 && (
                                        <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl z-10">
                                            CURRENT PLAN
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-[#111418]">Menu Starter</h3>
                                            <p className="text-sm text-gray-500">Essential digital menu</p>
                                        </div>
                                        {selectedPlan === 'menu_base' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </div>
                                    <div className="text-2xl font-bold text-[#111418] mb-4">₹249<span className="text-sm font-normal text-gray-400">/mo</span></div>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 1 Digital Menu (Menu Credit)</li>
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 15 Items included</li>
                                    </ul>
                                </div>

                                {/* Menu Pro Card */}
                                <div
                                    onClick={() => !isPlanActive && setSelectedPlan('menu_pro')}
                                    className={`relative p-6 rounded-2xl border-2 transition-all ${selectedPlan === 'menu_pro' ? 'border-primary bg-blue-50/50' : 'border-gray-100 bg-white'} ${isPlanActive ? 'cursor-default opacity-90' : 'cursor-pointer hover:border-gray-200'}`}
                                >
                                    {!isStore && sub.menu_plan === 'menu_pro' && sub.menu_limit > 0 && (
                                        <div className="absolute top-0 right-0 bg-gray-900 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl z-10">
                                            CURRENT PLAN
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-[#111418]">Menu Pro</h3>
                                            <p className="text-sm text-gray-500">For larger menus</p>
                                        </div>
                                        {selectedPlan === 'menu_pro' && <span className="material-symbols-outlined text-primary">check_circle</span>}
                                    </div>
                                    <div className="text-2xl font-bold text-[#111418] mb-4">₹449<span className="text-sm font-normal text-gray-400">/mo</span></div>
                                    <ul className="space-y-3 text-sm text-gray-600">
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 2 Digital Menus (Menu Credits)</li>
                                        <li className="flex items-center gap-2"><span className="material-symbols-outlined text-green-500 text-[18px]">check</span> 20 Items per menu</li>
                                    </ul>
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* Right Column: Summary - Only if Not Active */}
                {!isPlanActive && (
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="text-xl font-black text-[#111418] mb-6">Summary</h3>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-[#111418] capitalize">
                                            {selectedPlan === 'base' ? 'Base Store Plan' :
                                                selectedPlan === 'pro' ? 'Pro Store Plan' :
                                                    selectedPlan === 'menu_base' ? 'Menu Starter Plan' : 'Menu Pro Plan'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {selectedPlan === 'base' ? '1 Shop Goal, 10 Products' :
                                                selectedPlan === 'pro' ? '2 Shop Goals, 15 Products' :
                                                    selectedPlan === 'menu_base' ? '1 Menu, 15 Items' : '2 Menus, 20 Items/menu'}
                                        </p>
                                    </div>
                                    <p className="font-bold">₹{finalPrice}</p>
                                </div>

                                <div className="h-px bg-gray-100 my-4"></div>

                                <div className="flex justify-between items-end">
                                    <p className="font-bold text-lg text-[#111418]">Total Monthly</p>
                                    <p className="font-black text-3xl text-primary">₹{finalPrice}</p>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateSubscription}
                                disabled={updating}
                                className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {updating ? 'Updating...' : `Recharge ${isStore ? 'Store' : 'Menu'} Plan`}
                            </button>

                            <p className="text-xs text-gray-400 text-center mt-4">
                                Your {isStore ? 'Store' : 'Menu'} plan will remain active for 30 days from purchase.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
