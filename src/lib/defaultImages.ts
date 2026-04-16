// Supabase Storage bucket that holds the default food/product image library.
// All URLs stored in public.default_images.image_url come from this bucket.
export const DEFAULT_IMAGE_BUCKET = 'default-images';

export const DEFAULT_IMAGE_BUCKET_PREFIX =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${DEFAULT_IMAGE_BUCKET}`;

// Internal alias used within this module
const BUCKET_PREFIX = DEFAULT_IMAGE_BUCKET_PREFIX;

// Returns true if a given image URL came from our default image library.
// Used to decide whether a user-uploaded image should be preserved
// instead of being overwritten by an auto-match.
export function isDefaultImage(imageUrl: string): boolean {
  if (!imageUrl) return false;
  return imageUrl.includes(`/storage/v1/object/public/${DEFAULT_IMAGE_BUCKET}/`);
}

// ── Keyword → default image map ────────────────────────────────────────────────
// Used as a fast O(1) fallback when the vector similarity search returns no
// result (e.g. embedding model unavailable, new item with no close match).
// Keys are lowercase keywords; the value is the storage path under the bucket.
// Add more entries here as new images are seeded.

interface DefaultImageEntry {
  path: string;           // Storage object path (after bucket prefix)
  description: string;   // 2-line description shown in the product inventory card
}

const KEYWORD_MAP: Record<string, DefaultImageEntry> = {
  // ── Biryani ─────────────────────────────────────────────────────────────────
  biryani:         { path: 'cafe-foods/biriyani.jpeg',          description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },
  biriyani:        { path: 'cafe-foods/biriyani.jpeg',          description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },
  'dum biryani':   { path: 'cafe-foods/biriyani.jpeg',          description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },
  'veg biryani':   { path: 'cafe-foods/biriyani.jpeg',          description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },
  'chicken biryani': { path: 'cafe-foods/biriyani.jpeg',        description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },
  'mutton biryani': { path: 'cafe-foods/biriyani.jpeg',         description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },
  'egg biryani':   { path: 'cafe-foods/biriyani.jpeg',          description: 'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\nA rich, aromatic one-pot meal served with raita and salan.' },

  // ── Dosa ────────────────────────────────────────────────────────────────────
  dosa:            { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },
  'masala dosa':   { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },
  'plain dosa':    { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },
  'paper dosa':    { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },
  'rava dosa':     { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },
  'set dosa':      { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },
  'ghee dosa':     { path: 'cafe-foods/dosa.jpeg',              description: 'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\nServed with coconut chutney, tomato chutney, sambar and spiced potato filling.' },

  // ── Parotta ─────────────────────────────────────────────────────────────────
  parotta:         { path: 'cafe-foods/parotta.jpeg',           description: 'Flaky layered South Indian parotta made with maida, pan-fried golden and crispy.\nBest enjoyed with spicy chicken or vegetable salna and onion raita.' },
  paratha:         { path: 'cafe-foods/parotta.jpeg',           description: 'Flaky layered South Indian parotta made with maida, pan-fried golden and crispy.\nBest enjoyed with spicy chicken or vegetable salna and onion raita.' },
  parrota:         { path: 'cafe-foods/parotta.jpeg',           description: 'Flaky layered South Indian parotta made with maida, pan-fried golden and crispy.\nBest enjoyed with spicy chicken or vegetable salna and onion raita.' },
  'coin parotta':  { path: 'cafe-foods/parotta.jpeg',           description: 'Flaky layered South Indian parotta made with maida, pan-fried golden and crispy.\nBest enjoyed with spicy chicken or vegetable salna and onion raita.' },
  'kerala parotta': { path: 'cafe-foods/parotta.jpeg',          description: 'Flaky layered South Indian parotta made with maida, pan-fried golden and crispy.\nBest enjoyed with spicy chicken or vegetable salna and onion raita.' },

  // ── Grilled Chicken ─────────────────────────────────────────────────────────
  'grill chicken': { path: 'cafe-foods/grill-chicken.jpeg',     description: 'Whole chicken marinated in spiced yoghurt and char-grilled to smoky perfection.\nJuicy inside, beautifully charred outside — served with mint chutney and lime.' },
  'grilled chicken': { path: 'cafe-foods/grill-chicken.jpeg',   description: 'Whole chicken marinated in spiced yoghurt and char-grilled to smoky perfection.\nJuicy inside, beautifully charred outside — served with mint chutney and lime.' },
  'tandoori chicken': { path: 'cafe-foods/grill-chicken.jpeg',  description: 'Whole chicken marinated in spiced yoghurt and char-grilled to smoky perfection.\nJuicy inside, beautifully charred outside — served with mint chutney and lime.' },
  'bbq chicken':   { path: 'cafe-foods/grill-chicken.jpeg',     description: 'Whole chicken marinated in spiced yoghurt and char-grilled to smoky perfection.\nJuicy inside, beautifully charred outside — served with mint chutney and lime.' },
  'roast chicken': { path: 'cafe-foods/grill-chicken.jpeg',     description: 'Whole chicken marinated in spiced yoghurt and char-grilled to smoky perfection.\nJuicy inside, beautifully charred outside — served with mint chutney and lime.' },

  // ── Grilled Paneer ──────────────────────────────────────────────────────────
  paneer:          { path: 'cafe-foods/grill-paneer.jpeg',      description: 'Silky paneer cubes and vibrant peppers skewered and grilled over charcoal.\nSmoky, lightly charred and served with fresh mint chutney — a veggie grill favourite.' },
  'paneer tikka':  { path: 'cafe-foods/grill-paneer.jpeg',      description: 'Silky paneer cubes and vibrant peppers skewered and grilled over charcoal.\nSmoky, lightly charred and served with fresh mint chutney — a veggie grill favourite.' },
  'grill paneer':  { path: 'cafe-foods/grill-paneer.jpeg',      description: 'Silky paneer cubes and vibrant peppers skewered and grilled over charcoal.\nSmoky, lightly charred and served with fresh mint chutney — a veggie grill favourite.' },
  'grilled paneer': { path: 'cafe-foods/grill-paneer.jpeg',     description: 'Silky paneer cubes and vibrant peppers skewered and grilled over charcoal.\nSmoky, lightly charred and served with fresh mint chutney — a veggie grill favourite.' },

  // ── Chicken Noodles ─────────────────────────────────────────────────────────
  'chicken noodles': { path: 'cafe-foods/chicken-noodles.jpeg', description: 'Stir-fried egg noodles tossed with tender chicken strips and crunchy colourful vegetables.\nBold Indo-Chinese flavours with soy, chilli sauce and spring onions.' },
  'hakka noodles': { path: 'cafe-foods/chicken-noodles.jpeg',   description: 'Stir-fried egg noodles tossed with tender chicken strips and crunchy colourful vegetables.\nBold Indo-Chinese flavours with soy, chilli sauce and spring onions.' },
  'chow mein':     { path: 'cafe-foods/chicken-noodles.jpeg',   description: 'Stir-fried egg noodles tossed with tender chicken strips and crunchy colourful vegetables.\nBold Indo-Chinese flavours with soy, chilli sauce and spring onions.' },
  noodles:         { path: 'cafe-foods/chicken-noodles.jpeg',   description: 'Stir-fried egg noodles tossed with tender chicken strips and crunchy colourful vegetables.\nBold Indo-Chinese flavours with soy, chilli sauce and spring onions.' },

  // ── Chicken Fried Rice ──────────────────────────────────────────────────────
  'chicken rice':  { path: 'cafe-foods/chicken-rice.jpeg',      description: 'Wok-tossed rice with juicy chicken, mixed vegetables and a hint of soy and sesame.\nA satisfying Indo-Chinese classic served hot and fresh.' },
  'fried rice':    { path: 'cafe-foods/chicken-rice.jpeg',      description: 'Wok-tossed rice with juicy chicken, mixed vegetables and a hint of soy and sesame.\nA satisfying Indo-Chinese classic served hot and fresh.' },
  'chicken fried rice': { path: 'cafe-foods/chicken-rice.jpeg', description: 'Wok-tossed rice with juicy chicken, mixed vegetables and a hint of soy and sesame.\nA satisfying Indo-Chinese classic served hot and fresh.' },
  'veg fried rice': { path: 'cafe-foods/chicken-rice.jpeg',     description: 'Wok-tossed rice with juicy chicken, mixed vegetables and a hint of soy and sesame.\nA satisfying Indo-Chinese classic served hot and fresh.' },
  'egg fried rice': { path: 'cafe-foods/chicken-rice.jpeg',     description: 'Wok-tossed rice with juicy chicken, mixed vegetables and a hint of soy and sesame.\nA satisfying Indo-Chinese classic served hot and fresh.' },

  // ── Lemon Juice ─────────────────────────────────────────────────────────────
  'lemon juice':   { path: 'cafe-foods/lemon-juice.jpeg',       description: 'Freshly squeezed lemon juice over crushed ice with a hint of mint and a lemon slice.\nRefreshing and cooling — sweet, salted or spiced to your taste.' },
  'lime juice':    { path: 'cafe-foods/lemon-juice.jpeg',       description: 'Freshly squeezed lemon juice over crushed ice with a hint of mint and a lemon slice.\nRefreshing and cooling — sweet, salted or spiced to your taste.' },
  lemonade:        { path: 'cafe-foods/lemon-juice.jpeg',       description: 'Freshly squeezed lemon juice over crushed ice with a hint of mint and a lemon slice.\nRefreshing and cooling — sweet, salted or spiced to your taste.' },
  'nimbu pani':    { path: 'cafe-foods/lemon-juice.jpeg',       description: 'Freshly squeezed lemon juice over crushed ice with a hint of mint and a lemon slice.\nRefreshing and cooling — sweet, salted or spiced to your taste.' },
  'fresh lime':    { path: 'cafe-foods/lemon-juice.jpeg',       description: 'Freshly squeezed lemon juice over crushed ice with a hint of mint and a lemon slice.\nRefreshing and cooling — sweet, salted or spiced to your taste.' },

  // ── Lemon Soda ──────────────────────────────────────────────────────────────
  'lemon soda':    { path: 'cafe-foods/lemon-soda.jpeg',        description: 'Zingy lemon soda with berries and mint served over ice — bubbly and ultra-refreshing.\nThe perfect fizzy cooler for any South Indian meal.' },
  'lime soda':     { path: 'cafe-foods/lemon-soda.jpeg',        description: 'Zingy lemon soda with berries and mint served over ice — bubbly and ultra-refreshing.\nThe perfect fizzy cooler for any South Indian meal.' },
  soda:            { path: 'cafe-foods/lemon-soda.jpeg',        description: 'Zingy lemon soda with berries and mint served over ice — bubbly and ultra-refreshing.\nThe perfect fizzy cooler for any South Indian meal.' },
  'soda water':    { path: 'cafe-foods/lemon-soda.jpeg',        description: 'Zingy lemon soda with berries and mint served over ice — bubbly and ultra-refreshing.\nThe perfect fizzy cooler for any South Indian meal.' },

  // ── Atho Noodles ────────────────────────────────────────────────────────────
  atho:              { path: 'cafe-foods/veg-atho-noodles.jpeg',     description: 'Burmese Atho noodles tossed with colourful vegetables, tofu, crispy onions and peanuts.\nLight yet flavourful, with tangy tamarind, crunchy toppings and a hint of chilli.' },
  'veg atho':        { path: 'cafe-foods/veg-atho-noodles.jpeg',     description: 'Burmese Atho noodles tossed with colourful vegetables, tofu, crispy onions and peanuts.\nLight yet flavourful, with tangy tamarind, crunchy toppings and a hint of chilli.' },
  'atho noodles':    { path: 'cafe-foods/veg-atho-noodles.jpeg',     description: 'Burmese Atho noodles tossed with colourful vegetables, tofu, crispy onions and peanuts.\nLight yet flavourful, with tangy tamarind, crunchy toppings and a hint of chilli.' },
  'non veg atho':    { path: 'cafe-foods/non-veg-atho-noodles.jpeg', description: 'Myanmar-style Atho noodles in rich spiced broth with egg, crispy onions and peanuts.\nA bold, tangy noodle bowl packed with texture and deep umami flavour.' },
  'non veg atho noodles': { path: 'cafe-foods/non-veg-atho-noodles.jpeg', description: 'Myanmar-style Atho noodles in rich spiced broth with egg, crispy onions and peanuts.\nA bold, tangy noodle bowl packed with texture and deep umami flavour.' },
  'burmese noodles': { path: 'cafe-foods/non-veg-atho-noodles.jpeg', description: 'Myanmar-style Atho noodles in rich spiced broth with egg, crispy onions and peanuts.\nA bold, tangy noodle bowl packed with texture and deep umami flavour.' },
};

// ── Public API ─────────────────────────────────────────────────────────────────

export interface DefaultImageMatch {
  image_url: string;
  description: string;
}

/**
 * Keyword-based fallback matcher.
 * Checks if the product name (lowercased) contains any known keyword.
 * Returns the image URL and description, or null if no match.
 *
 * This is used:
 *  1. During onboarding (server-side) as a cheap O(1) fallback when the
 *     vector RPC returns no result.
 *  2. Client-side in the product inventory to fill placeholder images.
 */
export function matchByKeyword(productName: string): DefaultImageMatch | null {
  const lower = productName.toLowerCase().trim();

  // First: exact key match
  if (KEYWORD_MAP[lower]) {
    const e = KEYWORD_MAP[lower];
    return { image_url: `${BUCKET_PREFIX}/${e.path}`, description: e.description };
  }

  // Second: substring match — longest key wins (most specific)
  let bestKey = '';
  for (const key of Object.keys(KEYWORD_MAP)) {
    if (lower.includes(key) && key.length > bestKey.length) {
      bestKey = key;
    }
  }

  if (bestKey) {
    const e = KEYWORD_MAP[bestKey];
    return { image_url: `${BUCKET_PREFIX}/${e.path}`, description: e.description };
  }

  return null;
}
