'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { toIndianE164 } from '@/lib/auth/phoneNumber';
import { readablePhone } from '@/lib/platform/phone';

/**
 * "Change your number" — the owner's sign-in number, for a new SIM or a lost
 * phone. Two steps: type the new number (an OTP goes to it), then enter the
 * code. The login and profiles.phone_number change together; WhatsApp messages
 * follow the new number. The store's public contact number is not touched: it
 * has its own field under Store details.
 */
export default function OwnerPhoneDialog({
    open,
    currentPhone,
    onClose,
    onChanged,
}: {
    open: boolean;
    currentPhone: string | null;
    onClose: () => void;
    onChanged: (phone: string) => void;
}) {
    const { startPhoneChange, confirmPhoneChange } = useAuth();
    const [step, setStep] = useState<'number' | 'otp'>('number');
    const [digits, setDigits] = useState('');
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setStep('number'); setDigits(''); setCode(''); setError(''); setBusy(false);
        const t = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, busy, onClose]);

    if (!open) return null;

    const e164 = toIndianE164(digits);
    const sameAsCurrent = !!e164 && e164 === currentPhone;

    const sendCode = async () => {
        if (!e164) { setError('Enter a valid 10-digit mobile number.'); return; }
        if (sameAsCurrent) { setError('This is already your number.'); return; }
        setBusy(true); setError('');
        const { error: err } = await startPhoneChange(e164);
        setBusy(false);
        if (err) { setError(err); return; }
        setStep('otp'); setCode('');
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const confirm = async () => {
        if (code.length !== 6) { setError('Enter the 6-digit code.'); return; }
        setBusy(true); setError('');
        const { error: err, phone } = await confirmPhoneChange(code);
        setBusy(false);
        if (err || !phone) { setError(err ?? 'Something went wrong. Please try again.'); setCode(''); return; }
        onChanged(phone);
        onClose();
    };

    const primary = { flex: 1, height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', color: '#FFFFFF', cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.85 : 1 } as const;

    return (
        <div
            className="fixed inset-0 flex items-end sm:items-center justify-center"
            style={{ zIndex: 210, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="owner-phone-title"
                data-testid="owner-phone-dialog"
                className="sm:rounded-2xl sm:mx-4"
                style={{ background: '#FFFFFF', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 380, padding: '24px 24px 28px' }}
            >
                <p id="owner-phone-title" className="font-semibold text-[#0A0A0A]" style={{ fontSize: 17 }}>
                    {step === 'number' ? 'Change your number' : 'Enter the code'}
                </p>
                {step === 'number' ? (
                    <>
                        <p className="text-[#52525C]" style={{ fontSize: 13, lineHeight: '20px', marginTop: 4 }}>
                            This is the number you sign in with and where we send WhatsApp updates.
                            {currentPhone ? ` Now: ${readablePhone(currentPhone)}.` : ''} We will send a code to the new number.
                        </p>
                        <label htmlFor="owner-phone-input" className="block text-[#0A0A0A]" style={{ fontSize: 13, fontWeight: 500, marginTop: 16, marginBottom: 6 }}>
                            New mobile number
                        </label>
                        <div className="flex overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20" style={{ border: '1px solid #E4E4E7', borderRadius: 10 }}>
                            <span style={{ padding: '11px 12px', fontSize: 14, fontWeight: 500, color: '#52525C', background: '#FAFAFA', borderRight: '1px solid #E4E4E7' }}>+91</span>
                            <input
                                id="owner-phone-input"
                                ref={inputRef}
                                type="tel"
                                inputMode="numeric"
                                autoComplete="tel-national"
                                value={digits}
                                onChange={(e) => { setDigits(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                                onKeyDown={(e) => { if (e.key === 'Enter') void sendCode(); }}
                                placeholder="Eg. 9876543210"
                                className="flex-1 outline-none"
                                style={{ padding: '11px 12px', fontSize: 15, color: '#0A0A0A', minWidth: 0 }}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        <p className="text-[#52525C]" style={{ fontSize: 13, lineHeight: '20px', marginTop: 4 }}>
                            We sent a 6-digit code to +91 {digits}.
                        </p>
                        <label htmlFor="owner-phone-otp" className="block text-[#0A0A0A]" style={{ fontSize: 13, fontWeight: 500, marginTop: 16, marginBottom: 6 }}>
                            OTP
                        </label>
                        <input
                            id="owner-phone-otp"
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={code}
                            onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') void confirm(); }}
                            className="w-full outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                            style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: '11px 14px', fontSize: 18, letterSpacing: '0.3em', color: '#0A0A0A' }}
                        />
                    </>
                )}
                {error && <p role="alert" style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</p>}
                <div className="flex gap-2" style={{ marginTop: 20 }}>
                    <button
                        type="button"
                        onClick={step === 'otp' ? () => { setStep('number'); setError(''); } : onClose}
                        disabled={busy}
                        style={{ flex: 1, height: 44, borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1px solid #E4E4E7', background: '#FFFFFF', color: '#52525C', cursor: busy ? 'not-allowed' : 'pointer' }}
                    >
                        {step === 'otp' ? 'Edit number' : 'Cancel'}
                    </button>
                    <button
                        type="button"
                        onClick={() => { void (step === 'number' ? sendCode() : confirm()); }}
                        disabled={busy}
                        className="bg-primary hover:bg-primary-dark"
                        style={primary}
                    >
                        {busy ? (step === 'number' ? 'Sending…' : 'Checking…') : step === 'number' ? 'Send code' : 'Confirm'}
                    </button>
                </div>
                <div id="recaptcha-container-phone" />
            </div>
        </div>
    );
}
