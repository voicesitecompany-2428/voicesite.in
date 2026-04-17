'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthContext';
import { firebaseAuth } from '@/lib/firebase';

const MAX_PHOTOS = 10;

interface PreviewPhoto {
  id: string;
  url: string;
  file: File;
  name: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Saving…');
  const [businessName, setBusinessName] = useState('');
  const [photos, setPhotos] = useState<PreviewPhoto[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [error, setError] = useState('');

  const uploadRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMobile(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    setChecking(false);
  }, [user, loading, router]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const incoming = Array.from(files).filter(f => f.type.startsWith('image/'));
    setPhotos(prev => {
      const slots = MAX_PHOTOS - prev.length;
      if (slots <= 0) return prev;
      return [
        ...prev,
        ...incoming.slice(0, slots).map(f => ({
          id: `${f.name}-${f.size}-${Math.random()}`,
          url: URL.createObjectURL(f),
          file: f,
          name: f.name,
        })),
      ];
    });
  }, []);

  const removePhoto = (id: string) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter(p => p.id !== id);
    });
  };

  const handleNext = async () => {
    if (!user || saving) return;
    if (!businessName.trim()) { setError('Please enter your business name.'); return; }

    setError('');
    setSaving(true);
    setLoadingMsg(
      photos.length > 0
        ? 'Scanning your menu… this takes ~15 seconds'
        : 'Setting up your store…'
    );

    try {
      const firebaseUser = firebaseAuth.currentUser;
      if (!firebaseUser) { setError('Session expired. Please log in again.'); setSaving(false); return; }
      const token = await firebaseUser.getIdToken();
      const formData = new FormData();
      formData.append('shopName', businessName.trim());
      photos.forEach(p => formData.append('photos', p.file));

      const res = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setSaving(false);
        return;
      }

      // Clean up object URLs
      photos.forEach(p => URL.revokeObjectURL(p.url));

      // Pre-select the newly created store so SiteContext loads it, not an existing one
      if (data.siteId && firebaseUser) {
        localStorage.setItem(`activeSiteId_${firebaseUser.uid}`, data.siteId);
      }

      router.replace(
        `/manage/dashboard?onboarded=true&items=${data.itemCount ?? 0}`
      );
    } catch {
      setError('Network error. Please try again.');
      setSaving(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-primary" />
      </div>
    );
  }

  const atLimit = photos.length >= MAX_PHOTOS;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-violet-50 via-purple-50 to-slate-50 flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-8 py-4">
        <button
          onClick={() => router.push('/manage/dashboard')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
          Dashboard
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/30">
            <span className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>graphic_eq</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-800">Vsite</span>
        </div>
        <div className="hidden sm:flex items-center gap-5">
          <a href="#" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>headset_mic</span>
            Support
          </a>
          <a href="#" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 17 }}>help_outline</span>
            Help Center
          </a>
        </div>
      </header>

      {/* Page heading */}
      <div className="mt-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Setup Your Store</h1>
        <p className="mt-1 text-sm text-slate-400">
          Let&apos;s set up your store. Add a name that your customers will recognize.
        </p>
      </div>

      {/* Card */}
      <main className="flex flex-1 justify-center px-4 py-6 pb-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 px-7 py-7">

            {/* Connect Your Business */}
            <div className="mb-5 flex items-center gap-2">
              <span className="text-base">🔗</span>
              <span className="text-sm font-semibold text-slate-700">Connect Your Business</span>
            </div>

            <div className="space-y-4 mb-7">
              {/* Business Name */}
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">
                  Enter your Business Name
                </label>
                <input
                  type="text"
                  placeholder="Cream Story"
                  value={businessName}
                  onChange={e => { setBusinessName(e.target.value); setError(''); }}
                  className="w-full rounded-[10px] border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  autoFocus
                  disabled={saving}
                />
              </div>

              {/* Business Category — fixed "Cafe" for MVP */}
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">
                  Business Category
                </label>
                <div className="flex items-center gap-2 rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <span className="text-base">☕</span>
                  <span className="text-sm font-medium text-slate-700">Cafe</span>
                  <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Selected
                  </span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mb-6 border-t border-slate-100" />

            {/* Menu Photo Upload */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Menu Photos</p>
                {photos.length > 0 && (
                  <span className={`text-xs font-medium tabular-nums ${atLimit ? 'text-amber-500' : 'text-slate-400'}`}>
                    {photos.length} / {MAX_PHOTOS}
                  </span>
                )}
              </div>

              {/* Hidden file inputs */}
              <input
                ref={uploadRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => e.target.files && addFiles(e.target.files)}
              />
              {isMobile && (
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={e => e.target.files && addFiles(e.target.files)}
                />
              )}

              {/* Upload area */}
              <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white py-7 px-4">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                  <span className="material-symbols-outlined text-slate-400" style={{ fontSize: 28 }}>upload</span>
                </div>
                <p className="mb-1 text-sm font-medium text-slate-700">
                  Upload your menu photos
                </p>
                <p className="mb-4 text-center text-xs text-slate-400 leading-relaxed">
                  PNG, JPG or WebP &nbsp;·&nbsp; Up to {MAX_PHOTOS} photos
                  {isMobile && <><br />Upload from gallery or take a photo</>}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={atLimit || saving}
                    onClick={() => uploadRef.current?.click()}
                    className="rounded-[10px] border border-slate-300 bg-white px-5 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Choose File
                  </button>
                  {isMobile && (
                    <button
                      type="button"
                      disabled={atLimit || saving}
                      onClick={() => cameraRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>photo_camera</span>
                      Take Photo
                    </button>
                  )}
                </div>
              </div>

              {/* Photo preview grid */}
              {photos.length > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-2">
                  {photos.map(photo => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => removePhoto(photo.id)}
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/65 text-white opacity-0 transition-opacity group-hover:opacity-100 active:opacity-100 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {atLimit && (
                <p className="mt-2 text-center text-xs text-amber-500">
                  Maximum {MAX_PHOTOS} photos reached. Remove one to add more.
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-600">
                {error}
              </p>
            )}
          </div>

          {/* Next button — outside card, aligned right */}
          <div className="mt-5 flex justify-end">
            <button
              onClick={handleNext}
              disabled={saving}
              className="rounded-[10px] bg-primary px-10 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-primary-dark active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {loadingMsg}
                </span>
              ) : 'Next'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
