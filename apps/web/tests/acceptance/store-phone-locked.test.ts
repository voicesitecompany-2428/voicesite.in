/**
 * The store's phone is the number the owner signed in with — permanent.
 *
 * Owner decision (2026-10-05): "User login with a number. That number needs to
 * show in the store details. In the store details, the user can't change the
 * number anymore. The number they signed in with needs to be permanent and
 * cannot be changed."
 *
 * Before: both store-details screens (You → Store details on phones, Settings
 * on desktop) pre-filled the sign-in number into an editable field, and owners
 * could type any other number over it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lockedStorePhone } from '@/lib/you/storeDetails';

const WEB = join(__dirname, '..', '..');
const src = (p: string) => readFileSync(join(WEB, 'src', p), 'utf8').replace(/\r\n/g, '\n');
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

/** The <input ...> element with this id, as written in the source. */
function inputWithId(source: string, id: string): string {
    const at = source.indexOf(`id="${id}"`);
    expect(at, `input #${id} not found`).toBeGreaterThan(-1);
    const start = source.lastIndexOf('<input', at);
    return source.slice(start, source.indexOf('/>', at) + 2);
}

describe('lockedStorePhone', () => {
    it('the sign-in number always wins over whatever was saved', () => {
        expect(lockedStorePhone('+919876543210', '+91 12345 67890')).toBe('+919876543210');
        expect(lockedStorePhone('+919876543210', null)).toBe('+919876543210');
    });
    it('keeps the stored number only when there is no sign-in number to use', () => {
        expect(lockedStorePhone(null, '+91 12345 67890')).toBe('+91 12345 67890');
        expect(lockedStorePhone(undefined, null)).toBe('');
    });
});

describe('You → Store details (phone)', () => {
    const page = () => src('app/manage/you/store/page.tsx');

    it('the phone field is read-only and cannot be typed over', () => {
        const input = inputWithId(page(), 'sd-phone');
        expect(input).toMatch(/readOnly/);
        expect(input).not.toMatch(/onChange/);
    });

    it('it shows and saves the sign-in number', () => {
        const code = noComments(page());
        expect(code).toMatch(/lockedStorePhone\(user\?\.phoneNumber/);
        expect(page()).toContain('the number you signed in with');
    });
});

describe('Settings → Store details (desktop)', () => {
    const page = () => src('app/manage/settings/page.tsx');

    it('the mobile number field is read-only and cannot be typed over', () => {
        const input = inputWithId(page(), 'settings-mobile');
        expect(input).toMatch(/readOnly/);
        expect(input).not.toMatch(/onChange/);
    });

    it('saving writes the sign-in number, not the form value', () => {
        const code = noComments(page());
        expect(code).toMatch(/contact_number:\s*lockedStorePhone\(user\?\.phoneNumber/);
        expect(code).not.toMatch(/contact_number:\s*form\.phoneNumber/);
    });
});

describe('a new store starts with the sign-in number', () => {
    it('/api/onboarding/complete sets contact_number from the verified token', () => {
        const route = noComments(src('app/api/onboarding/complete/route.ts'));
        expect(route).toMatch(/phoneFromIdToken\(idToken\)/);
        const insert = route.slice(route.indexOf(".from('sites')\n      .insert("), route.indexOf(".select('id, slug')"));
        expect(insert).toMatch(/contact_number/);
    });
});
