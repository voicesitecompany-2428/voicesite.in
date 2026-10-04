import { test, expect, type Page, type TestInfo } from '@playwright/test';

/**
 * Owner's review of the dish sheet and search (2026-10-04), on the QA store's
 * own dishes: "Fresh Lemon Iced" (sizes + toppings), "QA Veg Combo" (combo),
 * and the search button. Needs `next start` on :3000.
 */

const SHOP = process.env.MOTION_SHOP ?? 'gowtham-123';
const CARD = '[data-testid="menu-item-card"]';
const DIALOG = '[role="dialog"][aria-modal="true"]';
const PINK = 'rgb(239, 89, 161)';

test.use({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, video: 'on' });
test.describe.configure({ timeout: 60_000 });

async function gotoMenu(page: Page) {
    await page.route('**/api/track-menu-scan**', r => r.abort());
    await page.goto(`/shop/${SHOP}`, { waitUntil: 'networkidle' });
    await expect(page.locator(CARD).first()).toBeVisible();
    await page.waitForTimeout(400);
}

async function evidence(testInfo: TestInfo, name: string, data: unknown) {
    await testInfo.attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' });
}

async function openDish(page: Page, name: string) {
    const card = page.locator(CARD, { hasText: name }).first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await card.click();
    await expect(page.locator(DIALOG)).toHaveCount(1);
    await page.waitForTimeout(600);
}

test('1. toppings are information, not a choice that does nothing', async ({ page }, testInfo) => {
    await gotoMenu(page);
    await openDish(page, 'Fresh Lemon Iced');
    await page.locator(DIALOG).getByText('Gowtham', { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const r = await page.evaluate((dlg) => {
        const d = document.querySelector(dlg)!;
        const rows = d.querySelectorAll('[data-testid="addon-row"]');
        // A radio: any round 20px ring inside the sheet.
        const radios = Array.from(d.querySelectorAll('div')).filter(el => {
            const cs = getComputedStyle(el);
            return el.getBoundingClientRect().width === 20 && cs.borderTopLeftRadius === '50%' && cs.borderTopWidth === '2px';
        }).length;
        const buttons = Array.from(d.querySelectorAll('button')).map(b => b.getAttribute('aria-label') ?? b.textContent?.trim()).filter(Boolean);
        return { addonRows: rows.length, radios, buttons, title: d.querySelector('h2')?.textContent ?? null };
    }, DIALOG);
    await evidence(testInfo, 'toppings.json', r);
    expect(r.radios, 'no radio buttons on a menu that takes no orders').toBe(0);
    expect(r.addonRows, 'both add-ons listed').toBe(2);
    expect(r.buttons, 'the only control in the sheet is close').toEqual(['Close']);
    expect(r.title, 'the size sheet has a real title, like the photo sheet').toBe('Fresh Lemon Iced');
});

test('2. "What\'s included" has no pink', async ({ page }, testInfo) => {
    await gotoMenu(page);
    await openDish(page, 'QA Veg Combo');
    await page.locator(DIALOG).getByText('included', { exact: false }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const pink = await page.evaluate(({ dlg, pinkRgb }) => {
        const d = document.querySelector(dlg)!;
        return Array.from(d.querySelectorAll('*')).filter(el => {
            const cs = getComputedStyle(el);
            return cs.backgroundColor === pinkRgb || cs.color === pinkRgb;
        }).map(el => el.tagName.toLowerCase() + ':' + (el.textContent ?? '').trim().slice(0, 20));
    }, { dlg: DIALOG, pinkRgb: PINK });
    await evidence(testInfo, 'combo-pink.json', pink);
    expect(pink, 'pink elements in the combo sheet').toEqual([]);
});

test('3. search filters the menu in place: no new screen, no category chips', async ({ page }, testInfo) => {
    await gotoMenu(page);
    const url = page.url();
    await page.getByRole('button', { name: /search/i }).first().click();
    await page.waitForTimeout(500);
    const opened = await page.evaluate(() => {
        const fullScreen = Array.from(document.querySelectorAll('[role="dialog"]')).some(d => {
            const r = d.getBoundingClientRect(); return r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1;
        });
        const input = document.activeElement as HTMLInputElement | null;
        const visibleChips = Array.from(document.querySelectorAll('button')).filter(b => {
            const r = b.getBoundingClientRect();
            const cs = getComputedStyle(b);
            return r.height === 36 && cs.borderTopLeftRadius !== '0px' && r.bottom > 0 && r.top < window.innerHeight
                && cs.visibility !== 'hidden' && b.offsetParent !== null;
        }).map(b => b.textContent?.trim());
        return {
            fullScreen, focusedInput: input?.tagName === 'INPUT', inHeader: !!input?.closest('header'),
            menuStillThere: document.querySelectorAll('[data-testid="menu-item-card"]').length,
            visibleChips,
        };
    });
    await page.keyboard.type('tea', { delay: 120 });
    await page.waitForTimeout(500);
    const results = await page.evaluate(() => ({
        names: Array.from(document.querySelectorAll('[data-testid="menu-item-card"]')).map(c => c.querySelector('p')?.textContent ?? ''),
        summary: document.querySelector('[data-testid="search-summary"]')?.textContent ?? null,
    }));
    await evidence(testInfo, 'search-open.json', { url, opened, results });
    await page.locator(CARD).first().click({ timeout: 5000 });
    await expect(page.locator(DIALOG)).toHaveCount(1);
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await expect(page.locator(DIALOG)).toHaveCount(0);
    const afterSheet = await page.locator(CARD).count();
    await page.goBack();
    await page.waitForTimeout(600);
    const closed = await page.evaluate(() => ({
        input: !!document.querySelector('[data-testid="menu-search-input"]'),
        chips: document.querySelectorAll('.qr-chip').length,
        cards: document.querySelectorAll('[data-testid="menu-item-card"]').length,
    }));
    const r = { url, sameUrl: page.url() === url, opened, results, afterSheet, closed };
    await evidence(testInfo, 'search.json', r);

    expect(opened.fullScreen, 'no separate search screen').toBe(false);
    expect(opened.focusedInput && opened.inHeader, 'the header becomes the search field').toBe(true);
    expect(opened.visibleChips, 'no category chips while searching').toEqual([]);
    expect(results.names.length).toBeGreaterThan(0);
    expect(results.names.length, 'the list is filtered').toBeLessThan(opened.menuStillThere);
    expect(results.names[0].toLowerCase(), 'name matches lead').toContain('tea');
    expect(results.summary).toMatch(/tea/i);
    expect(afterSheet, 'closing a dish returns to the results').toBe(results.names.length);
    expect(r.sameUrl).toBe(true);
    expect(closed.input, 'Back closes search').toBe(false);
    expect(closed.chips).toBeGreaterThan(1);
});
