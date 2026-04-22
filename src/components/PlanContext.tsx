'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type Plan = 'qr_menu' | 'base' | 'pro' | 'pay_eat' | string;

interface PlanContextType {
    plan: Plan;
    planLoading: boolean;
    /** true for pro / pay_eat — full feature access */
    isPayEat: boolean;
    /** true for qr_menu / base — limited access */
    isQrMenu: boolean;
    /** days remaining in trial (0 if expired or no trial) */
    trialDaysLeft: number;
    /** trial window is still open */
    isTrialActive: boolean;
    /** trial has ended AND no active paid subscription */
    isTrialExpired: boolean;
    /** has a paid subscription with store_expires_at in the future */
    isSubscribed: boolean;
    /** menu can be live: trial active OR subscribed */
    canGoLive: boolean;
}

const PlanContext = createContext<PlanContextType>({
    plan: 'qr_menu',
    planLoading: true,
    isPayEat: false,
    isQrMenu: true,
    trialDaysLeft: 0,
    isTrialActive: false,
    isTrialExpired: false,
    isSubscribed: false,
    canGoLive: false,
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [plan, setPlan] = useState<Plan>('qr_menu');
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
    const [storeExpiresAt, setStoreExpiresAt] = useState<string | null>(null);
    const [planLoading, setPlanLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('user_subscriptions')
            .select('store_plan, store_expires_at, trial_ends_at')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.store_plan) setPlan(data.store_plan);
                setTrialEndsAt(data?.trial_ends_at ?? null);
                setStoreExpiresAt(data?.store_expires_at ?? null);
                setPlanLoading(false);
            });
    }, [user]);

    const now = Date.now();
    const trialEndsMs = trialEndsAt ? new Date(trialEndsAt).getTime() : 0;
    const subEndsMs = storeExpiresAt ? new Date(storeExpiresAt).getTime() : 0;

    const isTrialActive = trialEndsMs > now;
    const isSubscribed = subEndsMs > now;
    const trialDaysLeft = isTrialActive
        ? Math.ceil((trialEndsMs - now) / (1000 * 60 * 60 * 24))
        : 0;
    const isTrialExpired = !isTrialActive && !isSubscribed;
    const canGoLive = isTrialActive || isSubscribed;

    const isPayEat = plan === 'pro' || plan === 'pay_eat';
    const isQrMenu = !isPayEat;

    return (
        <PlanContext.Provider value={{
            plan, planLoading, isPayEat, isQrMenu,
            trialDaysLeft, isTrialActive, isTrialExpired, isSubscribed, canGoLive,
        }}>
            {children}
        </PlanContext.Provider>
    );
}

export function usePlan() {
    return useContext(PlanContext);
}
