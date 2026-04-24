'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { firebaseAuth } from '@/lib/firebase';
import {
    signInWithPhoneNumber,
    RecaptchaVerifier,
    signOut as firebaseSignOut,
    onIdTokenChanged,
    type ConfirmationResult,
    type User as FirebaseUser,
} from 'firebase/auth';

const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Minimal user shape — all components only need `.id` and `.name`
interface AuthUser {
    id: string;
}

interface AuthContextType {
    user: AuthUser | null;
    // Kept for backward compat with components that use session.user.id
    session: { user: AuthUser } | null;
    loading: boolean;
    sendOTP: (phone: string) => Promise<{ error: string | null }>;
    verifyOTP: (otp: string, name?: string) => Promise<{ error: string | null; isNewUser: boolean }>;
    resetOTP: () => void;
    signOut: () => Promise<void>;
}

function friendlyAuthError(err: unknown): string {
    if (!(err instanceof Error)) return 'Something went wrong. Please try again.';
    const code = (err as { code?: string }).code ?? '';
    const map: Record<string, string> = {
        'auth/too-many-requests':    'Too many attempts. Please wait a few minutes and try again.',
        'auth/invalid-phone-number': 'Invalid phone number. Please check and try again.',
        'auth/invalid-verification-code': 'Incorrect OTP. Please try again.',
        'auth/code-expired':         'OTP has expired. Please request a new one.',
        'auth/session-expired':      'Session expired. Please request a new OTP.',
        'auth/quota-exceeded':       'SMS quota exceeded. Please try again later.',
        'auth/captcha-check-failed': 'Verification failed. Please refresh and try again.',
        'auth/invalid-app-credential': 'App verification failed. Please refresh and try again.',
        'auth/network-request-failed': 'Network error. Please check your connection.',
    };
    return map[code] ?? 'Something went wrong. Please try again.';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<{ user: AuthUser } | null>(null);
    const [loading, setLoading] = useState(true);
    const confirmationResultRef = useRef<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    // Sync Firebase ID token as HttpOnly cookie via server API so JS cannot read it
    const syncCookie = async (firebaseUser: FirebaseUser | null) => {
        if (typeof window === 'undefined') return;

        if (firebaseUser) {
            try {
                const token = await firebaseUser.getIdToken();
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
            } catch {
                // Network error — best-effort; middleware will reject the stale cookie
            }
        } else {
            try {
                await fetch('/api/auth/session', { method: 'DELETE' });
            } catch {
                // best-effort
            }
        }
    };

    useEffect(() => {
        // Listen to Firebase auth state — this is the source of truth
        const unsubscribe = onIdTokenChanged(firebaseAuth, async (firebaseUser) => {
            if (firebaseUser) {
                const authUser: AuthUser = { id: firebaseUser.uid };
                setUser(authUser);
                setSession({ user: authUser });
                await syncCookie(firebaseUser);
            } else {
                setUser(null);
                setSession(null);
                await syncCookie(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const resetOTP = () => {
        // Called when user clicks "edit number" — destroy the verifier so a
        // fresh one is created against the re-mounted DOM node on next send
        recaptchaVerifierRef.current?.clear();
        recaptchaVerifierRef.current = null;
        confirmationResultRef.current = null;
    };

    const sendOTP = async (phone: string): Promise<{ error: string | null }> => {
        try {
            if (isLocalhost) {
                firebaseAuth.settings.appVerificationDisabledForTesting = true;
            }

            if (!recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current = new RecaptchaVerifier(
                    firebaseAuth,
                    'recaptcha-container',
                    { size: 'invisible' }
                );
                await recaptchaVerifierRef.current.render();
            }

            const confirmation = await signInWithPhoneNumber(firebaseAuth, phone, recaptchaVerifierRef.current);
            confirmationResultRef.current = confirmation;
            return { error: null };
        } catch (err: unknown) {
            recaptchaVerifierRef.current?.clear();
            recaptchaVerifierRef.current = null;
            return { error: friendlyAuthError(err) };
        }
    };

    const verifyOTP = async (otp: string, name?: string): Promise<{ error: string | null; isNewUser: boolean }> => {
        if (!confirmationResultRef.current) {
            return { error: 'Please request an OTP first', isNewUser: false };
        }
        try {
            const credential = await confirmationResultRef.current.confirm(otp);
            const firebaseUser = credential.user;

            // Wait for cookie before returning — prevents middleware bouncing the redirect
            await syncCookie(firebaseUser);

            const isNewUser = await provisionNewUser(firebaseUser.uid, firebaseUser.phoneNumber, name);

            return { error: null, isNewUser };
        } catch (err: unknown) {
            return { error: friendlyAuthError(err), isNewUser: false };
        }
    };

    // Returns true if a new profile was created, false if the user already existed
    const provisionNewUser = async (uid: string, phone: string | null, name?: string): Promise<boolean> => {
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', uid)
            .single();

        if (existing) return false;

        const { error: profileError } = await supabase.from('profiles').insert({
            id: uid,
            full_name: name ?? phone ?? '',
            contact_email: '',
            onboarding_completed: false,
            updated_at: new Date().toISOString(),
        });
        if (profileError) throw new Error('Failed to create your profile. Please try again.');

        const { error: subError } = await supabase.from('user_subscriptions').insert({
            user_id: uid,
            store_plan: 'base',
            store_expires_at: new Date().toISOString(),
            product_limit: 0,
            banner_limit: 0,
            site_limit: 0,
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        if (subError) throw new Error('Failed to set up your account. Please try again.');

        return true;
    };

    const signOut = async () => {
        await firebaseSignOut(firebaseAuth);
        // onAuthStateChanged will fire and clear user/session/cookie
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, sendOTP, verifyOTP, resetOTP, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
