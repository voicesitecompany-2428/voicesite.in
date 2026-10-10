import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Menu motion polish — the product designer's ten-point review, 2026-10-04.
 *
 * The designer watched a screen recording of the QA store and listed every
 * place the menu janks: sheets that vanish in one frame, a header that drops
 * out when a sheet opens, a drag handle that does nothing, no press feedback,
 * a category switch that flashes blank and greys both chips, a cut-off active
 * chip, photos that pop in, a chip bar that snaps and jumps back after every
 * sheet, a carousel that never stops moving, and no reduced-motion handling.
 *
 * This file pins the numbers and the pure decisions. The frame-by-frame
 * behaviour on a phone viewport is asserted by tests/e2e/menu-motion.spec.ts
 * (Playwright, against a running `next start`).
 *
 * Don'ts that apply everywhere: no per-card fade on scroll, no bounce,
 * nothing over 400ms (the designer's own 500ms banner slide is the one
 * exception), scrolling left to the browser, transform and opacity only.
 */

const WEB = join(__dirname, '..', '..');
const SRC = join(WEB, 'src');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
const shipped = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const TEMPLATE = 'components/templates/QRMenuTemplate.tsx';
const CARD = 'components/templates/MenuItemCard.tsx';
const SHEET = 'components/templates/MenuSheet.tsx';
const TOKENS = 'components/templates/menuTokens.ts';

/** The template's injected stylesheet, comments stripped. */
function templateCss(): string {
    const src = read(TEMPLATE);
    const start = src.indexOf('__html: `');
    const end = src.indexOf('` }}', start);
    return src.slice(start, end).replace(/\/\*[\s\S]*?\*\//g, '');
}

async function motionCss(): Promise<string> {
    const { MENU_MOTION_CSS } = await import('@/lib/menu/menuMotion');
    return MENU_MOTION_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// The designer's numbers, in one place
// ─────────────────────────────────────────────────────────────────────────────

describe('the motion constants are the designer\'s numbers', () => {
    it('sheets: 320ms open on the settle curve, 220ms ease-in close, 200ms overlay to 50%', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.SHEET_OPEN_MS).toBe(320);
        expect(m.SETTLE).toBe('cubic-bezier(0.32, 0.72, 0, 1)');
        expect(m.SHEET_CLOSE_MS).toBe(220);
        expect(m.EASE_IN).toBe('cubic-bezier(0.4, 0, 1, 1)');
        expect(m.OVERLAY_FADE_MS).toBe(200);
        expect(m.OVERLAY_ALPHA).toBe(0.5);
        expect(m.SHEET_X_FADE_MS).toBe(120);
    });

    it('drag: 25% of height or 0.5 px/ms closes, otherwise 200ms back', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.DISMISS_FRACTION).toBe(0.25);
        expect(m.DISMISS_VELOCITY).toBe(0.5);
        expect(m.SPRING_BACK_MS).toBe(200);
    });

    it('press: 98% in 80ms, back in 150ms', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.PRESS_CARD).toBe(0.98);
        expect(m.PRESS_IN_MS).toBe(80);
        expect(m.PRESS_OUT_MS).toBe(150);
    });

    it('category switch: 100ms out, 180ms in rising 8px, first 4 staggered 30ms', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.LIST_OUT_MS).toBe(100);
        expect(m.LIST_IN_MS).toBe(180);
        expect(m.LIST_RISE_PX).toBe(8);
        expect(m.STAGGER_MS).toBe(30);
        expect([0, 1, 2, 3, 4, 9].map(m.listEnterDelayMs)).toEqual([0, 30, 60, 90, 90, 90]);
    });

    it('chip bar: 200ms ease-out in, 180ms ease-in out, 48px down / 16px up', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.BAR_SHOW_MS).toBe(200);
        expect(m.BAR_HIDE_MS).toBe(180);
        expect(m.EASE_OUT).toBe('cubic-bezier(0, 0, 0.2, 1)');
        const hook = read('hooks/useQuickReturn.ts');
        expect(Number(/upTolerance\s*=\s*(\d+)/.exec(hook)?.[1])).toBe(16);
        expect(Number(/downTolerance\s*=\s*(\d+)/.exec(hook)?.[1])).toBe(48);
    });

    it('banner: every 5s, 500ms cubic-bezier(.65,0,.35,1), 8s hold after a swipe, dot 6→16px over 250ms', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.BANNER_EVERY_MS).toBe(5000);
        expect(m.BANNER_SLIDE_MS).toBe(500);
        expect(m.BANNER_EASE).toBe('cubic-bezier(0.65, 0, 0.35, 1)');
        expect(m.BANNER_HOLD_MS).toBe(8000);
        expect(m.DOT_W).toBe(6);
        expect(m.DOT_ACTIVE_W).toBe(16);
        expect(m.DOT_MS).toBe(250);
    });

    it('photos: 200ms fade over a warm placeholder', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.PHOTO_FADE_MS).toBe(200);
        expect(shipped(TOKENS)).toMatch(/photoWait: '#F3EEE8'/);
    });

    it('reduced motion: 120ms fades', async () => {
        const m = await import('@/lib/menu/menuMotion');
        expect(m.REDUCED_FADE_MS).toBe(120);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1-3. Sheets
// ─────────────────────────────────────────────────────────────────────────────

describe('1-3. the detail sheet', () => {
    it('is one shared sheet component for both layouts', () => {
        expect(existsSync(join(SRC, SHEET)), 'MenuSheet.tsx').toBe(true);
        const tpl = shipped(TEMPLATE);
        expect((tpl.match(/<MenuSheet\b/g) ?? []).length, 'photo and compact layouts both use it').toBe(2);
    });

    it('keeps rendering through the close slide and tells the parent when it has gone', () => {
        const sheet = shipped(SHEET);
        expect(sheet).toMatch(/onExited/);
        expect(sheet).toMatch(/SHEET_CLOSE_MS/);
        const tpl = shipped(TEMPLATE);
        expect(tpl, 'the parent must not unmount the sheet on close').toMatch(/setProductOpen\(false\)/);
    });

    it('locks scrolling on <html>, never on <body> — body overflow breaks the sticky header', () => {
        // globals.css sets overflow-x: clip on html. With that, `body {overflow:
        // hidden}` turns body into its own scroll container, and the sticky
        // header sticks to THAT (scrollTop 0) — it jumps off screen while a
        // sheet is open. That is the header "vanishing" in the recording.
        expect(shipped(TEMPLATE)).not.toMatch(/document\.body\.style\.overflow/);
        const lock = shipped('hooks/useScrollLock.ts');
        expect(lock).toMatch(/document\.documentElement/);
        expect(lock).not.toMatch(/document\.body\.style\.overflow/);
    });

    it('puts the photo sheet\'s × inside the sliding element', () => {
        expect(shipped(SHEET), 'MenuSheet takes the floating button as a slot').toMatch(/above/);
        expect(templateCss()).toMatch(/\.qr-sheet-x\s*\{[^}]*120ms/);
    });

    it('gives both layouts a drag handle', () => {
        expect(shipped(SHEET)).toMatch(/data-testid="sheet-handle"/);
    });

    it('decides a drag release by distance or speed', async () => {
        const { shouldDismissSheet } = await import('@/lib/menu/menuMotion');
        expect(shouldDismissSheet(150, 600, 0)).toBe(false);   // exactly 25%
        expect(shouldDismissSheet(151, 600, 0)).toBe(true);    // past 25%
        expect(shouldDismissSheet(60, 600, 0.51)).toBe(true);  // flick
        expect(shouldDismissSheet(60, 600, 0.4)).toBe(false);
        expect(shouldDismissSheet(60, 600, -2)).toBe(false);   // flung back up
        expect(shouldDismissSheet(0, 0, 0)).toBe(false);
    });

    it('measures release speed over the last moments of the drag, not the whole drag', async () => {
        const { releaseVelocity } = await import('@/lib/menu/menuMotion');
        // A slow 300ms drag that ends with the finger resting: speed ~0.
        const rest = [{ t: 0, y: 0 }, { t: 100, y: 30 }, { t: 200, y: 60 }, { t: 300, y: 90 }, { t: 450, y: 90 }];
        expect(releaseVelocity(rest)).toBeLessThan(0.1);
        // A flick: 80px in 24ms.
        const flick = [{ t: 0, y: 0 }, { t: 8, y: 20 }, { t: 16, y: 40 }, { t: 24, y: 80 }];
        expect(releaseVelocity(flick)).toBeGreaterThan(2);
        expect(releaseVelocity([])).toBe(0);
    });

    it('does not count the lift\'s own latency as the finger slowing down', async () => {
        // Measured in a real browser: a 0.6 px/ms flick whose touchend landed
        // 48ms after the last move read as 0.25 px/ms and sprang back.
        const { releaseVelocity } = await import('@/lib/menu/menuMotion');
        const moves = [{ t: 0, y: 0 }, { t: 41, y: 20 }, { t: 73, y: 40 }, { t: 105, y: 60 }];
        expect(releaseVelocity(moves, 153)).toBeGreaterThan(0.5);
        // …but a finger that sat still for 150ms before lifting has stopped.
        expect(releaseVelocity(moves, 260)).toBe(0);
    });

    it('lightens the overlay with the drag', async () => {
        const { dragOverlayOpacity } = await import('@/lib/menu/menuMotion');
        expect(dragOverlayOpacity(0, 600)).toBe(1);
        expect(dragOverlayOpacity(300, 600)).toBe(0.5);
        expect(dragOverlayOpacity(900, 600)).toBe(0);
        expect(dragOverlayOpacity(-40, 600)).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Tap feedback
// ─────────────────────────────────────────────────────────────────────────────

describe('4. tap feedback', () => {
    it('darkens with an overlay\'s opacity rather than animating background colour', async () => {
        const css = await motionCss();
        expect(css).toMatch(/\.qr-card-press::after/);
        expect(css).toMatch(/\.qr-chip::after/);
        expect(css).toMatch(/\[data-pressed='true'\]/);
    });

    it('turns off the Android tap flash on everything the menu draws, overlays included', () => {
        // Sheets and overlays render as SIBLINGS of the shell — menu-theme.test.ts
        // pins the themed root to a bare <div style={themeVars}> — so the rule
        // has to reach them through the sibling combinator.
        expect(templateCss()).toMatch(/\.qr-wrap ~ \*[^{]*\{[^}]*-webkit-tap-highlight-color:\s*transparent/);
    });

    it('never makes a sold-out card pressable', async () => {
        const { default: MenuItemCard } = await import('@/components/templates/MenuItemCard');
        const product = { id: 'x', name: 'Placeholder dish', selling_price: 1 };
        const live = renderToStaticMarkup(React.createElement(MenuItemCard, { product, onSelect: () => {} }));
        const out = renderToStaticMarkup(React.createElement(MenuItemCard, { product, onSelect: () => {}, soldOut: true }));
        expect(live).toMatch(/qr-card-press/);
        expect(out).not.toMatch(/qr-card-press/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5-6. Category switch and the active chip
// ─────────────────────────────────────────────────────────────────────────────

describe('5-6. category switch', () => {
    it('swaps chip colours instantly — no colour transition to pass through grey', async () => {
        const css = await motionCss();
        const chipRule = /\.qr-chip\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
        expect(chipRule).not.toMatch(/background-color|border-color|\bcolor\b/);
    });

    it('drives the chip from its own state and the list from a second, later one', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).toMatch(/listCategory/);
        expect(tpl).toMatch(/LIST_OUT_MS/);
        expect(tpl).toMatch(/data-testid="menu-list"/);
    });

    it('commits only the first screenful at the swap, the rest as a transition', () => {
        // Mounting a whole "All" list in the swap was a 166ms main-thread task
        // on a desktop — a blank list on a phone. The swap is now bounded.
        const tpl = shipped(TEMPLATE);
        expect(tpl).toMatch(/setListLimit\(ENTER_COUNT\)/);
        expect(tpl).toMatch(/startTransition\(/);
        expect(tpl, 'the page keeps its height while the rest renders').toMatch(/minHeight: heldListHeight/);
    });

    it('has no per-card reveal on scroll', () => {
        expect(shipped(CARD)).not.toMatch(/qr-rise/);
    });

    it('centres the active chip with the browser\'s own smooth scroll', async () => {
        const { centeredScrollLeft } = await import('@/lib/menu/menuMotion');
        // Row 300 wide, content 1000 wide; chip at 600..680 → centre 640 → 490.
        expect(centeredScrollLeft({ chipLeft: 600, chipWidth: 80, rowWidth: 300, scrollWidth: 1000 })).toBe(490);
        expect(centeredScrollLeft({ chipLeft: 10, chipWidth: 80, rowWidth: 300, scrollWidth: 1000 })).toBe(0);
        expect(centeredScrollLeft({ chipLeft: 950, chipWidth: 50, rowWidth: 300, scrollWidth: 1000 })).toBe(700);
        expect(shipped(TEMPLATE)).toMatch(/behavior: reduceMotion \? 'auto' : 'smooth'/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. Photos
// ─────────────────────────────────────────────────────────────────────────────

describe('7. photos', () => {
    it('holds the square with the warm placeholder, not a white box or a shimmer', () => {
        const card = shipped(CARD);
        expect(card).toMatch(/T\.photoWait/);
        expect(card).not.toMatch(/qr-skel/);
        expect(templateCss()).not.toMatch(/qrShimmer/);
    });

    it('shows a photo it has already shown without fading it again', () => {
        const card = shipped(CARD);
        expect(card, 'remembers what has loaded across remounts').toMatch(/seenPhotos/);
        expect(card).toMatch(/'instant'/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Chip bar
// ─────────────────────────────────────────────────────────────────────────────

describe('8. chip bar quick return', () => {
    it('hides only after 48px of CONTINUOUS downward travel', async () => {
        const { quickReturnStep, QUICK_RETURN_START } = await import('@/hooks/useQuickReturn');
        const opts = { offset: 140, upTolerance: 16, downTolerance: 48 };
        let s = { ...QUICK_RETURN_START, lastY: 500 };
        for (const y of [510, 520, 530, 540]) s = quickReturnStep(s, y, opts);
        expect(s.pinned, '40px is not enough').toBe(true);
        s = quickReturnStep(s, 549, opts);
        expect(s.pinned, '49px is').toBe(false);

        // Wobble: 40 down, 4 up, 40 down — never 48 in one direction.
        let w = { ...QUICK_RETURN_START, lastY: 500 };
        for (const y of [520, 540, 536, 556, 576]) w = quickReturnStep(w, y, opts);
        expect(w.pinned).toBe(true);
    });

    it('shows after 16px up', async () => {
        const { quickReturnStep, QUICK_RETURN_START } = await import('@/hooks/useQuickReturn');
        const opts = { offset: 140, upTolerance: 16, downTolerance: 48 };
        let s = { ...QUICK_RETURN_START, pinned: false, lastY: 800 };
        s = quickReturnStep(s, 790, opts);
        expect(s.pinned).toBe(false);
        s = quickReturnStep(s, 783, opts);
        expect(s.pinned).toBe(true);
    });

    it('freezes while a sheet is open instead of forcing the bar back', () => {
        const hook = shipped('hooks/useQuickReturn.ts');
        const disabledBranch = /if \(disabled\) \{([\s\S]*?)\n\s{8}\}/.exec(hook)?.[1] ?? '';
        expect(disabledBranch, 'disabled must not pin the bar').not.toMatch(/setPinned\(true\)/);
    });

    it('slides in ease-out and out ease-in', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).toMatch(/BAR_SHOW_MS/);
        expect(tpl).toMatch(/BAR_HIDE_MS/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Banner carousel
// ─────────────────────────────────────────────────────────────────────────────

describe('9. banner carousel', () => {
    it('autoplays on a 5s timer that stops off screen and under reduced motion', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).not.toMatch(/\}, 3000\)/);
        expect(tpl).toMatch(/BANNER_EVERY_MS/);
        expect(tpl).toMatch(/IntersectionObserver/);
        expect(tpl).toMatch(/BANNER_HOLD_MS/);
    });

    it('widens the active dot with transforms, not width', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).not.toMatch(/transition: 'width/);
        expect(tpl).toMatch(/scaleX/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Don'ts
// ─────────────────────────────────────────────────────────────────────────────

describe('don\'ts', () => {
    const durations = (css: string) => [
        ...Array.from(css.matchAll(/(\d+(?:\.\d+)?)ms/g)).map(m => Number(m[1])),
        ...Array.from(css.matchAll(/(?<![\w.-])(\d*\.?\d+)s\b/g)).map(m => Number(m[1]) * 1000),
    ];

    it('nothing in the menu stylesheets runs longer than 400ms', async () => {
        for (const css of [templateCss(), await motionCss()]) {
            for (const d of durations(css)) expect(d).toBeLessThanOrEqual(400);
        }
    });

    it('nothing loops', async () => {
        for (const css of [templateCss(), await motionCss()]) expect(css).not.toMatch(/infinite/);
    });

    it('transitions only transform and opacity', async () => {
        for (const css of [templateCss(), await motionCss()]) {
            for (const m of css.matchAll(/transition:\s*([^;}]+)/g)) {
                for (const part of m[1].split(/,(?![^(]*\))/)) {
                    const prop = part.trim().split(/\s+/)[0];
                    if (/^\d/.test(prop)) continue; // `transition-duration`-style shorthand
                    expect(['transform', 'opacity', 'none'], `transition on ${prop}`).toContain(prop);
                }
            }
        }
    });

    it('no bounce', async () => {
        for (const css of [templateCss(), await motionCss()]) {
            for (const m of css.matchAll(/cubic-bezier\(([^)]+)\)/g)) {
                const [, y1, , y2] = m[1].split(',').map(Number);
                expect(y1 <= 1 && y2 <= 1, `overshoot curve cubic-bezier(${m[1]})`).toBe(true);
            }
        }
    });

    it('stands down for reduced motion in both stylesheets', async () => {
        expect(templateCss()).toMatch(/prefers-reduced-motion/);
        expect(await motionCss()).toMatch(/prefers-reduced-motion/);
        expect(await motionCss()).toMatch(/120ms/);
    });

    it('adds no smooth-scroll library', () => {
        const pkg = readFileSync(join(WEB, 'package.json'), 'utf8');
        expect(pkg).not.toMatch(/smooth-scroll|smoothscroll|lenis|locomotive/i);
    });
});
