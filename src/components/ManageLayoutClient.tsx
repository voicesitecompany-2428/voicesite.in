'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { AuthProvider, useAuth } from './AuthContext';
import { PlanProvider } from './PlanContext';
import { SiteProvider, useSite } from './SiteContext';
import { NotificationProvider } from './NotificationContext';
import DashboardHeader from './DashboardHeader';
import TrialBanner from './manage/TrialBanner';
import { supabase } from '@/lib/supabase';

function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const { allSites, sitesLoading } = useSite();
    const router = useRouter();
    const [profileChecked, setProfileChecked] = React.useState(false);

    // Redirect unauthenticated users to login
    React.useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading, router]);

    // Check onboarding completion — runs once per authenticated session
    React.useEffect(() => {
        if (loading || !user) return;

        setProfileChecked(false);
        supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    setProfileChecked(true);
                    return;
                }
                if (!data.onboarding_completed) {
                    router.replace('/onboarding');
                } else {
                    setProfileChecked(true);
                }
            });
    // user.id is the stable identifier — no need to re-run when full user object ref changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, loading, router]);

    // If onboarding was completed but the user deleted all their stores, send them back
    React.useEffect(() => {
        if (!profileChecked || sitesLoading) return;
        if (allSites.length === 0) {
            router.replace('/onboarding');
        }
    }, [profileChecked, sitesLoading, allSites.length, router]);

    if (loading || (user && !profileChecked) || (profileChecked && sitesLoading)) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return <>{children}</>;
}

function ManageShell({ children }: { children: React.ReactNode }) {
    return (
        <AuthGate>
            <div className="relative flex h-screen w-full overflow-hidden bg-white font-display text-neutral-900 antialiased">
                <Sidebar />
                <main className="flex-1 h-full overflow-y-auto pb-20 md:pb-0">
                    <DashboardHeader />
                    <TrialBanner />
                    {children}
                </main>
                <MobileNav />
            </div>
        </AuthGate>
    );
}

export default function ManageLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <PlanProvider>
                <SiteProvider>
                    <NotificationProvider>
                        <ManageShell>{children}</ManageShell>
                    </NotificationProvider>
                </SiteProvider>
            </PlanProvider>
        </AuthProvider>
    );
}
