'use client';

import React, { useEffect, useRef, useState } from 'react';
import { firebaseAuth } from '@/lib/auth/firebase';
import { cleanOwnerName } from '@/lib/auth/ownerName';

/**
 * "What should we call you?" — sets or changes the owner's own name.
 *
 * Opened from the dashboard header ("Add your name" when none is stored) and
 * from the You tab. Saves through PUT /api/profile/name, the same validation
 * the server applies, so what the owner sees accepted is what gets stored.
 */
export default function OwnerNameDialog({
    open,
    initialName,
    onClose,
    onSaved,
}: {
    open: boolean;
    initialName: string;
    onClose: () => void;
    onSaved: (name: string) => void;
}) {
    const [name, setName] = useState(initialName);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return;
        setName(initialName);
        setError('');
        // After paint, so the sheet is on screen before the keyboard opens.
        const t = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(t);
    }, [open, initialName]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, saving, onClose]);

    if (!open) return null;

    const save = async () => {
        const clean = cleanOwnerName(name);
        if (!clean) { setError('Enter your name in letters, up to 60 characters.'); return; }
        const current = firebaseAuth.currentUser;
        if (!current) { setError('Your session ended. Please sign in again.'); return; }
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/profile/name', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await current.getIdToken()}` },
                body: JSON.stringify({ name: clean }),
            });
            const body = (await res.json().catch(() => ({}))) as { error?: string; name?: string };
            if (!res.ok) { setError(body.error ?? 'Could not save your name. Please try again.'); return; }
            onSaved(body.name ?? clean);
            onClose();
        } catch {
            setError('Network error. Please check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 flex items-end sm:items-center justify-center"
            style={{ zIndex: 210, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="owner-name-title"
                data-testid="owner-name-dialog"
                className="sm:rounded-2xl sm:mx-4"
                style={{ background: '#FFFFFF', borderRadius: '16px 16px 0 0', width: '100%', maxWidth: 380, padding: '24px 24px 28px' }}
            >
                <p id="owner-name-title" className="font-semibold text-[#0A0A0A]" style={{ fontSize: 17 }}>What should we call you?</p>
                <p className="text-[#52525C]" style={{ fontSize: 13, lineHeight: '20px', marginTop: 4 }}>
                    Your name shows on your dashboard. Customers do not see it.
                </p>
                <label htmlFor="owner-name-input" className="block text-[#0A0A0A]" style={{ fontSize: 13, fontWeight: 500, marginTop: 16, marginBottom: 6 }}>
                    Your name
                </label>
                <input
                    id="owner-name-input"
                    ref={inputRef}
                    type="text"
                    autoComplete="name"
                    maxLength={60}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
                    placeholder="Eg. Priya Raman"
                    className="w-full outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    style={{ border: '1px solid #E4E4E7', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: '#0A0A0A' }}
                />
                {error && <p role="alert" style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{error}</p>}
                <div className="flex gap-2" style={{ marginTop: 20 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        style={{ flex: 1, height: 44, borderRadius: 10, fontSize: 14, fontWeight: 500, border: '1px solid #E4E4E7', background: '#FFFFFF', color: '#52525C', cursor: saving ? 'not-allowed' : 'pointer' }}
                    >
                        Not now
                    </button>
                    <button
                        type="button"
                        onClick={() => { void save(); }}
                        disabled={saving}
                        className="bg-primary hover:bg-primary-dark"
                        style={{ flex: 1, height: 44, borderRadius: 10, fontSize: 14, fontWeight: 600, border: 'none', color: '#FFFFFF', cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.85 : 1 }}
                    >
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
