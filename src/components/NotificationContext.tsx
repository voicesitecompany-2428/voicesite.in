'use client';

/**
 * NotificationContext
 * Tracks app-wide notification dots shown in the sidebar / mobile nav.
 *
 * Dots:
 *  - Product Inventory  → # of products missing an image_url
 *  - Store Settings     → required fields incomplete (name, phone, description, timing, logo)
 *  - Banner Management  → always shown until user has at least 1 banner
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSite } from './SiteContext';

interface NotificationState {
    missingImageCount: number;   // products with no image
    settingsIncomplete: boolean; // store details not fully filled
    bannerDot: boolean;          // no banners yet
    refresh: () => void;         // call after user takes action to re-check
}

const Ctx = createContext<NotificationState>({
    missingImageCount: 0,
    settingsIncomplete: false,
    bannerDot: false,
    refresh: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { activeSite } = useSite();
    const [missingImageCount, setMissingImageCount] = useState(0);
    const [settingsIncomplete, setSettingsIncomplete] = useState(false);
    const [bannerDot, setBannerDot] = useState(false);

    const check = useCallback(async () => {
        if (!activeSite?.id) return;

        // 1. Products missing image
        const { count: missingCount } = await supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('site_id', activeSite.id)
            .or('image_url.is.null,image_url.eq.');
        setMissingImageCount(missingCount ?? 0);

        // 2. Settings completeness — check required site fields
        const { data: site } = await supabase
            .from('sites')
            .select('name, contact_number, description, timing, image_url')
            .eq('id', activeSite.id)
            .single();
        if (site) {
            const incomplete =
                !site.name?.trim() ||
                !site.contact_number?.trim() ||
                !site.description?.trim() ||
                !site.timing?.trim() ||
                !site.image_url;
            setSettingsIncomplete(incomplete);
        }

        // 3. Banner dot — any banners for this site?
        const { count: bannerCount } = await supabase
            .from('banners')
            .select('id', { count: 'exact', head: true })
            .eq('site_id', activeSite.id);
        setBannerDot((bannerCount ?? 0) === 0);
    }, [activeSite?.id]);

    useEffect(() => {
        check();
    }, [check]);

    return (
        <Ctx.Provider value={{ missingImageCount, settingsIncomplete, bannerDot, refresh: check }}>
            {children}
        </Ctx.Provider>
    );
}

export function useNotifications() {
    return useContext(Ctx);
}
