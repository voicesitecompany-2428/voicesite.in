import type React from 'react';
import { PRESS_IN_MS } from './menuMotion';

/**
 * Press feedback for anything on the menu a diner taps: cards and chips.
 *
 * `:active` cannot do this job on a phone. iOS only applies it when a touch
 * listener exists, Android applies it late, and a quick tap often ends before
 * the state paints at all — the designer saw no change on any card or chip.
 * These handlers set `data-pressed` instead, which MENU_MOTION_CSS styles
 * (98% + a darker overlay on cards, a grey fill on chips).
 *
 * Two details:
 *
 *   - The pressed state is held for at least PRESS_IN_MS (80ms), so a tap
 *     shorter than that is still seen as a press.
 *   - `pointercancel` — what the browser sends when a touch turns into a
 *     scroll — releases immediately, so scrolling through the list does not
 *     leave a trail of pressed cards.
 *
 * It writes a DOM attribute rather than React state: a press must not
 * re-render a card, let alone the list.
 */

const pressedAt = new WeakMap<Element, number>();
const releaseTimers = new WeakMap<Element, number>();

function press(el: HTMLElement) {
    const pending = releaseTimers.get(el);
    if (pending !== undefined) {
        window.clearTimeout(pending);
        releaseTimers.delete(el);
    }
    pressedAt.set(el, performance.now());
    el.dataset.pressed = 'true';
}

function release(el: HTMLElement, immediately: boolean) {
    const since = pressedAt.get(el);
    if (since === undefined) return;
    pressedAt.delete(el);
    const wait = immediately ? 0 : Math.max(0, PRESS_IN_MS - (performance.now() - since));
    if (wait === 0) {
        delete el.dataset.pressed;
        return;
    }
    releaseTimers.set(el, window.setTimeout(() => {
        delete el.dataset.pressed;
        releaseTimers.delete(el);
    }, wait));
}

export const pressHandlers = {
    onPointerDown(e: React.PointerEvent<HTMLElement>) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        press(e.currentTarget);
    },
    onPointerUp(e: React.PointerEvent<HTMLElement>) {
        release(e.currentTarget, false);
    },
    onPointerLeave(e: React.PointerEvent<HTMLElement>) {
        release(e.currentTarget, false);
    },
    onPointerCancel(e: React.PointerEvent<HTMLElement>) {
        release(e.currentTarget, true);
    },
};
