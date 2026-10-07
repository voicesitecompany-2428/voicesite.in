import { test, expect } from '@playwright/test';

/**
 * Owner's call, 2026-10-04: an offer dish uses the same card colour as every
 * other dish — the warm offer tint read as a grey card. The offer is carried by
 * the price row (struck price, green "₹X OFF"). Needs `next start` on :3000.
 */

const SHOP = process.env.MOTION_SHOP ?? 'gowtham-123';
const CARD = '[data-testid="menu-item-card"]';

test.use({ viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true, video: 'on' });

test('offer dishes have the same card colour as the rest, and still show the saving', async ({ page }, testInfo) => {
    await page.route('**/api/track-menu-scan**', r => r.abort());
    await page.goto(`/shop/${SHOP}`, { waitUntil: 'networkidle' });
    const offer = page.locator(`${CARD}[data-offer="true"]`).first();
    await offer.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -120));
    await page.waitForTimeout(800);

    const r = await page.evaluate((sel) => {
        const cards = Array.from(document.querySelectorAll(sel)) as HTMLElement[];
        const bg = (c: HTMLElement) => getComputedStyle(c).backgroundColor;
        const offers = cards.filter(c => c.dataset.offer === 'true');
        const plain = cards.filter(c => c.dataset.offer === 'false' && c.dataset.soldout !== 'true');
        return {
            offerColours: Array.from(new Set(offers.map(bg))),
            plainColours: Array.from(new Set(plain.map(bg))),
            offers: offers.length,
            savingShown: offers.every(c => /₹\d+ OFF/.test(c.textContent ?? '')),
        };
    }, CARD);
    await testInfo.attach('offer-card.json', { body: JSON.stringify(r, null, 2), contentType: 'application/json' });
    await testInfo.attach('offer-card.png', { body: await page.screenshot(), contentType: 'image/png' });

    expect(r.offers).toBeGreaterThan(0);
    expect(r.offerColours, 'offer cards use the normal card colour').toEqual(r.plainColours);
    expect(r.savingShown, 'every offer still states its saving').toBe(true);
});
