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
}

const PlanContext = createContext<PlanContextType>({
    plan: 'qr_menu',
    planLoading: true,
    isPayEat: false,
    isQrMenu: true,
});

export function PlanProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [plan, setPlan] = useState<Plan>('qr_menu');
    const [planLoading, setPlanLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('user_subscriptions')
            .select('store_plan')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.store_plan) setPlan(data.store_plan);
                setPlanLoading(false);
            });
    }, [user]);

    const isPayEat = plan === 'pro' || plan === 'pay_eat';
    const isQrMenu = !isPayEat;

    return (
        <PlanContext.Provider value={{ plan, planLoading, isPayEat, isQrMenu }}>
            {children}
        </PlanContext.Provider>
    );
}

export function usePlan() {
    return useContext(PlanContext);
}
