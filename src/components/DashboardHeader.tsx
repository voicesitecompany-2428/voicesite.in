'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { useSite } from './SiteContext';

export default function DashboardHeader() {
    const { user } = useAuth();
    const router = useRouter();
    const { activeSite, allSites, setActiveSiteId } = useSite();

    const [profile, setProfile] = useState<{ full_name: string } | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => { if (data) setProfile(data); });
    }, [user]);

    // Close dropdown on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        if (dropdownOpen) document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [dropdownOpen]);

    // Focus search input when opened
    useEffect(() => {
        if (searchOpen) searchRef.current?.focus();
    }, [searchOpen]);

    const displayName = profile?.full_name || 'User';
    const avatarLetter = displayName.charAt(0).toUpperCase();
    const avatarImg = activeSite?.image_url ?? null;

    const handleSwitchStore = (id: string) => {
        setActiveSiteId(id);
        setDropdownOpen(false);
    };

    return (
        <header className="bg-white border-b border-[#E5E7EB] shrink-0" style={{ height: 60 }}>

            {/* ── Normal row ── */}
            <div className={`flex items-center h-full ${searchOpen ? 'hidden' : 'flex'}`} style={{ padding: '0 16px', gap: 10 }}>

                {/* Store selector */}
                <div className="relative shrink-0" ref={dropdownRef}>
                    <button
                        onClick={() => setDropdownOpen(v => !v)}
                        className="flex items-center gap-1.5 hover:bg-neutral-50 transition-colors"
                        style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '5px 8px', background: '#FFFFFF', cursor: 'pointer', maxWidth: 160 }}
                    >
                        <span className="material-symbols-outlined text-[#71717A]" style={{ fontSize: 14 }}>receipt_long</span>
                        <span className="truncate" style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', maxWidth: 100 }}>
                            {activeSite?.name ?? 'My Store'}
                        </span>
                        <span
                            className="material-symbols-outlined text-[#99A1AF] shrink-0"
                            style={{ fontSize: 14, transition: 'transform 0.15s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                            keyboard_arrow_down
                        </span>
                    </button>

                    {/* Dropdown */}
                    {dropdownOpen && (
                        <div
                            className="absolute left-0 top-full mt-1.5 bg-white"
                            style={{ border: '1px solid #E4E4E7', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', minWidth: 220, zIndex: 100, overflow: 'hidden' }}
                        >
                            {/* All stores */}
                            {allSites.map((site, idx) => {
                                const isActive = site.id === activeSite?.id;
                                const initials = site.name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
                                return (
                                    <button
                                        key={site.id}
                                        onClick={() => handleSwitchStore(site.id)}
                                        className="flex w-full items-center gap-2 hover:bg-neutral-50 transition-colors"
                                        style={{
                                            padding: '10px 14px',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            borderBottom: idx < allSites.length - 1 ? '1px solid #F4F4F5' : 'none',
                                        }}
                                    >
                                        <div style={{ width: 30, height: 30, borderRadius: 7, background: isActive ? '#EEEBFD' : '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                            {site.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={site.image_url} alt={site.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? '#5137EF' : '#71717A' }}>{initials}</span>
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                            <p className="truncate" style={{ fontSize: 13, fontWeight: 500, color: '#0A0A0A' }}>{site.name}</p>
                                            <p style={{ fontSize: 11, color: '#99A1AF' }}>{site.is_live ? 'Live' : 'Offline'}</p>
                                        </div>
                                        {isActive && (
                                            <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16, color: '#5137EF' }}>check</span>
                                        )}
                                    </button>
                                );
                            })}

                            {/* Divider */}
                            <div style={{ borderTop: '1px solid #E4E4E7' }} />

                            {/* Create new store */}
                            <button
                                onClick={() => { setDropdownOpen(false); router.push('/onboarding'); }}
                                className="flex w-full items-center gap-2 hover:bg-neutral-50 transition-colors"
                                style={{ padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                <div style={{ width: 30, height: 30, borderRadius: 7, border: '1.5px dashed #C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#5137EF' }}>add</span>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#5137EF' }}>Create New Store</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Search bar — desktop only inline, mobile icon */}
                <div
                    className="hidden lg:flex items-center gap-1.5"
                    style={{ border: '1px solid #E4E4E7', borderRadius: 8, padding: '6px 10px', background: '#FFFFFF', width: 260 }}
                >
                    <span className="material-symbols-outlined text-[#99A1AF] shrink-0" style={{ fontSize: 14 }}>search</span>
                    <input
                        type="text"
                        placeholder="Search"
                        className="flex-1 bg-transparent text-[#0A0A0A] placeholder-[#99A1AF] outline-none min-w-0"
                        style={{ fontSize: 12 }}
                    />
                    <span
                        className="shrink-0 text-[#99A1AF]"
                        style={{ fontSize: 9, fontWeight: 500, border: '1px solid #E4E4E7', borderRadius: 4, padding: '2px 4px', background: '#F4F4F4', lineHeight: '14px', whiteSpace: 'nowrap' }}
                    >
                        ⌘ + F
                    </span>
                </div>

                {/* Mobile search icon */}
                <button
                    className="lg:hidden flex items-center justify-center shrink-0"
                    style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid #E4E4E7', background: '#FFFFFF' }}
                    onClick={() => setSearchOpen(true)}
                >
                    <span className="material-symbols-outlined text-[#71717A]" style={{ fontSize: 18 }}>search</span>
                </button>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Bell + User */}
                <div className="flex items-center gap-2 shrink-0">
                    <button className="flex items-center justify-center" style={{ width: 32, height: 32 }}>
                        <span className="material-symbols-outlined text-[#71717A]" style={{ fontSize: 20 }}>notifications</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {/* Avatar */}
                        <div className="shrink-0 overflow-hidden" style={{ width: 34, height: 34, borderRadius: '50%', background: '#5137EF' }}>
                            {avatarImg ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={avatarImg} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-white font-bold" style={{ fontSize: 13 }}>
                                    {avatarLetter}
                                </div>
                            )}
                        </div>

                        {/* Name + role — always visible, truncated on mobile */}
                        <div className="flex flex-col leading-tight" style={{ maxWidth: 110 }}>
                            <span className="font-semibold text-[#0A0A0A] truncate" style={{ fontSize: 13, lineHeight: '18px' }}>{displayName}</span>
                            <span className="text-[#99A1AF] truncate hidden lg:block" style={{ fontSize: 11, lineHeight: '15px' }}>Product Management</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile search expanded row ── */}
            {searchOpen && (
                <div className="flex items-center h-full gap-2" style={{ padding: '0 16px' }}>
                    <div className="flex items-center gap-2 flex-1" style={{ border: '1px solid #5137EF', borderRadius: 8, padding: '7px 12px', background: '#FFFFFF' }}>
                        <span className="material-symbols-outlined text-[#5137EF] shrink-0" style={{ fontSize: 16 }}>search</span>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search products, categories…"
                            className="flex-1 bg-transparent text-[#0A0A0A] placeholder-[#99A1AF] outline-none min-w-0"
                            style={{ fontSize: 14 }}
                        />
                    </div>
                    <button
                        onClick={() => setSearchOpen(false)}
                        className="shrink-0 text-[#71717A] hover:text-[#0A0A0A] transition-colors"
                        style={{ fontSize: 14, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
                    >
                        Cancel
                    </button>
                </div>
            )}
        </header>
    );
}
