import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Owner's review of the dish sheet and search, 2026-10-04.
 *
 *   1. Toppings showed as radio buttons on a menu that takes no orders: a
 *      control that looks like a choice and leads nowhere. Same defect the
 *      size list had. On the view-only menu they are information.
 *   2. "What's included" carried pink bullet dots that read as decoration on
 *      top of the design.
 *   3. Search opened a separate full screen with its own category chips.
 *      Swiggy and Zomato search inside the menu itself: the header becomes
 *      a search field and the list below filters as you type, matching names,
 *      categories and descriptions. Categories stay in the one chip row.
 *   4. The size-picker sheet is brought to the same structure as the photo
 *      sheet: × above, photo, veg mark + name, price, description, sections,
 *      all in one scroll area.
 *
 * Frame-level proof: tests/e2e/menu-sheet-search.spec.ts.
 */

const SRC = join(__dirname, '..', '..', 'src');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
const shipped = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const TEMPLATE = 'components/templates/QRMenuTemplate.tsx';

type P = { id: string; name: string; description?: string | null; category?: string | null; is_live?: boolean };
const menu: P[] = [
    { id: '1', name: 'Masala Tea', category: 'Beverages', description: 'Ginger and cardamom' },
    { id: '2', name: 'Lemon Iced Tea', category: 'Beverages', description: null },
    { id: '3', name: 'Tea Cake', category: 'Bakes', description: 'Butter sponge', is_live: false },
    { id: '4', name: 'Paneer Tikka', category: 'Starters', description: 'Charred with tea-leaf smoke' },
    { id: '5', name: 'Chicken Rice', category: 'Rice', description: 'Fragrant rice' },
    { id: '6', name: 'Lime Soda', category: 'Teas & Coolers', description: '' },
];

describe('searchMenu', () => {
    it('returns nothing for an empty query', async () => {
        const { searchMenu } = await import('@/lib/menu/menuSearch');
        expect(searchMenu(menu, '   ')).toEqual([]);
    });

    it('ranks name starts, then name contains, then category, then description; sold out last', async () => {
        const { searchMenu } = await import('@/lib/menu/menuSearch');
        // Masala Tea, Lemon Iced Tea (name), Lime Soda (category "Teas & Coolers"),
        // Paneer Tikka (description), then Tea Cake: its name starts with "tea"
        // but it is sold out today.
        expect(searchMenu(menu, 'tea').map((p: P) => p.id)).toEqual(['1', '2', '6', '4', '3']);
        expect(searchMenu([...menu, { id: '7', name: 'Tea Bun' }], 'tea')[0].id, 'a name that starts with the word leads').toBe('7');
    });

    it('needs every word, in any order, ignoring case and extra spaces', async () => {
        const { searchMenu } = await import('@/lib/menu/menuSearch');
        expect(searchMenu(menu, '  ICED   lemon ').map((p: P) => p.id)).toEqual(['2']);
        expect(searchMenu(menu, 'rice chicken').map((p: P) => p.id)).toEqual(['5']);
        expect(searchMenu(menu, 'pizza')).toEqual([]);
    });
});

describe('the dish sheet is a reading surface', () => {
    it('lists add-ons read-only when nothing can be ordered, and keeps the picker for ordering', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).toMatch(/\{!canOrder && toppings/);
        expect(tpl).toMatch(/data-testid="addon-row"/);
        expect(tpl, 'the frozen ordering picker stays, gated').toMatch(/\{canOrder && toppings/);
    });

    it('draws no pink dots in "What\'s included"', () => {
        const tpl = shipped(TEMPLATE);
        const start = tpl.indexOf('testId="combo-items"');
        expect(start).toBeGreaterThan(-1);
        // Just the section: the frozen ordering bar after it is pink by design.
        expect(tpl.slice(start, tpl.indexOf('</SheetSection>', start))).not.toMatch(/T\.pink/);
    });

    it('gives the size-picker sheet the photo sheet\'s structure', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl, 'both layouts float the × above the sheet').toMatch(/sheetKind="sizes"/);
        expect(tpl).toMatch(/sheetKind="single"/);
        expect((tpl.match(/above={<SheetClose/g) ?? []).length, "one shared × for both layouts").toBe(2);
        expect(tpl, 'a price range for a dish with sizes').toMatch(/priceRange/);
    });
});

describe('search lives inside the menu', () => {
    it('has no separate search screen and no chips of its own', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).not.toMatch(/function SearchOverlay/);
        expect(tpl).not.toMatch(/aria-label="Browse menu"/);
        expect(tpl).not.toMatch(/activeChip/);
    });

    it('turns the header into a search field and filters the list in place', () => {
        const tpl = shipped(TEMPLATE);
        expect(tpl).toMatch(/data-testid="menu-search-input"/);
        expect(tpl).toMatch(/searchMenu\(/);
        expect(tpl).toMatch(/data-testid="search-summary"/);
    });
});
