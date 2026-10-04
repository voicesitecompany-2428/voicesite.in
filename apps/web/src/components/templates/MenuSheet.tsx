'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import {
    EASE_IN, EASE_OUT, SETTLE, SHEET_CLOSE_MS, OVERLAY_FADE_MS, SPRING_BACK_MS, REDUCED_FADE_MS,
    shouldDismissSheet, releaseVelocity, dragOverlayOpacity,
} from '@/lib/menu/menuMotion';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * The bottom sheet both dish layouts open in.
 *
 * What the designer's recording showed, and what this does instead:
 *
 *   - CLOSE vanished in one frame, because the parent unmounted the sheet the
 *     moment it was asked to close. The parent now flips `open` to false and
 *     keeps rendering; this slides the sheet down (220ms, ease-in) while the
 *     overlay fades (200ms), and only then calls `onExited`. The page stays
 *     scroll-locked until that moment, because the lock is released on
 *     unmount.
 *   - OPEN keeps its curve (320ms on SETTLE, see `.qr-sheet` in the template's
 *     stylesheet) but the overlay is a separate layer now, fading 0 → 50%
 *     over 200ms, and the header no longer drops out (useScrollLock).
 *   - The photo sheet's × floated above the sheet as a sibling, so it was on
 *     screen before the sheet arrived. `above` renders it INSIDE the sliding
 *     element, so it rides up with the sheet.
 *   - The drag handle did nothing. The sheet now follows the finger 1:1 from
 *     anywhere on it while its content is scrolled to the top; past 25% of its
 *     height, or on a flick faster than 0.5 px/ms, it closes — otherwise it
 *     settles back over 200ms.
 *
 * Gesture frames write straight to the DOM (transform, opacity) — a re-render
 * per touchmove would drop frames on exactly the phones this is for.
 */

interface MenuSheetProps {
    /** False starts the exit; the sheet stays mounted until `onExited`. */
    open: boolean;
    /** The reader asked to close: overlay tap or a drag past the threshold. */
    onRequestClose: () => void;
    /** The exit has finished — unmount now. */
    onExited: () => void;
    label: string;
    /** Look of the panel itself (radius, background, max height). */
    panelStyle: React.CSSProperties;
    /** A white handle for a sheet that opens on a photo. */
    handleOnPhoto?: boolean;
    /** Floats above the panel and slides with it (the photo sheet's ×). */
    above?: React.ReactNode;
    children: React.ReactNode;
}

type Sample = { t: number; y: number };

export default function MenuSheet({
    open, onRequestClose, onExited, label, panelStyle, handleOnPhoto = false, above, children,
}: MenuSheetProps) {
    useScrollLock();
    const reduceMotion = useReducedMotion();

    const sheetRef = useRef<HTMLDivElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);
    const closing = useRef(false);
    const exitTimer = useRef<number | null>(null);

    // Latest callbacks, so the gesture listeners can be bound once.
    const requestCloseRef = useRef(onRequestClose);
    const exitedRef = useRef(onExited);
    const reduceRef = useRef(reduceMotion);
    useEffect(() => {
        requestCloseRef.current = onRequestClose;
        exitedRef.current = onExited;
        reduceRef.current = reduceMotion;
    });

    /** Pin an element at whatever its running open animation has reached. */
    const freeze = (el: HTMLElement | null, prop: 'transform' | 'opacity') => {
        if (!el) return;
        const now = getComputedStyle(el)[prop];
        el.style.animation = 'none';
        el.style.transition = 'none';
        if (prop === 'transform') el.style.transform = now === 'none' ? '' : now;
        else el.style.opacity = now;
    };

    const startExit = useCallback(() => {
        if (closing.current) return;
        closing.current = true;
        const sheet = sheetRef.current;
        const backdrop = backdropRef.current;
        freeze(sheet, reduceRef.current ? 'opacity' : 'transform');
        freeze(backdrop, 'opacity');
        // Commit the frozen values before transitioning away from them.
        sheet?.getBoundingClientRect();

        if (sheet) {
            sheet.style.pointerEvents = 'none';
            if (reduceRef.current) {
                sheet.style.transition = `opacity ${REDUCED_FADE_MS}ms linear`;
                sheet.style.opacity = '0';
            } else {
                sheet.style.transition = `transform ${SHEET_CLOSE_MS}ms ${EASE_IN}`;
                sheet.style.transform = 'translate3d(0, 100%, 0)';
            }
        }
        if (backdrop) {
            const fade = reduceRef.current ? REDUCED_FADE_MS : OVERLAY_FADE_MS;
            backdrop.style.transition = `opacity ${fade}ms ${EASE_OUT}`;
            backdrop.style.opacity = '0';
        }
        const total = reduceRef.current ? REDUCED_FADE_MS : Math.max(SHEET_CLOSE_MS, OVERLAY_FADE_MS);
        exitTimer.current = window.setTimeout(() => exitedRef.current(), total);
    }, []);

    /** Settle back to fully open, from wherever a drag left it. */
    const springBack = useCallback(() => {
        const sheet = sheetRef.current;
        const backdrop = backdropRef.current;
        const ms = reduceRef.current ? REDUCED_FADE_MS : SPRING_BACK_MS;
        if (sheet) {
            sheet.style.pointerEvents = '';
            sheet.style.opacity = '';
            sheet.style.transition = `transform ${ms}ms ${SETTLE}`;
            sheet.style.transform = 'translate3d(0, 0, 0)';
        }
        if (backdrop) {
            backdrop.style.transition = `opacity ${ms}ms ${EASE_OUT}`;
            backdrop.style.opacity = '1';
        }
    }, []);

    // Parent flipped `open`: run the exit, or — if it reopened mid-exit — come back.
    useEffect(() => {
        if (!open) {
            startExit();
            return;
        }
        if (closing.current) {
            closing.current = false;
            if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
            springBack();
        }
    }, [open, startExit, springBack]);

    useEffect(() => () => {
        if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    }, []);

    // ── Drag to close ──────────────────────────────────────────────────────
    useEffect(() => {
        const panel = panelRef.current;
        const sheet = sheetRef.current;
        const backdrop = backdropRef.current;
        if (!panel || !sheet) return;

        let mode: 'idle' | 'pending' | 'drag' | 'ignore' = 'idle';
        let startX = 0;
        let startY = 0;
        let lastY = 0;
        let height = 0;
        let samples: Sample[] = [];
        let scroller: Element | null = null;

        const follow = (y: number, t: number) => {
            lastY = y;
            samples.push({ t, y });
            if (samples.length > 12) samples = samples.slice(-12);
            const drag = Math.max(0, y - startY);
            sheet.style.transform = `translate3d(0, ${drag}px, 0)`;
            if (backdrop) backdrop.style.opacity = String(dragOverlayOpacity(drag, height));
        };

        const beginDrag = () => {
            mode = 'drag';
            height = panel.getBoundingClientRect().height;
            freeze(sheet, 'transform');
            freeze(backdrop, 'opacity');
        };

        const finish = (t: number) => {
            if (mode !== 'drag') { mode = 'idle'; return; }
            mode = 'idle';
            const drag = Math.max(0, lastY - startY);
            if (shouldDismissSheet(drag, height, releaseVelocity(samples, t))) {
                startExit();
                requestCloseRef.current();
            } else {
                springBack();
            }
        };

        const start = (x: number, y: number, t: number, target: EventTarget | null) => {
            if (closing.current) { mode = 'ignore'; return; }
            mode = 'pending';
            startX = x;
            startY = y;
            lastY = y;
            samples = [{ t, y }];
            scroller = target instanceof Element ? target.closest('[data-sheet-scroll]') : null;
        };

        /** Returns true when this move belongs to the sheet rather than to scrolling. */
        const decide = (x: number, y: number): boolean => {
            if (mode === 'drag') return true;
            if (mode !== 'pending') return false;
            const dx = x - startX;
            const dy = y - startY;
            if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return false;
            const contentAtTop = !scroller || scroller.scrollTop <= 0;
            if (dy > 0 && Math.abs(dy) > Math.abs(dx) && contentAtTop) {
                beginDrag();
                return true;
            }
            mode = 'ignore';
            return false;
        };

        // Touch: the whole panel. A downward pull while the content is at its
        // top drags the sheet; anything else is left to native scrolling.
        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length !== 1) { mode = 'ignore'; return; }
            start(e.touches[0].clientX, e.touches[0].clientY, e.timeStamp, e.target);
        };
        const onTouchMove = (e: TouchEvent) => {
            const p = e.touches[0];
            if (!p || !decide(p.clientX, p.clientY)) return;
            if (e.cancelable) e.preventDefault();
            follow(p.clientY, e.timeStamp);
        };
        const onTouchEnd = (e: TouchEvent) => finish(e.timeStamp);

        panel.addEventListener('touchstart', onTouchStart, { passive: true });
        panel.addEventListener('touchmove', onTouchMove, { passive: false });
        panel.addEventListener('touchend', onTouchEnd);
        panel.addEventListener('touchcancel', onTouchEnd);

        // Mouse and pen: the handle only, so text in the sheet stays selectable.
        const handle = panel.querySelector<HTMLElement>('[data-testid="sheet-handle"]');
        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType === 'touch' || e.button !== 0) return;
            handle?.setPointerCapture(e.pointerId);
            start(e.clientX, e.clientY, e.timeStamp, null);
        };
        const onPointerMove = (e: PointerEvent) => {
            if (e.pointerType === 'touch') return;
            if (decide(e.clientX, e.clientY)) follow(e.clientY, e.timeStamp);
        };
        const onPointerUp = (e: PointerEvent) => {
            if (e.pointerType === 'touch') return;
            finish(e.timeStamp);
        };
        handle?.addEventListener('pointerdown', onPointerDown);
        handle?.addEventListener('pointermove', onPointerMove);
        handle?.addEventListener('pointerup', onPointerUp);
        handle?.addEventListener('pointercancel', onPointerUp);

        return () => {
            panel.removeEventListener('touchstart', onTouchStart);
            panel.removeEventListener('touchmove', onTouchMove);
            panel.removeEventListener('touchend', onTouchEnd);
            panel.removeEventListener('touchcancel', onTouchEnd);
            handle?.removeEventListener('pointerdown', onPointerDown);
            handle?.removeEventListener('pointermove', onPointerMove);
            handle?.removeEventListener('pointerup', onPointerUp);
            handle?.removeEventListener('pointercancel', onPointerUp);
        };
    }, [startExit, springBack]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            style={{
                position: 'fixed', inset: 0, zIndex: 200,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            }}
        >
            <div
                ref={backdropRef}
                className="qr-backdrop"
                data-testid="sheet-backdrop"
                onClick={() => { if (!closing.current) onRequestClose(); }}
            />
            {/* The sliding element. It spans the full width so the floating ×
                can centre itself above the panel; pointer-events pass through
                its empty margins to the overlay, so a tap beside the × still
                closes the sheet. */}
            <div
                ref={sheetRef}
                className="qr-sheet"
                data-testid="menu-sheet"
                style={{
                    position: 'relative', width: '100%', maxWidth: 560,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    pointerEvents: 'none', willChange: 'transform',
                }}
            >
                {above && <div style={{ pointerEvents: 'auto' }}>{above}</div>}
                <div ref={panelRef} style={{ ...panelStyle, width: '100%', position: 'relative', pointerEvents: 'auto' }}>
                    <div
                        data-testid="sheet-handle"
                        aria-hidden="true"
                        style={{
                            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                            width: 120, height: 28, zIndex: 2,
                            display: 'flex', justifyContent: 'center', paddingTop: 10,
                            cursor: 'grab', touchAction: 'none',
                        }}
                    >
                        <span style={{
                            width: 44, height: 4, borderRadius: 100,
                            background: handleOnPhoto ? 'rgba(255,255,255,0.85)' : '#DCD8DC',
                            boxShadow: handleOnPhoto ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
                        }} />
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
