'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useSite } from '@/components/SiteContext';

// ── Single fixed design: Saffron (pale + orange) ────────────────────────────
const DESIGN = {
    bg:        '#FFF8F0',
    accent:    '#E86A00',
    textColor: '#1A1A1A',
    subColor:  '#7C5C3A',
    qrFg:      '#E86A00',
    qrBg:      '#FFF8F0',
    tagline:   'Scan to view our menu',
};

// ── Poster preview component ─────────────────────────────────────────────────
function PosterPreview({
    storeName,
    menuUrl,
    size = 300,
    qrCanvasRef,
}: {
    storeName: string;
    menuUrl: string;
    size?: number;
    qrCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
}) {
    const qrSize   = Math.round(size * 0.44);
    const initials = storeName.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

    return (
        <div style={{
            width: size,
            height: Math.round(size * 1.414),
            background: DESIGN.bg,
            borderRadius: Math.round(size * 0.035),
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontFamily: "'Inter', 'Outfit', sans-serif",
            flexShrink: 0,
        }}>
            {/* Subtle dot pattern */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                {Array.from({ length: Math.ceil(size / 30) + 1 }, (_, xi) =>
                    Array.from({ length: Math.ceil((size * 1.414) / 30) + 1 }, (_, yi) => (
                        <circle key={`${xi}-${yi}`} cx={xi * 30} cy={yi * 30} r={1.5} fill={DESIGN.accent} opacity={0.12} />
                    ))
                )}
            </svg>

            {/* Top accent bar */}
            <div style={{ width: '100%', height: Math.round(size * 0.022), background: DESIGN.accent, flexShrink: 0, zIndex: 1 }} />

            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${Math.round(size * 0.07)}px ${Math.round(size * 0.08)}px ${Math.round(size * 0.03)}px`, zIndex: 1, width: '100%', boxSizing: 'border-box' }}>
                {/* Logo circle */}
                <div style={{ width: Math.round(size * 0.22), height: Math.round(size * 0.22), borderRadius: '50%', background: DESIGN.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: Math.round(size * 0.035), flexShrink: 0 }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 800, fontSize: Math.round(size * 0.09), letterSpacing: 1 }}>{initials || '•'}</span>
                </div>
                {/* Store name */}
                <p style={{ color: DESIGN.textColor, fontWeight: 800, fontSize: Math.round(size * 0.072), lineHeight: 1.15, textAlign: 'center', margin: 0, wordBreak: 'break-word', maxWidth: '90%' }}>
                    {storeName || 'My Store'}
                </p>
                {/* Accent divider */}
                <div style={{ width: Math.round(size * 0.12), height: 3, background: DESIGN.accent, borderRadius: 2, margin: `${Math.round(size * 0.028)}px 0 0` }} />
            </div>

            {/* QR code */}
            <div style={{ background: DESIGN.qrBg, border: `2px solid ${DESIGN.accent}33`, borderRadius: Math.round(size * 0.028), padding: Math.round(size * 0.028), zIndex: 1, flexShrink: 0, marginTop: Math.round(size * 0.02) }}>
                <QRCodeCanvas
                    value={menuUrl || 'https://vsite.com'}
                    size={qrSize}
                    fgColor={DESIGN.qrFg}
                    bgColor={DESIGN.qrBg}
                    level="H"
                    ref={qrCanvasRef as React.RefObject<HTMLCanvasElement>}
                />
            </div>

            {/* Tagline */}
            <p style={{ color: DESIGN.subColor, fontSize: Math.round(size * 0.042), fontWeight: 500, textAlign: 'center', margin: `${Math.round(size * 0.038)}px 0 0`, zIndex: 1, letterSpacing: 0.3 }}>
                {DESIGN.tagline}
            </p>

            {/* URL */}
            <p style={{ color: DESIGN.subColor, fontSize: Math.round(size * 0.03), textAlign: 'center', margin: `${Math.round(size * 0.012)}px ${Math.round(size * 0.06)}px 0`, zIndex: 1, wordBreak: 'break-all', opacity: 0.65 }}>
                {menuUrl}
            </p>

            <div style={{ flex: 1 }} />

            {/* Bottom accent bar */}
            <div style={{ width: '100%', height: Math.round(size * 0.022), background: DESIGN.accent, flexShrink: 0, zIndex: 1 }} />
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function QRPage() {
    const { activeSite } = useSite();

    const [downloading, setDownloading] = useState(false);
    const qrCanvasRef  = useRef<HTMLCanvasElement | null>(null);
    const hiddenQrRef  = useRef<HTMLCanvasElement | null>(null);

    const slug      = activeSite?.slug ?? '';
    const storeName = activeSite?.name ?? 'My Store';
    const [resolvedUrl, setResolvedUrl] = useState('');

    useEffect(() => {
        if (slug) setResolvedUrl(`${window.location.origin}/shop/${slug}`);
    }, [slug]);

    // ── Download QR only ──────────────────────────────────────────────────────
    const handleDownloadQR = useCallback(() => {
        const canvas = hiddenQrRef.current;
        if (!canvas) return;
        const pad = 32;
        const out = document.createElement('canvas');
        out.width  = canvas.width  + pad * 2;
        out.height = canvas.height + pad * 2;
        const ctx = out.getContext('2d')!;
        ctx.fillStyle = DESIGN.qrBg;
        ctx.fillRect(0, 0, out.width, out.height);
        ctx.drawImage(canvas, pad, pad);
        out.toBlob(blob => {
            if (!blob) return;
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `${storeName.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
            a.click();
            URL.revokeObjectURL(a.href);
        }, 'image/png');
    }, [storeName]);

    // ── Download full poster ──────────────────────────────────────────────────
    const handleDownloadPoster = useCallback(async () => {
        setDownloading(true);
        try {
            const W = 1240;
            const H = Math.round(W * 1.414);
            const canvas = document.createElement('canvas');
            canvas.width  = W;
            canvas.height = H;
            const ctx = canvas.getContext('2d')!;

            // Background
            ctx.fillStyle = DESIGN.bg;
            ctx.fillRect(0, 0, W, H);

            // Dot pattern
            ctx.fillStyle = DESIGN.accent;
            ctx.globalAlpha = 0.1;
            const sp = 62;
            for (let x = 0; x < W; x += sp)
                for (let y = 0; y < H; y += sp) {
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            ctx.globalAlpha = 1;

            // Top accent bar
            ctx.fillStyle = DESIGN.accent;
            ctx.fillRect(0, 0, W, Math.round(W * 0.022));

            // Initials circle
            const cx = W / 2;
            const circleY = Math.round(W * 0.21);
            const circleR = Math.round(W * 0.11);
            ctx.fillStyle = DESIGN.accent;
            ctx.beginPath(); ctx.arc(cx, circleY, circleR, 0, Math.PI * 2); ctx.fill();
            const initials = storeName.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '•';
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `800 ${Math.round(W * 0.09)}px Inter, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(initials, cx, circleY);

            // Store name
            ctx.fillStyle = DESIGN.textColor;
            ctx.font = `800 ${Math.round(W * 0.072)}px Inter, Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const nameY = circleY + circleR + Math.round(W * 0.038);
            ctx.fillText(storeName, cx, nameY);

            // Divider
            ctx.fillStyle = DESIGN.accent;
            const divH = 5, divW = Math.round(W * 0.12);
            const divY = nameY + Math.round(W * 0.082);
            ctx.beginPath();
            ctx.roundRect(cx - divW / 2, divY, divW, divH, 3);
            ctx.fill();

            // QR box
            const qrEl = hiddenQrRef.current;
            if (qrEl) {
                const qrSize = Math.round(W * 0.44);
                const qrX = Math.round((W - qrSize) / 2);
                const qrY = divY + Math.round(W * 0.055);
                const pad = Math.round(W * 0.028);
                const bx = qrX - pad, by = qrY - pad, bw = qrSize + pad * 2, bh = qrSize + pad * 2;
                ctx.fillStyle = DESIGN.qrBg;
                ctx.strokeStyle = DESIGN.accent + '33';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(bx, by, bw, bh, Math.round(W * 0.02));
                ctx.fill(); ctx.stroke();
                ctx.drawImage(qrEl, qrX, qrY, qrSize, qrSize);

                // Tagline
                ctx.fillStyle = DESIGN.subColor;
                ctx.font = `500 ${Math.round(W * 0.042)}px Inter, Arial, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(DESIGN.tagline, cx, qrY + qrSize + pad + Math.round(W * 0.038));

                // URL
                ctx.font = `400 ${Math.round(W * 0.03)}px Inter, Arial, sans-serif`;
                ctx.globalAlpha = 0.6;
                ctx.fillText(resolvedUrl, cx, qrY + qrSize + pad + Math.round(W * 0.1));
                ctx.globalAlpha = 1;
            }

            // Bottom accent bar
            ctx.fillStyle = DESIGN.accent;
            ctx.fillRect(0, H - Math.round(W * 0.022), W, Math.round(W * 0.022));

            canvas.toBlob(blob => {
                if (!blob) return;
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${storeName.replace(/\s+/g, '-').toLowerCase()}-poster.png`;
                a.click();
                URL.revokeObjectURL(a.href);
            }, 'image/png');
        } catch (err) {
            console.error('Poster download failed:', err);
        } finally {
            setDownloading(false);
        }
    }, [storeName, resolvedUrl]);

    return (
        <div className="px-4 md:px-8 py-6 md:py-8">

            {/* Page header */}
            <div className="mb-6">
                <h1 className="font-semibold text-[#0A0A0A]" style={{ fontSize: 30, lineHeight: '36px' }}>QR Code & Poster</h1>
                <p className="text-[#52525C] mt-1" style={{ fontSize: 16, lineHeight: '24px' }}>
                    Download your menu QR code or a print-ready poster
                </p>
            </div>

            {!resolvedUrl ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <span className="material-symbols-outlined text-[#C4C4C4]" style={{ fontSize: 56, marginBottom: 16 }}>qr_code_2</span>
                    <p className="font-semibold text-[#0A0A0A]" style={{ fontSize: 18, marginBottom: 6 }}>No store found</p>
                    <p style={{ fontSize: 14, color: '#71717A' }}>Create a store first to generate your QR code.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-6">

                    {/* Poster preview */}
                    <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(232,106,0,0.15), 0 2px 8px rgba(0,0,0,0.08)' }}>
                        <PosterPreview
                            storeName={storeName}
                            menuUrl={resolvedUrl}
                            size={300}
                            qrCanvasRef={qrCanvasRef}
                        />
                    </div>

                    {/* Download buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full" style={{ maxWidth: 400 }}>
                        <button
                            onClick={handleDownloadPoster}
                            disabled={downloading}
                            className="flex-1 flex items-center justify-center gap-2 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                            style={{ background: '#E86A00', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 500, cursor: downloading ? 'wait' : 'pointer', border: 'none' }}
                        >
                            {downloading ? (
                                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Generating…</>
                            ) : (
                                <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>Download Poster</>
                            )}
                        </button>
                        <button
                            onClick={handleDownloadQR}
                            className="flex-1 flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
                            style={{ border: '1.5px solid #E86A00', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 500, color: '#E86A00', background: '#FFFFFF', cursor: 'pointer' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>qr_code</span>
                            Download QR Only
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden high-res QR canvas for export */}
            <div style={{ position: 'absolute', left: -9999, top: -9999, pointerEvents: 'none', opacity: 0 }}>
                <QRCodeCanvas
                    value={resolvedUrl || 'https://vsite.com'}
                    size={544}
                    fgColor={DESIGN.qrFg}
                    bgColor={DESIGN.qrBg}
                    level="H"
                    ref={hiddenQrRef as React.RefObject<HTMLCanvasElement>}
                />
            </div>
        </div>
    );
}
