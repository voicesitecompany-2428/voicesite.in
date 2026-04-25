'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export interface SiteEntry {
    id: string;
    slug: string;
    name: string;
    image_url: string | null;
    is_live: boolean;
    type: string;
}

interface SiteContextType {
    activeSite: SiteEntry | null;
    allSites: SiteEntry[];
    sitesLoading: boolean;
    setActiveSiteId: (id: string) => void;
    refreshSites: () => Promise<void>;
}

const SiteContext = createContext<SiteContextType>({
    activeSite: null,
    allSites: [],
    sitesLoading: true,
    setActiveSiteId: () => {},
    refreshSites: async () => {},
});

export function SiteProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [allSites, setAllSites]           = useState<SiteEntry[]>([]);
    const [activeSiteId, setActiveSiteIdRaw] = useState<string | null>(null);
    const [sitesLoading, setSitesLoading]   = useState(true);

    const fetchSites = useCallback(async () => {
        if (!user) {
            // Reset on logout so stale sites don't show for next user
            setAllSites([]);
            setActiveSiteIdRaw(null);
            setSitesLoading(false);
            return;
        }
        setSitesLoading(true);

        const { data } = await supabase
            .from('sites')
            .select('id, slug, name, image_url, is_live, type')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        const sites = (data ?? []) as SiteEntry[];
        setAllSites(sites);

        // Restore persisted selection, fall back to first site
        const stored = typeof window !== 'undefined'
            ? localStorage.getItem(`activeSiteId_${user.id}`)
            : null;

        if (stored && sites.find(s => s.id === stored)) {
            setActiveSiteIdRaw(stored);
        } else if (sites.length > 0) {
            setActiveSiteIdRaw(sites[0].id);
            if (typeof window !== 'undefined') {
                localStorage.setItem(`activeSiteId_${user.id}`, sites[0].id);
            }
        }
        setSitesLoading(false);
    }, [user]);

    useEffect(() => {
        // Cancellation flag — prevents stale fetch from overwriting state when
        // user changes (logout / different account) while the fetch is in flight.
        let cancelled = false;
        (async () => {
            await fetchSites();
            if (cancelled) {
                // If user changed during the fetch, reset to a clean state — the
                // re-run of fetchSites for the new user will populate correctly.
                setAllSites([]);
            }
        })();
        return () => { cancelled = true; };
    }, [fetchSites]);

    // ── Realtime: keep allSites in sync with the DB without page reload ──────
    // When the user toggles store status from another tab/device, or another
    // teammate edits the store, this updates live. Filtered to the current
    // user only so we don't pay for traffic of other users' rows.
    useRealtimeTable<SiteEntry>({
        table: 'sites',
        filter: user ? `user_id=eq.${user.id}` : undefined,
        enabled: !!user,
        onChange: (payload) => {
            setAllSites(prev => {
                if (payload.eventType === 'DELETE') {
                    const oldRow = payload.old as { id?: string };
                    return oldRow.id ? prev.filter(s => s.id !== oldRow.id) : prev;
                }
                const next = payload.new as SiteEntry;
                if (!next?.id) return prev;
                const existing = prev.findIndex(s => s.id === next.id);
                if (existing === -1) return [...prev, next];
                const copy = prev.slice();
                copy[existing] = { ...copy[existing], ...next };
                return copy;
            });
        },
    });

    const setActiveSiteId = useCallback((id: string) => {
        setActiveSiteIdRaw(id);
        if (user && typeof window !== 'undefined') {
            localStorage.setItem(`activeSiteId_${user.id}`, id);
        }
    }, [user]);

    const activeSite = allSites.find(s => s.id === activeSiteId) ?? null;

    return (
        <SiteContext.Provider value={{ activeSite, allSites, sitesLoading, setActiveSiteId, refreshSites: fetchSites }}>
            {children}
        </SiteContext.Provider>
    );
}

export function useSite() {
    return useContext(SiteContext);
}
