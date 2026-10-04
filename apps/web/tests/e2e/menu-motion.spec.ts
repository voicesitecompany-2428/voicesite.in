import { test, expect, devices, type Page, type CDPSession, type TestInfo } from '@playwright/test';

/**
 * The QR menu's motion, measured frame by frame on a phone viewport.
 *
 * Source: the product designer's ten-point review of a screen recording of
 * /shop/gowtham-123 (the QA store — every dish has a photo, it has a sold-out
 * soup, size-picker dishes and two banners). Each describe below is one row of
 * that review; the numbers asserted are the designer's numbers.
 *
 * Every measurement samples the page on requestAnimationFrame, so what is
 * asserted is what a phone would actually paint — not what a stylesheet says.
 * Each test attaches its raw frames as JSON, which is the evidence trail.
 *
 * Needs a running server: `npm run build && npm run start` (port 3000).
 * Override the store with MOTION_SHOP.
 */

const SHOP = process.env.MOTION_SHOP ?? 'gowtham-123';
const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices['Pixel 5'];
test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch, video: 'on' });
test.describe.configure({ timeout: 90_000 });

const CARD = '[data-testid="menu-item-card"]';
const LIVE_CARD = `${CARD}:not([data-soldout="true"])`;
const DIALOG = '[role="dialog"][aria-modal="true"]';

// ── In-page probes ───────────────────────────────────────────────────────────

interface Frame { t: number; [k: string]: unknown }
interface SheetProbe {
    present: boolean; moved: number; dim: number; headerTop: number;
    headerVisible: boolean; locked: boolean; pinned: string | null; height: number;
}
interface Probes {
    frames: (ms: number, probe: () => Record<string, unknown>, kick?: () => void) => Promise<Frame[]>;
    sheet: () => SheetProbe;
    sheetEl: () => HTMLElement | null;
    nextFrames: (n: number) => Promise<void>;
}
type ProbeWindow = Window & { __m: Probes };

function installProbes() {
    const alpha = (c: string) => {
        const m = /rgba?\(([^)]+)\)/.exec(c);
        if (!m) return 0;
        const parts = m[1].split(',').map(s => parseFloat(s));
        return parts.length === 4 ? parts[3] : 1;
    };
    const sheetEl = (): HTMLElement | null => {
        const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (!dlg) return null;
        return (dlg.querySelector('[data-testid="menu-sheet"]') as HTMLElement | null)
            ?? (dlg.lastElementChild as HTMLElement | null);
    };
    const probes: Probes = {
        frames(ms, probe, kick) {
            return new Promise(resolve => {
                const out: Frame[] = [];
                const t0 = performance.now();
                if (kick) kick();
                const tick = () => {
                    const t = performance.now() - t0;
                    out.push({ t: Math.round(t), ...probe() });
                    if (t < ms) requestAnimationFrame(tick); else resolve(out);
                };
                requestAnimationFrame(tick);
            });
        },
        sheetEl,
        sheet() {
            const header = document.querySelector('header');
            const hr = header?.getBoundingClientRect();
            const html = getComputedStyle(document.documentElement).overflowY;
            const body = getComputedStyle(document.body).overflowY;
            const bar = document.querySelector('[data-testid="category-bar"]');
            const base = {
                headerTop: hr ? Math.round(hr.top * 10) / 10 : NaN,
                headerVisible: !!hr && hr.bottom > 0 && hr.top > -1,
                locked: html === 'hidden' || body === 'hidden',
                pinned: bar?.getAttribute('data-pinned') ?? null,
            };
            const dlg = document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement | null;
            const sheet = sheetEl();
            if (!dlg || !sheet) return { present: false, moved: 1, dim: 0, height: 0, ...base };
            const r = sheet.getBoundingClientRect();
            const moved = Math.max(0, Math.min(1, (r.bottom - window.innerHeight) / r.height));
            const bd = dlg.querySelector('[data-testid="sheet-backdrop"]') as HTMLElement | null;
            const dlgOpacity = parseFloat(getComputedStyle(dlg).opacity);
            const dim = dlgOpacity * (bd
                ? parseFloat(getComputedStyle(bd).opacity) * alpha(getComputedStyle(bd).backgroundColor)
                : alpha(getComputedStyle(dlg).backgroundColor));
            return {
                present: true, moved: Math.round(moved * 1000) / 1000,
                dim: Math.round(dim * 1000) / 1000, height: Math.round(r.height), ...base,
            };
        },
        nextFrames(n) {
            return new Promise(resolve => {
                let left = n;
                const tick = () => { left -= 1; if (left <= 0) resolve(); else requestAnimationFrame(tick); };
                requestAnimationFrame(tick);
            });
        },
    };
    (window as unknown as ProbeWindow).__m = probes;
}

async function gotoMenu(page: Page) {
    await page.addInitScript(installProbes);
    await page.goto(`/shop/${SHOP}`, { waitUntil: 'networkidle' });
    await expect(page.locator(CARD).first()).toBeVisible();
    // Let the first-screen photos land so later measurements are not racing them.
    await page.waitForTimeout(400);
}

async function evidence(testInfo: TestInfo, name: string, data: unknown) {
    await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

/** Opens live cards in turn until one opens the requested sheet kind; returns its index. */
async function findSheet(page: Page, kind: 'photo' | 'compact'): Promise<number> {
    const n = await page.locator(LIVE_CARD).count();
    for (let i = 0; i < Math.min(n, 12); i++) {
        await page.locator(LIVE_CARD).nth(i).evaluate(el => (el as HTMLElement).click());
        await expect(page.locator(DIALOG)).toHaveCount(1);
        const isPhoto = await page.locator(`${DIALOG} h2`).count() > 0;
        await page.keyboard.press('Escape');
        await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 2000 });
        await page.waitForTimeout(100);
        if ((kind === 'photo') === isPhoto) return i;
    }
    throw new Error(`no ${kind} sheet among the first cards of ${SHOP}`);
}

async function openSheet(page: Page, index: number) {
    await page.locator(LIVE_CARD).nth(index).evaluate(el => (el as HTMLElement).click());
    await expect(page.locator(DIALOG)).toHaveCount(1);
    await page.waitForTimeout(500);
}

const sheetFrames = (page: Page, ms: number, kick: string) =>
    page.evaluate(([duration, action]) => {
        const m = (window as unknown as ProbeWindow).__m;
        // eslint-disable-next-line no-new-func
        const run = new Function(action) as () => void;
        return m.frames(duration as number, () => ({ ...m.sheet() }), run);
    }, [ms, kick] as const) as Promise<Array<Frame & SheetProbe>>;

async function touch(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x = 0, y = 0) {
    await cdp.send('Input.dispatchTouchEvent', {
        type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }],
    });
}

// ── 1 + 2. Sheet open and close ─────────────────────────────────────────────

test.describe('1-2. detail sheet open and close', () => {
    test('opens on 320ms cubic-bezier(.32,.72,0,1), overlay to 50% over 200ms, header never moves, × inside the sheet', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'photo');
        await page.evaluate(() => window.scrollTo(0, 420));
        await page.waitForTimeout(300);

        // Animation timings are read on the first frame the sheet exists — a
        // 320ms animation has finished (and left getAnimations()) by the end.
        const { frames, timing } = await page.evaluate(([i, sel]) => {
            const m = (window as unknown as ProbeWindow).__m;
            let timing: { duration?: unknown; easing?: string; closeInsideSheet?: boolean; closeFade?: unknown } | null = null;
            return m.frames(450, () => {
                const s = m.sheet();
                const sheet = m.sheetEl();
                if (s.present && sheet && !timing) {
                    const close = sheet.closest('[role="dialog"]')!.querySelector('button[aria-label="Close"]') as HTMLElement;
                    timing = {
                        duration: sheet.getAnimations()[0]?.effect?.getTiming().duration,
                        easing: getComputedStyle(sheet).animationTimingFunction,
                        closeInsideSheet: sheet.contains(close),
                        closeFade: close.getAnimations()[0]?.effect?.getTiming().duration,
                    };
                }
                return { ...s };
            }, () => (document.querySelectorAll(sel as string)[i as number] as HTMLElement).click())
                .then(f => ({ frames: f as Array<Frame & SheetProbe>, timing }));
        }, [idx, LIVE_CARD] as const);
        await evidence(testInfo, 'open-frames.json', frames);
        await evidence(testInfo, 'open-timing.json', timing);

        const present = frames.filter(f => f.present);
        expect(present.length, 'the sheet must appear').toBeGreaterThan(5);
        for (const f of frames) {
            expect(f.headerVisible, `header hidden at ${f.t}ms`).toBe(true);
            expect(Math.abs(f.headerTop), `header moved at ${f.t}ms`).toBeLessThanOrEqual(0.5);
        }
        expect(present.at(-1)!.dim, 'overlay settles at 50% black').toBeCloseTo(0.5, 1);
        expect(present[0].dim, 'overlay starts near 0').toBeLessThan(0.2);
        const dimDone = present.find(f => f.dim >= 0.49);
        expect(dimDone && dimDone.t, 'overlay reaches 50% within ~200ms').toBeLessThanOrEqual(240);

        expect(timing, 'sheet never appeared').not.toBeNull();
        expect(timing!.duration).toBe(320);
        expect(timing!.easing).toBe('cubic-bezier(0.32, 0.72, 0, 1)');
        expect(timing!.closeInsideSheet, '× must slide up with the sheet').toBe(true);
        expect(timing!.closeFade, '× fades in over 120ms').toBe(120);
    });

    test('closes by sliding down over 220ms ease-in while the overlay fades; scroll unlocks only after', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'photo');
        await page.evaluate(() => window.scrollTo(0, 420));
        await page.waitForTimeout(300);
        await openSheet(page, idx);

        const frames = await sheetFrames(page, 450,
            `document.querySelector('${DIALOG} button[aria-label="Close"]').click()`);
        await evidence(testInfo, 'close-frames.json', frames);

        const present = frames.filter(f => f.present);
        const sliding = present.filter(f => f.moved > 0.02 && f.moved < 0.98);
        expect(sliding.length, 'the sheet must be seen sliding, not vanish in one frame').toBeGreaterThanOrEqual(6);
        const lastPresent = present.at(-1)!;
        expect(lastPresent.t, 'slide lasts ~220ms').toBeGreaterThanOrEqual(180);
        expect(lastPresent.t).toBeLessThanOrEqual(300);
        for (let i = 1; i < present.length; i++) {
            expect(present[i].moved, 'slides one way only').toBeGreaterThanOrEqual(present[i - 1].moved - 0.001);
        }
        const mid = present.find(f => f.t >= 100 && f.t <= 125);
        expect(mid && mid.moved, 'ease-in: under half way at the midpoint').toBeLessThan(0.5);
        const dimMid = present.find(f => f.t >= 90 && f.t <= 120);
        expect(dimMid && dimMid.dim, 'overlay is fading, not snapping').toBeGreaterThan(0.05);
        for (const f of present) expect(f.locked, `scroll unlocked mid-slide at ${f.t}ms`).toBe(true);
        expect(frames.at(-1)!.locked, 'scroll unlocks after the slide').toBe(false);
        for (const f of frames) {
            expect(Math.abs(f.headerTop), `header moved at ${f.t}ms`).toBeLessThanOrEqual(0.5);
            expect(f.pinned, 'chip bar does not toggle on close').toBe(frames[0].pinned);
        }
    });

    test('the compact (size-picker) sheet slides out too and carries a drag handle', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'compact');
        await openSheet(page, idx);
        const handles = await page.locator(`${DIALOG} [data-testid="sheet-handle"]`).count();
        const frames = await sheetFrames(page, 400, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
        await evidence(testInfo, 'compact-close-frames.json', { handles, frames });
        expect(handles, 'compact sheet has a drag handle').toBe(1);
        expect(frames.filter(f => f.present && f.moved > 0.02 && f.moved < 0.98).length).toBeGreaterThanOrEqual(6);
    });
});

// ── 3. Drag to close ────────────────────────────────────────────────────────

test.describe('3. drag to close', () => {
    async function handlePoint(page: Page) {
        return page.evaluate(() => {
            const sheet = (window as unknown as ProbeWindow).__m.sheetEl()!;
            const h = sheet.querySelector('[data-testid="sheet-handle"]') ?? sheet;
            const r = h.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 12), H: sheet.getBoundingClientRect().height };
        });
    }

    test('follows the finger 1:1, lightens the overlay, springs back under 25%', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'photo');
        await openSheet(page, idx);
        const cdp = await page.context().newCDPSession(page);
        const { x, y, H } = await handlePoint(page);

        await touch(cdp, 'touchStart', x, y);
        const drag = Math.round(H * 0.1);
        for (let d = 6; d <= drag; d += 6) { await touch(cdp, 'touchMove', x, y + d); await page.waitForTimeout(30); }
        const mid = await page.evaluate(() => (window as unknown as ProbeWindow).__m.sheet());
        const dragged = Math.floor(drag / 6) * 6;
        await page.waitForTimeout(150);
        const settle = page.evaluate(() => {
            const m = (window as unknown as ProbeWindow).__m;
            return m.frames(400, () => ({ ...m.sheet() }));
        });
        await touch(cdp, 'touchEnd');
        const back = await settle as Array<Frame & SheetProbe>;
        await evidence(testInfo, 'drag-spring-back.json', { H, dragged, mid, back });

        expect(Math.abs(mid.moved * mid.height - dragged), 'sheet follows the finger 1:1').toBeLessThanOrEqual(3);
        expect(mid.dim, 'overlay lightens while dragging').toBeLessThan(0.48);
        expect(back.every(f => f.present), 'a short drag must not close').toBe(true);
        const home = back.find(f => f.moved < 0.005);
        expect(home && home.t, 'springs back over ~200ms').toBeLessThanOrEqual(260);
    });

    test('closes past 25% of its height', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'photo');
        await openSheet(page, idx);
        const cdp = await page.context().newCDPSession(page);
        const { x, y, H } = await handlePoint(page);
        await touch(cdp, 'touchStart', x, y);
        const drag = Math.round(H * 0.3);
        for (let d = 6; d <= drag; d += 6) { await touch(cdp, 'touchMove', x, y + d); await page.waitForTimeout(30); }
        await page.waitForTimeout(150); // finger rests: velocity ~0, so only distance can close it
        await touch(cdp, 'touchEnd');
        await page.waitForTimeout(600);
        const stillOpen = await page.locator(DIALOG).count();
        await evidence(testInfo, 'drag-close.json', { H, drag, fractionOfHeight: drag / H, stillOpen });
        expect(stillOpen, 'a drag past 25% closes the sheet').toBe(0);
    });

    test('closes on a flick faster than 0.5 px/ms even when short', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'photo');
        await openSheet(page, idx);
        const { x, y, H } = await handlePoint(page);
        // A flick needs controlled timing: each CDP round trip costs 25-50ms,
        // which can make a "flick" genuinely slower than 0.5 px/ms. So this one
        // is dispatched inside the page — 80px in four 12ms steps, lifting at
        // once — through the same listeners a finger reaches.
        const gesture = await page.evaluate(async ({ px, py }) => {
            const target = document.elementFromPoint(px, py)!;
            const times: number[] = [];
            const fire = (type: string, cy: number) => {
                const t = new Touch({ identifier: 1, target, clientX: px, clientY: cy });
                const live = type === 'touchend' ? [] : [t];
                const ev = new TouchEvent(type, { touches: live, targetTouches: live, changedTouches: [t], bubbles: true, cancelable: true });
                target.dispatchEvent(ev);
                times.push(ev.timeStamp);
            };
            fire('touchstart', py);
            for (let d = 20; d <= 80; d += 20) { await new Promise(r => setTimeout(r, 12)); fire('touchmove', py + d); }
            fire('touchend', py + 80);
            return { ms: Math.round(times[times.length - 1] - times[0]), speed: 80 / (times[times.length - 1] - times[0]) };
        }, { px: x, py: y });
        await page.waitForTimeout(600);
        const stillOpen = await page.locator(DIALOG).count();
        await evidence(testInfo, 'flick-close.json', { H, distance: 80, fractionOfHeight: 80 / H, gesture, stillOpen });
        expect(gesture.speed, 'the gesture itself must be a flick').toBeGreaterThan(0.5);
        expect(stillOpen, 'a fast short flick closes the sheet').toBe(0);
    });
});

// ── 4. Tap feedback ─────────────────────────────────────────────────────────

test.describe('4. tap feedback', () => {
    test('cards shrink to 98% and darken on press, return over 150ms; chips get a grey fill; no blue flash', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const cdp = await page.context().newCDPSession(page);
        const card = page.locator(LIVE_CARD).nth(1);
        await card.scrollIntoViewIfNeeded();
        const box = (await card.boundingBox())!;
        const read = (sel: string, i: number) => page.evaluate(([s, n]) => {
            const el = document.querySelectorAll(s)[n as number] as HTMLElement;
            const cs = getComputedStyle(el);
            const m = /matrix\(([^,]+)/.exec(cs.transform);
            return {
                scale: m ? parseFloat(m[1]) : 1,
                overlay: parseFloat(getComputedStyle(el, '::after').opacity || '0'),
                transitionDuration: cs.transitionDuration,
                tapHighlight: cs.getPropertyValue('-webkit-tap-highlight-color'),
            };
        }, [sel, i] as const);

        const idle = await read(LIVE_CARD, 1);
        await touch(cdp, 'touchStart', box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(120);
        const pressed = await read(LIVE_CARD, 1);
        await touch(cdp, 'touchCancel');
        await page.waitForTimeout(220);
        const released = await read(LIVE_CARD, 1);

        const chips = page.locator('.qr-chip');
        const chipBox = (await chips.nth(1).boundingBox())!;
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        const chipBox2 = (await chips.nth(1).boundingBox())!;
        await touch(cdp, 'touchStart', chipBox2.x + chipBox2.width / 2, chipBox2.y + chipBox2.height / 2);
        await page.waitForTimeout(120);
        const chipPressed = await read('.qr-chip', 1);
        await touch(cdp, 'touchCancel');

        // The sheet's close button lives outside the shell; it must not flash either.
        await page.locator(LIVE_CARD).first().evaluate(el => (el as HTMLElement).click());
        await expect(page.locator(DIALOG)).toHaveCount(1);
        const closeHighlight = await page.locator(`${DIALOG} button[aria-label="Close"]`)
            .evaluate(el => getComputedStyle(el).getPropertyValue('-webkit-tap-highlight-color'));
        // Already transparent on master: Tailwind's preflight sets it on <html>
        // and it inherits. This pins it for the clickable things that are not
        // buttons — the dark overlay a diner taps to close a sheet — so a
        // change to the base styles cannot bring the flash back unnoticed.
        const overlayHighlight = await page.evaluate((dlg) => {
            const d = document.querySelector(dlg)!;
            const overlay = d.querySelector('[data-testid="sheet-backdrop"]') ?? d;
            return getComputedStyle(overlay).getPropertyValue('-webkit-tap-highlight-color');
        }, DIALOG);

        await evidence(testInfo, 'press.json', { idle, pressed, released, chipBox, chipPressed, closeHighlight, overlayHighlight });
        expect(pressed.scale).toBeCloseTo(0.98, 3);
        expect(pressed.overlay, 'card darkens on press').toBeGreaterThan(0.9);
        expect(pressed.transitionDuration).toContain('0.08s');
        expect(released.scale).toBe(1);
        expect(released.transitionDuration).toContain('0.15s');
        expect(chipPressed.overlay, 'chip gets a grey fill on press').toBeGreaterThan(0.9);
        for (const v of [idle.tapHighlight, chipPressed.tapHighlight, closeHighlight, overlayHighlight]) {
            expect(v.replace(/\s/g, '')).toBe('rgba(0,0,0,0)');
        }
    });

    test('sold-out cards do not shrink', async ({ page }) => {
        await gotoMenu(page);
        const out = page.locator(`${CARD}[data-soldout="true"]`).first();
        test.skip(await out.count() === 0, `${SHOP} has no sold-out dish`);
        await out.scrollIntoViewIfNeeded();
        const cdp = await page.context().newCDPSession(page);
        const b = (await out.boundingBox())!;
        await touch(cdp, 'touchStart', b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForTimeout(120);
        const transform = await out.evaluate(el => getComputedStyle(el).transform);
        await touch(cdp, 'touchCancel');
        expect(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    });
});

// ── 5. Category switch ──────────────────────────────────────────────────────

test.describe('5. category switch', () => {
    test('chip colours on the tap, old list fades out 100ms, new list rises 8px over 180ms, first 4 staggered 30ms, never empty', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const result = await page.evaluate(async () => {
            const m = (window as unknown as ProbeWindow).__m;
            const chips = Array.from(document.querySelectorAll('.qr-chip')) as HTMLElement[];
            const all = chips[0];
            const target = chips[1];
            const activeBg = getComputedStyle(all).backgroundColor;
            const idleBg = getComputedStyle(target).backgroundColor;
            const list = () => (document.querySelector('[data-testid="menu-list"]')
                ?? document.querySelector('.qr-section')?.parentElement) as HTMLElement | null;
            let timings: unknown = null;
            const oldList = list();
            const frames = await m.frames(420, () => {
                const cards = Array.from(document.querySelectorAll('[data-testid="menu-item-card"]')) as HTMLElement[];
                if (!timings && cards.length && cards[0].getAnimations().length) {
                    timings = cards.slice(0, 6).map(c => c.getAnimations().map(a => {
                        const kf = (a.effect as KeyframeEffect).getKeyframes();
                        return { delay: a.effect?.getTiming().delay, duration: a.effect?.getTiming().duration,
                            from: { opacity: kf[0]?.opacity, transform: kf[0]?.transform } };
                    })[0] ?? null);
                }
                return {
                    target: getComputedStyle(target).backgroundColor,
                    all: getComputedStyle(all).backgroundColor,
                    listOpacity: parseFloat(getComputedStyle(list()!).opacity),
                    oldList: list() === oldList,
                    cards: cards.length,
                    firstCardOpacity: cards[0] ? parseFloat(getComputedStyle(cards[0]).opacity) : 0,
                };
            }, () => target.click());
            return { activeBg, idleBg, frames, timings };
        });
        await evidence(testInfo, 'category-switch.json', result);

        const { activeBg, idleBg, frames, timings } = result;
        expect(frames[0].target, 'tapped chip is coloured in the first frame').toBe(activeBg);
        expect(frames[0].all).toBe(idleBg);
        for (const f of frames) {
            expect([activeBg, idleBg], `chip passed through ${f.target} at ${f.t}ms`).toContain(f.target);
            expect([activeBg, idleBg], `old chip passed through ${f.all} at ${f.t}ms`).toContain(f.all);
            expect(f.cards as number, `empty list at ${f.t}ms`).toBeGreaterThan(0);
        }
        // The fade is measured from when it starts, not from the tap: the swap
        // must wait for the old list to finish fading, however busy the phone.
        const old = frames.filter(f => f.oldList);
        const fadeStart = old.find(f => (f.listOpacity as number) < 0.98);
        const fadeEnd = old.find(f => (f.listOpacity as number) <= 0.2);
        const fading = old.filter(f => (f.listOpacity as number) < 0.95 && (f.listOpacity as number) > 0.05);
        expect(fading.length, 'old list fades out over ~100ms').toBeGreaterThanOrEqual(2);
        expect(old.at(-1)!.listOpacity as number, 'the fade finishes before the new list replaces it').toBeLessThanOrEqual(0.2);
        expect(fadeStart && fadeEnd && fadeEnd.t - fadeStart.t, 'fade runs ~100ms, not cut short').toBeGreaterThanOrEqual(30);
        expect(fadeStart && fadeEnd && fadeEnd.t - fadeStart.t).toBeLessThanOrEqual(160);
        const t = timings as Array<{ delay: number; duration: number; from: { opacity: string; transform: string } } | null>;
        expect(t, 'new cards animate in').not.toBeNull();
        expect(t.slice(0, 4).map(x => x?.delay)).toEqual([0, 30, 60, 90]);
        for (const x of t.slice(0, 4)) {
            expect(x?.duration).toBe(180);
            expect(String(x?.from.opacity)).toBe('0');
            expect(String(x?.from.transform)).toMatch(/8px/);
        }
        for (const x of t.slice(4)) expect(x === null || (x.delay ?? 0) <= 90, 'only the first 4 are staggered').toBe(true);
    });

    test('a customer scrolled down is smooth-scrolled back to the top of the list', async ({ page }, testInfo) => {
        await gotoMenu(page);
        await page.evaluate(async () => {
            const m = (window as unknown as ProbeWindow).__m;
            window.scrollTo(0, 1400);
            await m.nextFrames(10);
            for (let i = 0; i < 4; i++) { window.scrollBy(0, -10); await m.nextFrames(3); }
            await new Promise(r => setTimeout(r, 400));
        });
        const r = await page.evaluate(async () => {
            const m = (window as unknown as ProbeWindow).__m;
            const chip = (Array.from(document.querySelectorAll('.qr-chip')) as HTMLElement[])[2];
            const startY = window.scrollY;
            const frames = await m.frames(900, () => ({ y: Math.round(window.scrollY) }), () => chip.click());
            const bar = document.querySelector('[data-testid="category-bar"]')!.getBoundingClientRect();
            const first = document.querySelector('[data-testid="menu-list"], .qr-section')!.getBoundingClientRect();
            return { startY, frames, barBottom: bar.bottom, listTop: first.top };
        });
        await evidence(testInfo, 'scroll-to-top.json', r);
        const ys = new Set(r.frames.map(f => f.y));
        expect(r.startY).toBeGreaterThan(1000);
        expect(ys.size, 'smooth, not a jump').toBeGreaterThanOrEqual(4);
        expect(Math.abs(r.listTop - r.barBottom), 'list starts right under the chip bar').toBeLessThanOrEqual(24);
    });
});

// ── 6. Active chip centred ──────────────────────────────────────────────────

test.describe('6. active chip', () => {
    test('scrolls the selected chip to the centre of the row', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const r = await page.evaluate(async () => {
            const m = (window as unknown as ProbeWindow).__m;
            const chips = Array.from(document.querySelectorAll('.qr-chip')) as HTMLElement[];
            const row = chips[0].parentElement as HTMLElement;
            row.scrollLeft = 0;
            await m.nextFrames(2);
            const rr = row.getBoundingClientRect();
            const chip = chips.find(c => c.getBoundingClientRect().right > rr.right && c.getBoundingClientRect().left < rr.right)!;
            const frames = await m.frames(600, () => ({ left: Math.round(row.scrollLeft) }), () => chip.click());
            const cr = chip.getBoundingClientRect();
            return {
                frames, chip: chip.textContent,
                offset: (cr.left + cr.width / 2) - (rr.left + rr.width / 2),
                atMax: Math.abs(row.scrollLeft - (row.scrollWidth - row.clientWidth)) < 1,
                fullyVisible: cr.left >= rr.left - 0.5 && cr.right <= rr.right + 0.5,
            };
        });
        await evidence(testInfo, 'chip-centre.json', r);
        expect(new Set(r.frames.map(f => f.left)).size, 'scrolls smoothly').toBeGreaterThanOrEqual(3);
        expect(r.fullyVisible, 'chip is no longer cut off').toBe(true);
        expect(r.atMax || Math.abs(r.offset) <= 2, `chip is ${r.offset}px off centre`).toBe(true);
        const settled = r.frames.findIndex((f, i) => i > 0 && r.frames.slice(i).every(g => g.left === f.left));
        expect(r.frames[settled].t, 'settles in about 250ms').toBeLessThanOrEqual(450);
    });
});

// ── 7. Photos ───────────────────────────────────────────────────────────────

test.describe('7. photos', () => {
    test('warm placeholder, 200ms fade, and cached photos appear instantly when switching back', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const style = await page.locator(`${CARD} img`).first().evaluate(img => ({
            placeholder: getComputedStyle(img.parentElement!).backgroundColor,
            fade: getComputedStyle(img).transitionDuration,
        }));
        // First visit: nothing has been shown before, so nothing may skip the fade —
        // not even a photo that finished downloading before hydration.
        const firstVisitStates = await page.locator(`${CARD} img`)
            .evaluateAll(imgs => imgs.map(i => i.getAttribute('data-loaded')));

        // Leave the first category, then come back: its photos are cached now.
        const frames = await page.evaluate(async () => {
            const m = (window as unknown as ProbeWindow).__m;
            const chips = Array.from(document.querySelectorAll('.qr-chip')) as HTMLElement[];
            chips[2].click();
            await new Promise(r => setTimeout(r, 700));
            return m.frames(500, () => {
                // Sold-out photos sit at 50% by design (greyed, not hidden), so they are not "fading".
                const imgs = (Array.from(document.querySelectorAll('[data-testid="menu-item-card"]:not([data-soldout="true"]) img')) as HTMLImageElement[]).slice(0, 4);
                return { opacities: imgs.map(i => parseFloat(getComputedStyle(i).opacity)), n: imgs.length };
            }, () => chips[0].click());
        });
        await evidence(testInfo, 'photos.json', { style, firstVisitStates, frames });
        expect(style.placeholder).toBe('rgb(243, 238, 232)');
        expect(style.fade).toContain('0.2s');
        expect(firstVisitStates, 'a first-visit photo popped in without the fade').not.toContain('instant');
        for (const f of frames) {
            for (const o of f.opacities as number[]) expect(o, `cached photo faded at ${f.t}ms`).toBe(1);
        }
    });
});

// ── 8. Chip bar hide/show ───────────────────────────────────────────────────

test.describe('8. chip bar', () => {
    const scrollSteps = (page: Page, steps: number[]) => page.evaluate(async (s) => {
        const m = (window as unknown as ProbeWindow).__m;
        const out: Array<{ y: number; pinned: string | null }> = [];
        for (const dy of s) {
            window.scrollBy(0, dy);
            await m.nextFrames(3);
            out.push({ y: Math.round(window.scrollY), pinned: document.querySelector('[data-testid="category-bar"]')!.getAttribute('data-pinned') });
        }
        return out;
    }, steps);

    test('hides after 48px of continuous downward scroll, shows after 16px up, with 180/200ms slides', async ({ page }, testInfo) => {
        await gotoMenu(page);
        await page.evaluate(() => window.scrollTo(0, 900));
        await page.waitForTimeout(300);
        await scrollSteps(page, [-10, -10]); // shown
        await page.waitForTimeout(300);

        const down30 = await scrollSteps(page, [10, 10, 10]);
        const down60 = await scrollSteps(page, [10, 10, 10]);
        const hiddenStyle = await page.locator('[data-testid="category-bar"]').evaluate(el => ({
            d: getComputedStyle(el).transitionDuration, f: getComputedStyle(el).transitionTimingFunction }));
        const up10 = await scrollSteps(page, [-5, -5]);
        const up20 = await scrollSteps(page, [-5, -5]);
        const shownStyle = await page.locator('[data-testid="category-bar"]').evaluate(el => ({
            d: getComputedStyle(el).transitionDuration, f: getComputedStyle(el).transitionTimingFunction }));
        // Wobble: down 40, up 4, down 40 — never 48 in one direction.
        await page.waitForTimeout(300);
        const wobble = await scrollSteps(page, [10, 10, 10, 10, -4, 10, 10, 10, 10]);
        await evidence(testInfo, 'chip-bar.json', { down30, down60, up10, up20, wobble, hiddenStyle, shownStyle });

        expect(down30.at(-1)!.pinned, 'still shown after 30px down').toBe('true');
        expect(down60.at(-1)!.pinned, 'hidden after 60px down').toBe('false');
        expect(up10.at(-1)!.pinned, 'still hidden after 10px up').toBe('false');
        expect(up20.at(-1)!.pinned, 'shown after 20px up').toBe('true');
        expect(wobble.every(w => w.pinned === 'true'), 'a wobble is not continuous scrolling').toBe(true);
        expect(hiddenStyle.d).toContain('0.18s');
        expect(hiddenStyle.f).toContain('cubic-bezier(0.4, 0, 1, 1)');
        expect(shownStyle.d).toContain('0.2s');
        expect(shownStyle.f).toContain('cubic-bezier(0, 0, 0.2, 1)');
    });

    test('never toggles while a sheet is open or closing', async ({ page }, testInfo) => {
        await gotoMenu(page);
        await page.evaluate(() => window.scrollTo(0, 900));
        await page.waitForTimeout(300);
        await scrollSteps(page, [10, 10, 10, 10, 10, 10, 10]);
        await page.waitForTimeout(300);
        const frames = await page.evaluate(async (sel) => {
            const m = (window as unknown as ProbeWindow).__m;
            const visible = Array.from(document.querySelectorAll(sel)).find(c => {
                const r = c.getBoundingClientRect(); return r.top > 120 && r.bottom < window.innerHeight;
            }) as HTMLElement;
            const pin = () => ({ pinned: document.querySelector('[data-testid="category-bar"]')!.getAttribute('data-pinned'),
                present: !!document.querySelector('[role="dialog"]') });
            const open = await m.frames(500, pin, () => visible.click());
            const close = await m.frames(600, pin, () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
            return [...open, ...close];
        }, LIVE_CARD);
        await evidence(testInfo, 'chip-bar-sheet.json', frames);
        expect(frames.every(f => f.pinned === 'false'), 'bar jumped back around the sheet').toBe(true);
    });
});

// ── 9. Banner carousel ──────────────────────────────────────────────────────

test.describe('9. banner carousel', () => {
    const region = '[role="region"][aria-label="Promotional banners"]';
    const activeIndex = (page: Page) => page.evaluate(() =>
        Array.from(document.querySelectorAll('[aria-label="Banner navigation"] [role="tab"]'))
            .findIndex(d => d.getAttribute('aria-selected') === 'true'));

    test('changes every 5s with a 500ms cubic-bezier(.65,0,.35,1) slide; active dot 6→16px', async ({ page }, testInfo) => {
        await gotoMenu(page);
        test.skip(await page.locator(region).count() === 0, `${SHOP} has no banners`);
        const r = await page.evaluate(async (sel) => {
            const m = (window as unknown as ProbeWindow).__m;
            const strip = document.querySelector(sel)!.firstElementChild as HTMLElement;
            const dots = () => Array.from(document.querySelectorAll('[aria-label="Banner navigation"] [role="tab"]')) as HTMLElement[];
            const width = (d: HTMLElement) => {
                const parts = d.children.length ? Array.from(d.children) : [d];
                const rs = parts.map(p => p.getBoundingClientRect());
                return Math.round((Math.max(...rs.map(x => x.right)) - Math.min(...rs.map(x => x.left))) * 10) / 10;
            };
            const idx = () => dots().findIndex(d => d.getAttribute('aria-selected') === 'true');
            const changes: Array<{ t: number; i: number }> = [];
            let last = idx();
            let changedAt = -1;
            let dotWidths: Array<{ active: boolean; w: number }> | null = null;
            const t0 = performance.now();
            await m.frames(12_000, () => {
                const i = idx();
                const now = performance.now() - t0;
                if (i !== last) { changes.push({ t: Math.round(now), i }); last = i; changedAt = now; }
                // Measure the dots once, 400ms after a change: past the 250ms
                // dot animation and ~4.6s before the next slide.
                if (!dotWidths && changedAt >= 0 && now - changedAt >= 400) {
                    dotWidths = dots().map(d => ({ active: d.getAttribute('aria-selected') === 'true', w: width(d) }));
                }
                return {};
            });
            return {
                changes,
                transition: `${getComputedStyle(strip).transitionDuration} ${getComputedStyle(strip).transitionTimingFunction}`,
                dotWidths: (dotWidths as Array<{ active: boolean; w: number }> | null) ?? [],
                dotTransition: getComputedStyle(dots()[0]).transitionDuration,
            };
        }, region);
        await evidence(testInfo, 'banner-autoplay.json', r);
        expect(r.transition).toBe('0.5s cubic-bezier(0.65, 0, 0.35, 1)');
        // The carousel's clock started at page load, before sampling did, so
        // what is measured is the gap BETWEEN two consecutive changes.
        expect(r.changes.length, 'two changes in 12s').toBeGreaterThanOrEqual(2);
        const gap = r.changes[1].t - r.changes[0].t;
        expect(Math.abs(gap - 5000), `slides ${gap}ms apart`).toBeLessThanOrEqual(400);
        expect(r.dotWidths.length, 'dots measured after a change').toBeGreaterThan(1);
        for (const d of r.dotWidths) expect(d.w).toBeCloseTo(d.active ? 16 : 6, 0);
    });

    test('pauses while touched, for 8s after a swipe, and while scrolled off screen', async ({ page }, testInfo) => {
        await gotoMenu(page);
        test.skip(await page.locator(region).count() === 0, `${SHOP} has no banners`);
        const cdp = await page.context().newCDPSession(page);
        const b = (await page.locator(region).boundingBox())!;
        const cy = b.y + b.height / 2;

        const i0 = await activeIndex(page);
        await touch(cdp, 'touchStart', b.x + b.width * 0.8, cy);
        await page.waitForTimeout(6000);
        const whileTouched = await activeIndex(page);
        for (let x = 0.7; x >= 0.2; x -= 0.1) { await touch(cdp, 'touchMove', b.x + b.width * x, cy); await page.waitForTimeout(16); }
        await touch(cdp, 'touchEnd');
        await page.waitForTimeout(600);
        const afterSwipe = await activeIndex(page);
        await page.waitForTimeout(7000);
        const sevenSecondsLater = await activeIndex(page);

        await page.evaluate(() => window.scrollTo(0, 1200));
        const offStart = await activeIndex(page);
        await page.waitForTimeout(6500);
        const offEnd = await activeIndex(page);
        await evidence(testInfo, 'banner-pause.json', { i0, whileTouched, afterSwipe, sevenSecondsLater, offStart, offEnd });

        expect(whileTouched, 'no autoplay while a finger is on it').toBe(i0);
        expect(afterSwipe, 'a swipe changes the banner').not.toBe(i0);
        expect(sevenSecondsLater, 'held for 8s after a swipe').toBe(afterSwipe);
        expect(offEnd, 'stopped while off screen').toBe(offStart);
    });
});

// ── 10. Reduced motion ──────────────────────────────────────────────────────

test.describe('10. reduced motion', () => {
    test.use({ contextOptions: { reducedMotion: 'reduce' } });

    test('120ms fades instead of slides, and no carousel autoplay', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const idx = await findSheet(page, 'photo');
        // Captured on the first frame the sheet exists: a 120ms fade is over
        // (and gone from getAnimations()) by the end of the sampling window.
        const { open, openAnim } = await page.evaluate(([i, sel]) => {
            const m = (window as unknown as ProbeWindow).__m;
            let openAnim: Array<{ duration: unknown; props: string[] }> | null = null;
            return m.frames(300, () => {
                const s = m.sheet();
                const sheet = m.sheetEl();
                if (s.present && sheet && !openAnim) {
                    openAnim = sheet.getAnimations().map(a => ({
                        duration: a.effect?.getTiming().duration,
                        props: (a.effect as KeyframeEffect).getKeyframes().flatMap(k => Object.keys(k)),
                    }));
                }
                return { ...s };
            }, () => (document.querySelectorAll(sel as string)[i as number] as HTMLElement).click())
                .then(f => ({ open: f as Array<Frame & SheetProbe>, openAnim: openAnim ?? [] }));
        }, [idx, LIVE_CARD] as const);
        const close = await sheetFrames(page, 300, `document.querySelector('${DIALOG} button[aria-label="Close"]').click()`);
        const region = page.locator('[role="region"][aria-label="Promotional banners"]');
        const before = await region.count() ? await page.evaluate(() => document.querySelector('[aria-label="Banner navigation"] [aria-selected="true"]')?.getAttribute('aria-label')) : null;
        await page.waitForTimeout(6500);
        const after = await region.count() ? await page.evaluate(() => document.querySelector('[aria-label="Banner navigation"] [aria-selected="true"]')?.getAttribute('aria-label')) : null;
        await evidence(testInfo, 'reduced-motion.json', { open, openAnim, close, before, after });

        for (const f of [...open, ...close].filter(f => f.present)) expect(f.moved, `slid at ${f.t}ms`).toBeLessThan(0.01);
        expect(openAnim.length).toBeGreaterThan(0);
        for (const a of openAnim) {
            expect(a.duration).toBe(120);
            expect(a.props).not.toContain('transform');
        }
        const gone = close.find(f => !f.present);
        expect(gone && gone.t, 'fade out ~120ms').toBeLessThanOrEqual(200);
        expect(after).toBe(before);
    });
});

// ── Don'ts ──────────────────────────────────────────────────────────────────

test.describe("don'ts", () => {
    test('nothing runs longer than 400ms and only transform/opacity animate', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const seen = await page.evaluate(async (sel) => {
            const m = (window as unknown as ProbeWindow).__m;
            const found = new Map<string, { duration: number; props: string[]; iterations: number; banner: boolean }>();
            const collect = () => {
                for (const a of document.getAnimations()) {
                    const timing = a.effect?.getTiming();
                    const target = (a.effect as KeyframeEffect).target as Element | null;
                    const banner = !!target?.closest('[aria-label="Promotional banners"]');
                    const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'js';
                    const props = (a as CSSTransition).transitionProperty
                        ? [(a as CSSTransition).transitionProperty]
                        : (a.effect as KeyframeEffect).getKeyframes().flatMap(k => Object.keys(k))
                            .filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k));
                    found.set(name + ':' + props.join(','), {
                        duration: Number(timing?.duration ?? 0), props: Array.from(new Set(props)),
                        iterations: Number(timing?.iterations ?? 1), banner,
                    });
                }
                return {};
            };
            const chips = Array.from(document.querySelectorAll('.qr-chip')) as HTMLElement[];
            await m.frames(500, collect, () => chips[1].click());
            await m.frames(500, collect, () => chips[0].click());
            const card = document.querySelector(sel) as HTMLElement;
            await m.frames(500, collect, () => card.click());
            await m.frames(500, collect, () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
            window.scrollTo(0, 900);
            await m.frames(400, collect);
            return Array.from(found.entries());
        }, LIVE_CARD);
        await evidence(testInfo, 'all-animations.json', seen);
        for (const [name, a] of seen) {
            // The one designer-specified exception: the banner slide is 500ms (row 9).
            expect(a.duration, `${name} runs ${a.duration}ms`).toBeLessThanOrEqual(a.banner ? 500 : 400);
            expect(a.iterations, `${name} loops`).not.toBe(Infinity);
            for (const p of a.props) expect(['transform', 'opacity'], `${name} animates ${p}`).toContain(p);
        }
    });
});
