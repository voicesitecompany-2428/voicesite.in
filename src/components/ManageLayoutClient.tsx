'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { AuthProvider, useAuth } from './AuthContext';
import { OnboardingProvider, useOnboarding } from './OnboardingContext';
import OnboardingModal from './OnboardingModal';
import DashboardHeader from './DashboardHeader';

function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    // The /manage page is the login page — don't block it
    const isLoginPage = pathname === '/manage';

    React.useEffect(() => {
        if (!loading && !user && !isLoginPage) {
            router.replace('/manage');
        }
        // If user is already logged in and on login page, redirect to dashboard
        if (!loading && user && isLoginPage) {
            router.replace('/manage/dashboard');
        }
    }, [user, loading, router, isLoginPage]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light">
                <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    // On login page: show children regardless (login form handles its own auth)
    if (isLoginPage) return <>{children}</>;

    // On protected pages: only show if authenticated
    if (!user) return null;

    return <>{children}</>;
}

function ManageShell({ children }: { children: React.ReactNode }) {
    const { isModalOpen, closeModal } = useOnboarding();
    const pathname = usePathname();
    const isLoginPage = pathname === '/manage';

    // Login page renders standalone — no sidebar, no mobile nav
    if (isLoginPage) {
        return (
            <AuthGate>
                {children}
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            <div className="relative flex h-screen w-full overflow-hidden bg-background-light font-display text-[#111418] antialiased">
                <Sidebar />
                <main className="flex-1 h-full overflow-y-auto pb-20 md:pb-0">
                    <DashboardHeader />
                    {children}
                </main>
                <MobileNav />
                <OnboardingModal isOpen={isModalOpen} onClose={closeModal} />
            </div>
        </AuthGate>
    );
}

export default function ManageLayoutClient({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <OnboardingProvider>
                <ManageShell>{children}</ManageShell>
            </OnboardingProvider>
        </AuthProvider>
    );
}
