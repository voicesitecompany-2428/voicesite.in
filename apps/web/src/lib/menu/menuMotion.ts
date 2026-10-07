/**
 * The menu's motion system. One system, shared by all three designs.
 *
 * The menu has to read as an app, not a web page — a diner who scans a QR code
 * has a Swiggy-shaped expectation of how a list should feel, and a page that
 * simply appears reads as cheap next to it.
 *
 * ─── MOTION IS NOT THE EIGHTH THEME KNOB ─────────────────────────────────────
 * Deliberately NOT per-theme. "Smooth" is a baseline quality, not a brand
 * attribute, and per-design timings would triple the motion QA — which is the
 * whole economic argument for shipping three designs instead of six. Classic,
 * Cafe and Premium run identical timings.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Every number below is the product designer's, from the 2026-10-04 review of
 * a screen recording of the QA store (tests/acceptance/menu-motion-polish).
 * The rules that review set for the whole surface:
 *
 *   1. TRANSFORM AND OPACITY ONLY. Never height, width, top, left, margin —
 *      or colour. Where the designer asks for a darker card or a grey chip,
 *      it is an overlay whose OPACITY changes, so it stays on the compositor
 *      on the mid-range Androids most diners carry.
 *
 *   2. NO BOUNCE, NOTHING OVER 400ms. The one exception is the designer's own
 *      500ms banner slide, which moves a whole photo across the screen.
 *
 *   3. NO PER-CARD FADE AS ROWS SCROLL INTO VIEW. It slows scanning. Cards
 *      animate only when the reader switches category, and only the first
 *      screenful.
 *
 *   4. SCROLLING BELONGS TO THE BROWSER. Native `behavior: 'smooth'` only — no
 *      JavaScript smooth-scroll library.
 *
 *   5. STAND DOWN FOR prefers-reduced-motion: 120ms fades instead of slides,
 *      and no carousel autoplay. Motion sickness is real, and this is a page
 *      people read while eating.
 *
 * MENU_MOTION_CSS below may interpolate only a handful of module constants
 * (brandColorInjection.test.ts), so the rest of its numbers are written as
 * literals. They are the same numbers as the constants; the Playwright suite
 * measures the rendered values against the designer's.
 */

// ── Curves ───────────────────────────────────────────────────────────────────

/** The settle curve: fast departure, long settle, no overshoot. Sheets open on it. */
export const SETTLE = 'cubic-bezier(0.32, 0.72, 0, 1)';
/** Something arriving: slows into place. */
export const EASE_OUT = 'cubic-bezier(0, 0, 0.2, 1)';
/** Something leaving: accelerates away, so it is gone before it is noticed. */
export const EASE_IN = 'cubic-bezier(0.4, 0, 1, 1)';

// ── 1-3. Detail sheet ───────────────────────────────────────────────────────

export const SHEET_OPEN_MS = 320;
export const SHEET_CLOSE_MS = 220;
export const OVERLAY_FADE_MS = 200;
/** The overlay settles at 50% black. */
export const OVERLAY_ALPHA = 0.5;
/** The photo sheet's ×, which rides up with the sheet and fades in. */
export const SHEET_X_FADE_MS = 120;
export const SPRING_BACK_MS = 200;
/** A drag past this fraction of the sheet's height closes it… */
export const DISMISS_FRACTION = 0.25;
/** …and so does a flick faster than this, in px/ms, however short. */
export const DISMISS_VELOCITY = 0.5;

// ── 4. Press feedback ───────────────────────────────────────────────────────

export const PRESS_CARD = 0.98;
export const PRESS_IN_MS = 80;
export const PRESS_OUT_MS = 150;

// ── 5. Category switch ──────────────────────────────────────────────────────

export const LIST_OUT_MS = 100;
export const LIST_IN_MS = 180;
export const LIST_RISE_PX = 8;
export const STAGGER_MS = 30;
/** Only the first four cards are staggered; the rest arrive with the fourth. */
export const STAGGER_COUNT = 4;
/**
 * How many cards carry the entrance at all. Past the first screenful a card is
 * off screen when it lands, and `content-visibility: auto` can hold its
 * animation until it scrolls in — which is exactly the per-row fade on scroll
 * the designer ruled out.
 */
export const ENTER_COUNT = 8;

/** Delay for the nth card of a freshly switched list. */
export function listEnterDelayMs(index: number): number {
    return Math.min(Math.max(index, 0), STAGGER_COUNT - 1) * STAGGER_MS;
}

// ── 7. Photos ───────────────────────────────────────────────────────────────

export const PHOTO_FADE_MS = 200;

// ── 8. Chip bar ─────────────────────────────────────────────────────────────

export const BAR_SHOW_MS = 200;
export const BAR_HIDE_MS = 180;

// ── 9. Banner carousel ──────────────────────────────────────────────────────

export const BANNER_EVERY_MS = 5000;
export const BANNER_SLIDE_MS = 500;
export const BANNER_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
/** Autoplay waits this long after the reader swipes or taps a dot. */
export const BANNER_HOLD_MS = 8000;
/** Horizontal travel that counts as a swipe rather than a wobbly tap. */
export const BANNER_SWIPE_PX = 40;
export const DOT_W = 6;
export const DOT_ACTIVE_W = 16;
export const DOT_GAP = 4;
export const DOT_MS = 250;

// ── 10. Reduced motion ──────────────────────────────────────────────────────

export const REDUCED_FADE_MS = 120;

// ── Pure decisions ──────────────────────────────────────────────────────────

/**
 * Should a released drag close the sheet?
 *
 * Distance OR speed: a long slow drag means "away", and so does a short fast
 * flick — that second case is what makes a sheet feel like it is on your
 * finger rather than on a rail. A flick back UP (negative velocity) never
 * closes, however far the sheet had travelled before it.
 */
export function shouldDismissSheet(dragPx: number, sheetHeight: number, velocityPxPerMs: number): boolean {
    if (sheetHeight <= 0) return false;
    if (velocityPxPerMs < 0) return false;
    return dragPx > sheetHeight * DISMISS_FRACTION || velocityPxPerMs > DISMISS_VELOCITY;
}

/** Window of movement history that counts as "the release". */
const VELOCITY_WINDOW_MS = 80;
/** A finger still for longer than this before lifting has stopped, not flicked. */
const REST_MS = 100;

/**
 * Speed at release, in px/ms, from the last ~80ms of MOVEMENT.
 *
 * Averaging over the whole drag would call a slow drag that ends in a flick
 * "slow", and a fast drag that came to rest "fast". Only the end matters.
 *
 * `releasedAt` is when the finger lifted. It is deliberately NOT folded into
 * the window: the lift arrives a frame or more after the last move — longer on
 * a phone with a laggy digitiser — and counting that gap as stillness halved a
 * real 0.6 px/ms flick to 0.25 and sprang the sheet back. Only a finger that
 * sat still for REST_MS before lifting counts as stopped.
 */
export function releaseVelocity(
    samples: ReadonlyArray<{ t: number; y: number }>,
    releasedAt?: number,
): number {
    if (samples.length < 2) return 0;
    const last = samples[samples.length - 1];
    if (releasedAt !== undefined && releasedAt - last.t > REST_MS) return 0;
    let first = samples[samples.length - 2];
    for (let i = samples.length - 2; i >= 0; i--) {
        if (last.t - samples[i].t > VELOCITY_WINDOW_MS) break;
        first = samples[i];
    }
    const dt = last.t - first.t;
    return dt > 0 ? (last.y - first.y) / dt : 0;
}

/** The overlay's opacity (relative to its settled 50%) while the sheet is dragged. */
export function dragOverlayOpacity(dragPx: number, sheetHeight: number): number {
    if (sheetHeight <= 0 || dragPx <= 0) return 1;
    return Math.max(0, Math.min(1, 1 - dragPx / sheetHeight));
}

/**
 * The scrollLeft that puts a chip in the middle of its row, clamped to what
 * the row can actually scroll. `chipLeft` is in the row's content coordinates.
 */
export function centeredScrollLeft({ chipLeft, chipWidth, rowWidth, scrollWidth }: {
    chipLeft: number; chipWidth: number; rowWidth: number; scrollWidth: number;
}): number {
    const ideal = chipLeft + chipWidth / 2 - rowWidth / 2;
    const max = Math.max(0, scrollWidth - rowWidth);
    return Math.round(Math.max(0, Math.min(max, ideal)));
}

/**
 * The stylesheet, injected once by QRMenuTemplate.
 *
 * Interpolates only module constants — never anything the owner supplied. The
 * owner's brand colour reaches the page as a CSS custom property instead, so
 * nothing user-controlled is ever concatenated into a style block.
 */
export const MENU_MOTION_CSS = `
/* Row 4 — press. The darker card and the grey chip are overlays whose opacity
   changes; background colour itself never animates. In over 80ms, out over
   150ms: the pressed state is set by the pressFeedback handlers, which hold it
   for at least 80ms so even a quick tap is seen. */
.qr-card-press { transition: transform 150ms cubic-bezier(0, 0, 0.2, 1); }
.qr-card-press::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: rgba(25, 25, 25, 0.05); opacity: 0; pointer-events: none;
  transition: opacity 150ms cubic-bezier(0, 0, 0.2, 1);
}
.qr-card-press[data-pressed='true'] { transform: scale(${PRESS_CARD}); transition-duration: 80ms; }
.qr-card-press[data-pressed='true']::after { opacity: 1; transition-duration: 80ms; }

/* Chips change colour on the tap itself: no colour transition, so there is no
   halfway grey for either chip to pass through. */
.qr-chip { position: relative; overflow: hidden; }
.qr-chip::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: rgba(0, 0, 0, 0.08); opacity: 0; pointer-events: none;
  transition: opacity 150ms cubic-bezier(0, 0, 0.2, 1);
}
.qr-chip[data-pressed='true']::after { opacity: 1; transition-duration: 80ms; }

/* Row 5 — category switch. The old list fades out over 100ms; the new one's
   first screenful rises 8px and fades in over 180ms, the first four cards
   ${STAGGER_MS}ms apart. Nothing else on the list ever animates. */
.qr-list[data-phase='out'] { opacity: 0; transition: opacity 100ms cubic-bezier(0.4, 0, 1, 1); }
@keyframes qr-enter {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: none; }
}
@keyframes qr-fade { from { opacity: 0; } to { opacity: 1; } }
.qr-enter {
  animation: qr-enter 180ms cubic-bezier(0, 0, 0.2, 1) backwards;
  animation-delay: var(--qr-enter-delay, 0ms);
}
/* Reduced motion's stand-in for a slide (the banner swaps this way). */
.qr-fade-in { animation: qr-fade 120ms linear backwards; }

/* A long menu must not paint rows nobody has scrolled to yet. */
.qr-section { content-visibility: auto; contain-intrinsic-size: auto 640px; }

/* Row 7 — photos fade in over 200ms once decoded. A photo already shown
   once this visit is marked 'instant' and simply appears. */
.qr-thumb-img { opacity: 0; transition: opacity 200ms cubic-bezier(0, 0, 0.2, 1); }
.qr-thumb-img[data-loaded='true'] { opacity: 1; }
.qr-thumb-img[data-loaded='instant'] { opacity: 1; transition: none; }

/* Row 10 — reduced motion: fades of 120ms, nothing slides or scales. */
@media (prefers-reduced-motion: reduce) {
  .qr-card-press, .qr-card-press[data-pressed='true'] { transform: none; }
  .qr-enter { animation: qr-fade 120ms linear backwards; animation-delay: 0ms; }
  .qr-thumb-img { transition-duration: 120ms; }
}
`;
