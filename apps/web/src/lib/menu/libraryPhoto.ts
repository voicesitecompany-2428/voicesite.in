/**
 * One rule for putting a library photo on a dish: the photo may never show
 * more meat than the dish has.
 *
 * Used by every place that picks a photo from the shared food library
 * (onboarding, bulk upload, the dish drawer via /api/images/match) and by
 * scripts/repair-library-photos.ts for the dishes picked before the rule.
 *
 * Why the name is not enough (live DB, 2026-10-09): 89 dishes their owners
 * marked veg showed a non-veg library photo. "Kadala Curry", "Vatha Kuzhambu"
 * and "Poriyal" name nothing the matcher's vocabulary knows, so to the matcher
 * they were just "a curry" / "a fry" — and the chicken curry is a curry.
 * The dish's own marking (food_type, set by the owner or the extractor) closes
 * that gap; the name still overrides a marking it plainly contradicts.
 *
 * Pure and client-safe: no I/O. The library is passed in.
 */
import {
    dishConcepts,
    imageDiet,
    matchImage,
    photoFitsDiet,
    type ImageIndex,
} from '@/lib/menu/conceptMatcher';
import { DIET, type Diet } from '@/lib/menu/conceptVocabulary';

/** The slice of the image library this module needs (see imageLibrary.ts). */
export interface PhotoLibrary {
    index: ImageIndex;
    byName: Map<string, { imageUrl: string }>;
}

const LIBRARY_URL = /\/storage\/v1\/object\/public\/default-images\/([^?#]+)/;

/**
 * The dish's marking as a diet. `food_type` (veg | egg | non_veg | unknown) is
 * the reliable column; `dish_type` is read only when food_type says nothing,
 * because it defaulted to "Non-Vegetarian" for every dish for months.
 */
export function dietFromFoodType(foodType: string | null | undefined, dishType?: string | null): Diet | null {
    switch (foodType) {
        case 'veg': return 'v';
        case 'egg': return 'egg';
        case 'non_veg': return 'nv';
    }
    switch (dishType) {
        case 'Vegetarian': return 'v';
        case 'Egg': return 'egg';
        case 'Non-Vegetarian': return 'nv';
    }
    return null;
}

/** What the dish NAME says it contains: meat beats egg beats veg; null when it says nothing. */
function nameDiet(name: string): Diet | null {
    const diets = new Set(dishConcepts(name).map((c) => DIET[c]).filter(Boolean));
    if (diets.has('nv')) return 'nv';
    if (diets.has('egg')) return 'egg';
    if (diets.has('v')) return 'v';
    return null;
}

/**
 * The diet a photo must respect. The name wins when it names the protein —
 * "Paneer Tikka" left at the old Non-Vegetarian default is still paneer, and
 * "Chicken 65" ticked veg by mistake still shows chicken. Otherwise the
 * marking decides.
 */
export function dishDiet(name: string, marked: Diet | null): Diet | null {
    return nameDiet(name) ?? marked;
}

/** "…/default-images/cafe-foods/dosa.jpeg" → "dosa"; null for anything not in the library. */
export function libraryImageName(url: string | null | undefined): string | null {
    const m = url ? LIBRARY_URL.exec(url) : null;
    if (!m) return null;
    const file = m[1].split('/').pop() ?? '';
    return file.replace(/\.(jpeg|jpg|png|webp|avif)$/i, '') || null;
}

/** The library photo URL for a dish, or null when nothing fits. */
export function pickLibraryImage(
    name: string,
    foodType: string | null | undefined,
    library: PhotoLibrary,
    dishType?: string | null,
): string | null {
    const query = (name ?? '').trim().slice(0, 500);
    if (!query) return null;
    const diet = dishDiet(query, dietFromFoodType(foodType, dishType));
    const result = matchImage(query, library.index, { diet });
    if (result.decision === 'abstain' || !result.image) return null;
    return library.byName.get(result.image)?.imageUrl ?? null;
}

export interface RepairableProduct {
    id: string;
    site_id: string;
    name: string;
    food_type: string | null;
    dish_type: string | null;
    image_url: string | null;
}

export interface PhotoRepair {
    id: string;
    site_id: string;
    name: string;
    /** The photo the plan was made from; the write must still find it there. */
    from: string;
    /** The replacement, or null to show no photo rather than a wrong one. */
    to: string | null;
    reason: string;
}

const LABEL: Record<Diet, string> = { v: 'veg', egg: 'egg', nv: 'non-veg' };

/**
 * Which dishes show a library photo with more meat than the dish has, and what
 * to show instead. Never proposes a change for an owner's own upload, a dish
 * with no photo, or a library photo that is merely not the matcher's favourite.
 */
export function planLibraryPhotoRepair(products: readonly RepairableProduct[], library: PhotoLibrary): PhotoRepair[] {
    const out: PhotoRepair[] = [];
    for (const p of products) {
        const current = libraryImageName(p.image_url);
        if (!current || !p.image_url) continue;

        const diet = dishDiet(p.name ?? '', dietFromFoodType(p.food_type, p.dish_type));
        const shown = imageDiet(current, library.index);
        if (!shown || photoFitsDiet([shown], diet)) continue;

        out.push({
            id: p.id,
            site_id: p.site_id,
            name: p.name,
            from: p.image_url,
            to: pickLibraryImage(p.name ?? '', p.food_type, library, p.dish_type),
            reason: `${LABEL[diet as Diet]} dish, ${LABEL[shown]} photo (${current})`,
        });
    }
    return out;
}
