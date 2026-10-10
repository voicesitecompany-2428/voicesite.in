import { test, expect, type Page } from '@playwright/test';

/**
 * Proof for the account gate (owner request 2026-10-05). Runs against a local
 * production build on :3000 — once on the last version, once on this one.
 *
 * No SMS is ever sent: every Firebase Identity Toolkit and reCAPTCHA request is
 * aborted and COUNTED. A counted request is the page starting the OTP path, so
 * "0" means no SMS would have been spent.
 *
 * The phone-status answer is mocked in the UI tests so they do not depend on
 * who is in the database. The API test calls the real route, which runs one
 * read-only SELECT with a placeholder number.
 */

const LABEL = process.env.PROOF_LABEL ?? 'run';
const PLACEHOLDER = '9000000001';

test.use({ viewport: { width: 390, height: 844 }, video: 'on', isMobile: true, hasTouch: true });

/** Blocks Firebase/reCAPTCHA and scan tracking; returns a live count of OTP-path requests. */
async function guard(page: Page): Promise<{ otpRequests: () => number; statusCalls: () => number }> {
    let otp = 0;
    let status = 0;
    await page.route('**/api/track-menu-scan**', r => r.abort());
    await page.route(/identitytoolkit\.googleapis\.com|recaptcha|gstatic\.com\/recaptcha/, r => { otp++; return r.abort(); });
    page.on('request', r => { if (r.url().includes('/api/auth/phone-status')) status++; });
    return { otpRequests: () => otp, statusCalls: () => status };
}

async function shot(page: Page, name: string) {
    await page.screenshot({ path: `test-results/account-gate/${LABEL}-${name}.png`, fullPage: false });
}

test('signup with a number that already has an account: no OTP, points to login', async ({ page }, info) => {
    const g = await guard(page);
    await page.route('**/api/auth/phone-status', r => r.fulfill({ json: { success: true, exists: true } }));

    await page.goto('/signup');
    await page.fill('#signup-name', 'Test Owner');
    await page.fill('#signup-phone', PLACEHOLDER);
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForTimeout(2500);
    await shot(page, 'signup-existing-number');

    info.annotations.push({ type: 'otpRequests', description: String(g.otpRequests()) });
    info.annotations.push({ type: 'phoneStatusCalls', description: String(g.statusCalls()) });

    await expect(page.getByTestId('signup-already-exists')).toBeVisible();
    await expect(page.getByTestId('signup-already-exists')).toContainText('You already have an account with this number');
    expect(g.otpRequests()).toBe(0);
    await expect(page.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', `/login?phone=${PLACEHOLDER}`);
});

test('login opened from signup keeps the number', async ({ page }) => {
    await guard(page);
    await page.goto(`/login?phone=${PLACEHOLDER}`);
    await shot(page, 'login-prefilled');
    await expect(page.locator('#login-phone')).toHaveValue(PLACEHOLDER);
});

test('signup opened from login keeps the number', async ({ page }) => {
    await guard(page);
    await page.goto(`/signup?phone=${PLACEHOLDER}`);
    await expect(page.locator('#signup-phone')).toHaveValue(PLACEHOLDER);
});

test('login with the flag off still sends the OTP as before (no lock-out before the backfill)', async ({ page }, info) => {
    const g = await guard(page);
    await page.goto('/login');
    await page.fill('#login-phone', PLACEHOLDER);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForTimeout(2500);
    await shot(page, 'login-flag-off');
    info.annotations.push({ type: 'otpRequests', description: String(g.otpRequests()) });
    info.annotations.push({ type: 'phoneStatusCalls', description: String(g.statusCalls()) });
    expect(g.statusCalls()).toBe(0);
    expect(g.otpRequests()).toBeGreaterThan(0);
});

test('API: phone check, registration and name edit answer correctly', async ({ request }, info) => {
    const ip = { 'x-real-ip': `198.51.100.${Math.floor(Date.now() / 1000) % 250}` };
    const t0 = Date.now();
    const invalid = await request.post('/api/auth/phone-status', { data: { phone: '123' }, headers: ip });
    const unknown = await request.post('/api/auth/phone-status', { data: { phone: PLACEHOLDER }, headers: ip });
    const unknownMs = Date.now() - t0;
    const register = await request.post('/api/auth/register', { data: { name: 'Test Owner' } });
    const rename = await request.put('/api/profile/name', { data: { name: 'Test Owner' } });

    const statuses: number[] = [];
    for (let i = 0; i < 10; i++) {
        statuses.push((await request.post('/api/auth/phone-status', { data: { phone: PLACEHOLDER }, headers: ip })).status());
    }

    const evidence = {
        invalidPhone: { status: invalid.status(), body: await invalid.text() },
        unknownPhone: { status: unknown.status(), body: await unknown.text(), ms: unknownMs },
        registerNoToken: { status: register.status(), body: await register.text() },
        nameNoToken: { status: rename.status(), body: await rename.text() },
        burstStatuses: statuses,
    };
    info.annotations.push({ type: 'api', description: JSON.stringify(evidence) });

    expect(evidence.invalidPhone.status).toBe(400);
    expect(evidence.unknownPhone.status).toBe(200);
    expect(JSON.parse(evidence.unknownPhone.body)).toEqual({ success: true, exists: false });
    expect(evidence.registerNoToken.status).toBe(401);
    expect(evidence.nameNoToken.status).toBe(401);
    expect(statuses).toContain(429);
});
