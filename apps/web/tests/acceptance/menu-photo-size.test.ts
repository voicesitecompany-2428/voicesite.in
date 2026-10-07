import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Menu photo size — the senior product designer's sizing review, 2026-10-04.
 *
 *              Photo   Screen width   Dishes per screen   Screen covered by food
 *   Before     120 px  33%            ~4.3                ~22%
 *   Now        148 px  41%            ~3.9                ~31%
 *
 * 52% more photo area for under half a dish per screen. To keep the text column
 * at ~168 px on a 360 px phone, the boxed card (border + inner padding) gives
 * way to Swiggy-style rows separated by thin dividers. Photos stay square with
 * 12 px corners in every design, thumbnails are cut at 450 px so a 148 px photo
 * is sharp on a 3x screen, and the size-picker sheet gets the same full-width
 * photo as the photo sheet.
 *
 * The frame-by-frame layout proof is tests/e2e/menu-photo-size.spec.ts.
 */

const WEB = join(__dirname, '..', '..');
const SRC = join(WEB, 'src');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
const shipped = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const CARD = 'components/templates/MenuItemCard.tsx';
const TEMPLATE = 'components/templates/QRMenuTemplate.tsx';

describe('the photo is 148 px', () => {
    it('sets the list photo to the recommended size', () => {
        expect(shipped(CARD)).toMatch(/const THUMB = 148;/);
    });

    it('keeps it square with 12 px corners in every design', async () => {
        const { MENU_THEMES } = await import('@/lib/menu/menuThemes');
        for (const theme of Object.values(MENU_THEMES)) {
            expect(theme.thumbRadius, `${theme.id} photo corners`).toBe(12);
        }
    });
});

describe('rows, not boxes', () => {
    it('drops the card border, inner padding and lift for thin dividers', () => {
        const card = shipped(CARD);
        expect(card, 'rows are separated by a hairline').toMatch(/borderBottom: `1px solid \$\{T\.divider\}`/);
        expect(card, 'no boxed card border').not.toMatch(/border: soldOut \? `1px solid \$\{T\.outLine\}` : TV\.cardBorder/);
        expect(card, 'no lift').not.toMatch(/boxShadow: soldOut \? 'none' : TV\.cardShadow/);
        expect(card, 'row padding: 10px above and below, the 16px page gutter at the sides').toMatch(/padding: '10px 16px'/);
    });

    it('lets the rows run edge to edge, so an offer tint is a full-width band', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).not.toMatch(/width: '100%', padding: '0 16px',\s*\}\}>/);
        expect(tpl).toMatch(/data-testid="dish-rows"/);
    });
});

describe('photos stay sharp at 148 px', () => {
    it('cuts thumbnails at 450 px — 148 px at 3x needs 444', async () => {
        const { THUMB_EDGE_PX } = await import('@/lib/menu/menuImages');
        expect(THUMB_EDGE_PX).toBeGreaterThanOrEqual(444);
        expect(THUMB_EDGE_PX).toBe(450);
        const script = readFileSync(join(WEB, 'scripts', 'backfill-menu-thumbs.mjs'), 'utf8');
        expect(script, 'the backfill must cut the same size').toMatch(/const THUMB_EDGE_PX = 450;/);
    });
});

describe('the size-picker sheet', () => {
    it('shows the full-width 4:3 photo, not a 54 px thumbnail', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).not.toMatch(/width: 54, height: 54/);
        // Both sheets share one SheetPhoto (owner review, 2026-10-04).
        expect(tpl).toMatch(/<SheetPhoto product=\{product\} testId="compact-sheet-photo" \/>/);
    });
});
