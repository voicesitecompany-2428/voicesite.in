/**
 * Search within one store's menu.
 *
 * Runs in the browser on every keystroke over a menu already on the page —
 * no request, no index. A typical menu is 20–250 dishes.
 *
 * Every word the diner typed must appear somewhere (name, category or
 * description), in any order. Results are ranked the way a diner scans:
 *
 *   0  the name starts with the query      "tea" → "Tea Bun"
 *   1  every word is in the name           "tea" → "Masala Tea"
 *   2  …or in the category                 "tea" → "Lime Soda" in "Teas & Coolers"
 *   3  …or only in the description         "tea" → "Paneer Tikka, tea-leaf smoke"
 *
 * Sold-out dishes come after everything that can be had today, the same rule
 * the menu list follows. Ties keep the owner's menu order.
 */

export interface SearchableDish {
    name: string;
    description?: string | null;
    category?: string | null;
    is_live?: boolean;
}

function normalise(text: string | null | undefined): string {
    return (text ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function searchMenu<T extends SearchableDish>(dishes: readonly T[], query: string): T[] {
    const q = normalise(query);
    if (!q) return [];
    const words = q.split(' ');

    const ranked: Array<{ dish: T; rank: number; order: number }> = [];
    dishes.forEach((dish, order) => {
        const name = normalise(dish.name);
        const category = normalise(dish.category);
        const description = normalise(dish.description);
        const everywhere = `${name} ${category} ${description}`;
        if (!words.every(w => everywhere.includes(w))) return;

        let rank = 3;
        if (name.startsWith(q)) rank = 0;
        else if (words.every(w => name.includes(w))) rank = 1;
        else if (words.every(w => `${name} ${category}`.includes(w))) rank = 2;
        ranked.push({ dish, rank, order });
    });

    const soldOut = (d: T) => (d.is_live === false ? 1 : 0);
    ranked.sort((a, b) => soldOut(a.dish) - soldOut(b.dish) || a.rank - b.rank || a.order - b.order);
    return ranked.map(r => r.dish);
}
