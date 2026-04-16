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
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<{ user: AuthUser } | null>(null);
    const [loading, setLoading] = useState(true);
    const confirmationResultRef = useRef<ConfirmationResult | null>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

    // Sync Firebase ID token as sb-access-token cookie so middleware can gate routes
    const syncCookie = async (firebaseUser: FirebaseUser | null) => {
        if (typeof document === 'undefined') return;

        // Use Secure flag on HTTPS (production), omit on HTTP (local dev)
        const secure = window.location.protocol === 'https:' ? '; Secure' : '';

        if (firebaseUser) {
            try {
                const token = await firebaseUser.getIdToken();

                // Decode exp from the JWT payload so the cookie lifetime
                // matches the token's actual expiry — no hardcoded magic numbers
                const payloadB64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
                const payload = JSON.parse(atob(payloadB64 + '='.repeat((4 - payloadB64.length % 4) % 4)));
                const maxAge = typeof payload.exp === 'number'
                    ? Math.max(0, payload.exp - Math.floor(Date.now() / 1000))
                    : 3600;

                document.cookie = `sb-access-token=${token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
            } catch {
                // Token fetch failed — clear cookie
                document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax${secure}`;
            }
        } else {
            document.cookie = `sb-access-token=; path=/; max-age=0; SameSite=Lax${secure}`;
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

    const initRecaptcha = () => {
        if (recaptchaVerifierRef.current) return;
        // Bypass reCAPTCHA when using Firebase Console test phone numbers
        if (process.env.NEXT_PUBLIC_FIREBASE_USE_TEST_NUMBERS === 'true') {
            firebaseAuth.settings.appVerificationDisabledForTesting = true;
        }
        recaptchaVerifierRef.current = new RecaptchaVerifier(
            firebaseAuth,
            'recaptcha-container',
            { size: 'invisible' }
        );
    };

    const sendOTP = async (phone: string): Promise<{ error: string | null }> => {
        try {
            initRecaptcha();
            const confirmation = await signInWithPhoneNumber(
                firebaseAuth,
                phone,
                recaptchaVerifierRef.current!
            );
            confirmationResultRef.current = confirmation;
            // Verifier is consumed after one use — clear so next sendOTP creates a fresh one
            recaptchaVerifierRef.current?.clear();
            recaptchaVerifierRef.current = null;
            return { error: null };
        } catch (err: unknown) {
            recaptchaVerifierRef.current?.clear();
            recaptchaVerifierRef.current = null;
            const message = err instanceof Error ? err.message : 'Failed to send OTP';
            return { error: message };
        }
    };

    const verifyOTP = async (otp: string, name?: string): Promise<{ error: string | null; isNewUser: boolean }> => {
        if (!confirmationResultRef.current) {
            return { error: 'Please request an OTP first', isNewUser: false };
        }
        try {
            const credential = await confirmationResultRef.current.confirm(otp);
            const firebaseUser = credential.user;

            const isNewUser = await provisionNewUser(firebaseUser.uid, firebaseUser.phoneNumber, name);

            return { error: null, isNewUser };
        } catch (err: unknown) {
            console.error('[verifyOTP error]', err);
            const message = err instanceof Error ? err.message : 'Invalid OTP. Please try again.';
            return { error: message, isNewUser: false };
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

        await supabase.from('profiles').insert({
            id: uid,
            full_name: name ?? phone ?? '',
            contact_email: '',
            onboarding_completed: false,
            updated_at: new Date().toISOString(),
        });

        await supabase.from('user_subscriptions').insert({
            user_id: uid,
            store_plan: 'base',
            menu_plan: 'menu_base',
            shop_limit: 0,
            menu_limit: 0,
            store_expires_at: new Date().toISOString(),
            menu_expires_at: new Date().toISOString(),
        });

        return true;
    };

    const signOut = async () => {
        await firebaseSignOut(firebaseAuth);
        // onAuthStateChanged will fire and clear user/session/cookie
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, sendOTP, verifyOTP, signOut }}>
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
