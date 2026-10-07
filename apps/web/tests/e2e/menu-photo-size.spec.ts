import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * The designer's photo-size review, measured on the real page.
 *
 *   Photo 148 px (41% of a 360 px screen), text column ~168 px, ~3.9 dishes
 *   per screen, ~31% of the screen covered by food, 12 px corners, and a
 *   full-width 4:3 photo in the size-picker sheet.
 *
 * Needs `next start` on :3000. Store: MOTION_SHOP or the QA store.
 */

const SHOP = process.env.MOTION_SHOP ?? 'gowtham-123';
const CARD = '[data-testid="menu-item-card"]';
const DIALOG = '[role="dialog"][aria-modal="true"]';

test.use({
    viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, video: 'on',
});
test.describe.configure({ timeout: 60_000 });

async function gotoMenu(page: Page) {
    await page.route('**/api/track-menu-scan**', r => r.abort());
    await page.goto(`/shop/${SHOP}`, { waitUntil: 'networkidle' });
    await expect(page.locator(CARD).first()).toBeVisible();
    await page.waitForTimeout(500);
}

async function evidence(testInfo: TestInfo, name: string, data: unknown) {
    await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

function measure(page: Page) {
    return page.evaluate(() => {
        const W = window.innerWidth, H = window.innerHeight;
        const cards = Array.from(document.querySelectorAll('[data-testid="menu-item-card"]')) as HTMLElement[];
        const withPhoto = cards.filter(c => c.querySelector('img.qr-thumb-img'));
        const box = withPhoto[0].querySelector('img.qr-thumb-img')!.parentElement!;
        const photo = box.getBoundingClientRect();
        const text = withPhoto[0].firstElementChild!.getBoundingClientRect();
        const header = document.querySelector('header')!.getBoundingClientRect().height;
        const bar = document.querySelector('[data-testid="category-bar"]')?.getBoundingClientRect().height ?? 0;
        const pitches: number[] = [];
        for (let i = 1; i < cards.length; i++) {
            if (cards[i].parentElement === cards[i - 1].parentElement) {
                pitches.push(cards[i].getBoundingClientRect().top - cards[i - 1].getBoundingClientRect().top);
            }
        }
        pitches.sort((a, b) => a - b);
        const pitch = pitches[Math.floor(pitches.length / 2)];
        const perScreen = (H - header - bar) / pitch;
        const cs = getComputedStyle(withPhoto[0]);
        return {
            screen: `${W}x${H}`,
            photo: Math.round(photo.width), photoHeight: Math.round(photo.height),
            screenShare: Math.round((photo.width / W) * 100),
            corners: getComputedStyle(box).borderTopLeftRadius,
            textColumn: Math.round(text.width),
            dishesPerScreen: +perScreen.toFixed(1),
            foodCoverage: Math.round((perScreen * photo.width * photo.width) / (W * H) * 100),
            rowSideBorder: cs.borderLeftWidth, rowShadow: cs.boxShadow, rowDivider: cs.borderBottomWidth,
        };
    });
}

test('list: 148 px photos with 12 px corners, ~168 px text, ~3.9 dishes and ~31% food per screen', async ({ page }, testInfo) => {
    await gotoMenu(page);
    const m = await measure(page);
    await evidence(testInfo, 'list-360.json', m);
    // A slow scroll so the recording shows the list.
    for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(450); }
    await page.mouse.wheel(0, -1600);
    await page.waitForTimeout(600);

    expect(m.photo).toBe(148);
    expect(m.photoHeight, 'square').toBe(148);
    expect(m.corners).toBe('12px');
    expect(m.textColumn, 'text column ~168 px').toBeGreaterThanOrEqual(166);
    expect(m.dishesPerScreen).toBeGreaterThanOrEqual(3.7);
    expect(m.dishesPerScreen).toBeLessThanOrEqual(4.1);
    expect(m.foodCoverage).toBeGreaterThanOrEqual(28);
    expect(m.rowSideBorder, 'no boxed card').toBe('0px');
    expect(m.rowShadow, 'no lift').toBe('none');
    expect(m.rowDivider, 'a hairline between dishes').toBe('1px');
});

test.describe('on a Pixel 5', () => {
    test.use({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75 });
    test('the text column grows with the screen', async ({ page }, testInfo) => {
        await gotoMenu(page);
        const m = await measure(page);
        await evidence(testInfo, 'list-393.json', m);
        expect(m.photo).toBe(148);
        expect(m.textColumn).toBeGreaterThanOrEqual(199);
    });
});

test('size-picker sheet: the same full-width 4:3 photo as the photo sheet', async ({ page }, testInfo) => {
    await gotoMenu(page);
    // Open dishes until one opens the size-picker (compact) sheet — it has no <h2>.
    const n = await page.locator(`${CARD}:not([data-soldout="true"])`).count();
    let found = false;
    for (let i = 0; i < Math.min(n, 12) && !found; i++) {
        await page.locator(`${CARD}:not([data-soldout="true"])`).nth(i).evaluate(el => (el as HTMLElement).click());
        await expect(page.locator(DIALOG)).toHaveCount(1);
        await page.waitForTimeout(500);
        const kindAttr = await page.locator(`${DIALOG} [data-sheet-kind]`).getAttribute('data-sheet-kind', { timeout: 500 }).catch(() => null);
        if (kindAttr ? kindAttr === 'sizes' : await page.locator(`${DIALOG} h2`).count() === 0) { found = true; break; }
        await page.keyboard.press('Escape');
        await expect(page.locator(DIALOG)).toHaveCount(0, { timeout: 2000 });
    }
    expect(found, 'a dish with sizes').toBe(true);
    const r = await page.evaluate((dlg) => {
        const panel = document.querySelector(`${dlg} [data-testid="menu-sheet"]`)!.lastElementChild!.getBoundingClientRect();
        const imgs = Array.from(document.querySelectorAll(`${dlg} img`)).map(i => i.getBoundingClientRect());
        const biggest = imgs.sort((a, b) => b.width * b.height - a.width * a.height)[0];
        return { panelWidth: Math.round(panel.width), photoWidth: Math.round(biggest?.width ?? 0), photoHeight: Math.round(biggest?.height ?? 0) };
    }, DIALOG);
    await evidence(testInfo, 'compact-sheet.json', r);
    await page.waitForTimeout(1200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);

    expect(r.photoWidth, 'full-width photo').toBeGreaterThanOrEqual(r.panelWidth - 1);
    expect(r.photoHeight / r.photoWidth).toBeCloseTo(0.75, 2);
});
