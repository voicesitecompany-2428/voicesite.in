'use client';

import { useEffect } from 'react';

/**
 * Stop the page scrolling behind a sheet — on <html>, never on <body>.
 *
 * globals.css sets `overflow-x: clip` on html and body so `position: sticky`
 * works. With html's overflow no longer `visible`, a `body { overflow: hidden }`
 * is NOT propagated to the viewport: it turns body into a scroll container of
 * its own, scrolled to 0. Every sticky element then sticks to body instead of
 * the viewport — the menu header jumped off screen the moment a sheet opened
 * and popped back when it closed. That is the "header vanishes" in the
 * designer's recording.
 *
 * Locking the root element stops the viewport itself, keeps the scroll
 * position, and leaves sticky elements exactly where they are.
 *
 * Counted, so a sheet opening from inside another overlay cannot unlock the
 * page under the first. `scrollbar-gutter` keeps a desktop page from shifting
 * sideways when its scrollbar goes; phones overlay theirs, so it is a no-op
 * there.
 */

let locks = 0;
let saved: { overflow: string; gutter: string } | null = null;

export function useScrollLock(active = true) {
    useEffect(() => {
        if (!active || typeof document === 'undefined') return;
        const root = document.documentElement;
        if (locks === 0) {
            saved = {
                overflow: root.style.overflow,
                gutter: root.style.getPropertyValue('scrollbar-gutter'),
            };
            root.style.setProperty('scrollbar-gutter', 'stable');
            root.style.overflow = 'hidden';
        }
        locks += 1;
        return () => {
            locks -= 1;
            if (locks === 0 && saved) {
                root.style.overflow = saved.overflow;
                root.style.setProperty('scrollbar-gutter', saved.gutter);
                saved = null;
            }
        };
    }, [active]);
}
