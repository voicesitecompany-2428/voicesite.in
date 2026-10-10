'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The quick-return pattern: hide a bar while the reader scrolls down into the
 * content, bring it back the instant they scroll up — wherever they are.
 *
 * Material calls it a scroll-aware app bar; headroom.js is the same idea. It
 * exists because a filter that only lives at the top of the page forces a
 * reader 40 dishes down to scroll all the way back just to change category,
 * and a bar that is permanently pinned eats a sixth of a phone screen that
 * should be showing food.
 *
 * ── Why distance and not a count of scroll events ──────────────────────────
 *
 * "Show it after two scrolls up" is the intuitive rule and it does not work.
 * A single flick is ONE scroll event carrying 800px of travel; a slow drag is
 * dozens of events carrying 10px. Counting events either fires immediately on
 * a flick or never fires on a drag. So this measures DISTANCE TRAVELLED in one
 * direction, which is what every shipped implementation of this pattern does.
 *
 * The two tolerances are deliberately asymmetric (the designer's numbers):
 *
 *   - `upTolerance` (16px) is small. An upward scroll IS the request to get
 *     the bar back, and hesitating on it feels broken.
 *   - `downTolerance` (48px) is larger, so a thumb that wobbles while reading
 *     does not strobe the bar in and out.
 *
 * Travel must be CONTINUOUS: a change of direction starts a fresh count. The
 * earlier version anchored at the last toggle, so 40px down, a twitch up and
 * 10px more down added up to a hide the reader never asked for.
 *
 * `offset` keeps the bar visible near the top of the page: there is nothing to
 * gain by hiding it there, and a bar that vanishes after 20px feels twitchy.
 *
 * Returns `pinned` only. The caller decides what pinned looks like — this hook
 * never touches the DOM, so it can be tested and reused without a component.
 */

/**
 * Vertical scroll position, whichever element is carrying it.
 *
 * `window.scrollY` is the usual answer, but it reads 0 whenever something has
 * made `body` the scroll container — which any `overflow` other than
 * `visible` on `html`/`body` will do. Falling through the three candidates
 * costs nothing and stops the hook silently doing nothing.
 */
function readScrollY(): number {
    if (typeof window === 'undefined') return 0;
    return window.scrollY
        || document.documentElement?.scrollTop
        || document.body?.scrollTop
        || 0;
}

export interface UseQuickReturnOptions {
    /** Stay pinned while within this many px of the top. */
    offset?: number;
    /** Px of continuous upward travel before the bar comes back. */
    upTolerance?: number;
    /** Px of continuous downward travel before the bar hides. */
    downTolerance?: number;
    /**
     * Freeze the bar where it is — e.g. while a sheet is open or closing. The
     * bar neither hides nor returns until tracking resumes.
     */
    disabled?: boolean;
}

export interface QuickReturnState {
    pinned: boolean;
    /** Scroll position at the previous step. */
    lastY: number;
    /** Signed px travelled in the current direction; resets when it reverses. */
    travel: number;
}

export const QUICK_RETURN_START: QuickReturnState = { pinned: true, lastY: 0, travel: 0 };

/** One scroll reading in, the next state out. Pure, so the rule is testable. */
export function quickReturnStep(
    state: QuickReturnState,
    y: number,
    tolerances: { offset: number; upTolerance: number; downTolerance: number },
): QuickReturnState {
    // Near the top, or rubber-banded past it on iOS.
    if (y <= tolerances.offset) return { pinned: true, lastY: y, travel: 0 };

    const dy = y - state.lastY;
    if (dy === 0) return state;

    const sameDirection = state.travel !== 0 && (dy > 0) === (state.travel > 0);
    const travel = sameDirection ? state.travel + dy : dy;

    let pinned = state.pinned;
    if (travel >= tolerances.downTolerance) pinned = false;
    else if (-travel >= tolerances.upTolerance) pinned = true;

    return { pinned, lastY: y, travel };
}

export function useQuickReturn({
    offset = 140,
    upTolerance = 16,
    downTolerance = 48,
    disabled = false,
}: UseQuickReturnOptions = {}): boolean {
    const [pinned, setPinned] = useState(true);

    // Refs, not state: these update on every frame of a scroll and must not
    // re-render anything. Only `pinned` flipping is worth a render.
    const state = useRef<QuickReturnState>(QUICK_RETURN_START);
    const ticking = useRef(false);

    useEffect(() => {
        if (disabled) {
            // A sheet owns the screen. Leave the bar exactly as it is: forcing
            // it back here slid it in behind every sheet, and it then jumped
            // on close.
            return;
        }
        if (typeof window === 'undefined') return;

        // Re-anchor wherever the page is now, so resuming never counts the
        // time a sheet was open as reader scrolling.
        state.current = { ...state.current, lastY: readScrollY(), travel: 0 };

        const evaluate = () => {
            ticking.current = false;
            const next = quickReturnStep(state.current, readScrollY(), { offset, upTolerance, downTolerance });
            state.current = next;
            setPinned(next.pinned);
        };

        const onScroll = () => {
            // One read per frame. An unthrottled handler reads scrollY on
            // every event and forces layout on a cheap Android mid-scroll.
            if (ticking.current) return;
            ticking.current = true;
            requestAnimationFrame(evaluate);
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [offset, upTolerance, downTolerance, disabled]);

    return pinned;
}
