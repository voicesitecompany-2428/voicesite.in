/**
 * Seed script — uploads food images to Supabase Storage and inserts
 * rows into the default_images table with OpenAI vector embeddings.
 *
 * Usage:
 *   node scripts/seed-default-images.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ── Load .env.local ────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY   = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !OPENAI_KEY) {
  console.error('Missing env vars. Check .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const openai   = new OpenAI({ apiKey: OPENAI_KEY });

// ── Food image catalogue ───────────────────────────────────────────────────────
// Each entry:
//   file      — filename in the "food images/images/" folder
//   key       — storage path (stored under cafe-foods/)
//   name      — canonical dish name used for embedding
//   category  — broad category for filtering
//   tags      — keyword array used by keyword-fallback matching in defaultImages.ts
//   description — 2-line rich description stored in the table (shown in product inventory)
//   embedding_text — detailed prose fed to the embedding model for similarity search

const IMAGES = [
  {
    file: 'biriyani.jpeg',
    key: 'cafe-foods/biriyani.jpeg',
    name: 'Biryani',
    category: 'Rice',
    tags: ['biryani', 'biriyani', 'rice', 'dum', 'chicken biryani', 'mutton biryani', 'veg biryani', 'dum biryani'],
    description:
      'Fragrant basmati rice slow-cooked with spices, topped with caramelised onions and fresh mint.\n' +
      'A rich, aromatic one-pot meal served with raita and salan.',
    embedding_text:
      'Biryani biriyani — layered basmati rice cooked dum style with whole spices, caramelised onions, ' +
      'saffron, mint, coriander. Available as chicken biryani, mutton biryani, egg biryani, veg biryani. ' +
      'South Indian style, Hyderabadi biryani, Ambur biryani, Thalassery biryani.',
  },
  {
    file: 'chicken noodles.jpeg',
    key: 'cafe-foods/chicken-noodles.jpeg',
    name: 'Chicken Noodles',
    category: 'Noodles',
    tags: ['noodles', 'chicken noodles', 'hakka noodles', 'chow mein', 'indo chinese'],
    description:
      'Stir-fried egg noodles tossed with tender chicken strips and crunchy colourful vegetables.\n' +
      'Bold Indo-Chinese flavours with soy, chilli sauce and spring onions.',
    embedding_text:
      'Chicken noodles — hakka noodles chow mein stir-fried wok egg noodles chicken strips mushroom ' +
      'capsicum carrot soy sauce chilli sauce spring onion Indo Chinese restaurant style.',
  },
  {
    file: 'chicken rice.jpeg',
    key: 'cafe-foods/chicken-rice.jpeg',
    name: 'Chicken Fried Rice',
    category: 'Rice',
    tags: ['fried rice', 'chicken rice', 'chicken fried rice', 'indo chinese rice'],
    description:
      'Wok-tossed rice with juicy chicken, mixed vegetables and a hint of soy and sesame.\n' +
      'A satisfying Indo-Chinese classic served hot and fresh.',
    embedding_text:
      'Chicken fried rice wok tossed Indo Chinese restaurant style rice chicken pieces peas carrot ' +
      'corn soy sauce sesame spring onion egg fried rice.',
  },
  {
    file: 'dosa.jpeg',
    key: 'cafe-foods/dosa.jpeg',
    name: 'Dosa',
    category: 'South Indian',
    tags: ['dosa', 'masala dosa', 'plain dosa', 'crispy dosa', 'rava dosa', 'paper dosa', 'set dosa'],
    description:
      'Golden crispy rice and lentil crepe fermented overnight for the perfect tang and crunch.\n' +
      'Served with coconut chutney, tomato chutney, sambar and spiced potato filling.',
    embedding_text:
      'Dosa — masala dosa plain dosa paper dosa rava dosa set dosa crispy thin crepe fermented rice ' +
      'lentil batter served with sambar coconut chutney tomato chutney potato masala filling South Indian breakfast.',
  },
  {
    file: 'grill chicken .jpeg',
    key: 'cafe-foods/grill-chicken.jpeg',
    name: 'Grilled Chicken',
    category: 'Grills',
    tags: ['grill chicken', 'grilled chicken', 'tandoori chicken', 'bbq chicken', 'roast chicken'],
    description:
      'Whole chicken marinated in spiced yoghurt and char-grilled to smoky perfection.\n' +
      'Juicy inside, beautifully charred outside — served with mint chutney and lime.',
    embedding_text:
      'Grilled chicken grill chicken tandoori roast bbq whole chicken marinated yoghurt spices char grilled ' +
      'smoky juicy mint chutney lime non veg starter main course.',
  },
  {
    file: 'grill panner.jpeg',
    key: 'cafe-foods/grill-paneer.jpeg',
    name: 'Grilled Paneer',
    category: 'Grills',
    tags: ['grill paneer', 'paneer', 'paneer tikka', 'paneer grill', 'veg grill', 'paneer skewer'],
    description:
      'Silky paneer cubes and vibrant peppers skewered and grilled over charcoal.\n' +
      'Smoky, lightly charred and served with fresh mint chutney — a veggie grill favourite.',
    embedding_text:
      'Grilled paneer paneer tikka skewers charcoal grill paneer cubes bell pepper capsicum mushroom ' +
      'marinated spices smoky charred veg starter appetiser mint chutney.',
  },
  {
    file: 'lemon juice .jpeg',
    key: 'cafe-foods/lemon-juice.jpeg',
    name: 'Lemon Juice',
    category: 'Beverages',
    tags: ['lemon juice', 'fresh lime juice', 'nimbu pani', 'lemon drink', 'lime water', 'lemonade'],
    description:
      'Freshly squeezed lemon juice over crushed ice with a hint of mint and a lemon slice.\n' +
      'Refreshing and cooling — sweet, salted or spiced to your taste.',
    embedding_text:
      'Lemon juice fresh lime juice nimbu pani lemonade freshly squeezed lemon crushed ice mint ' +
      'cold drink refreshing beverage sweet salted spiced.',
  },
  {
    file: 'lemon soda.jpeg',
    key: 'cafe-foods/lemon-soda.jpeg',
    name: 'Lemon Soda',
    category: 'Beverages',
    tags: ['lemon soda', 'soda', 'lime soda', 'fizzy drink', 'sparkling lemon', 'soda water lemon'],
    description:
      'Zingy lemon soda with berries and mint served over ice — bubbly and ultra-refreshing.\n' +
      'The perfect fizzy cooler for any South Indian meal.',
    embedding_text:
      'Lemon soda sparkling soda water lemon lime fizzy drink carbonated cold beverage mint fresh ' +
      'lemon soda with ice berry garnish refreshing cool drink.',
  },
  {
    file: 'non vegn atho noodels.jpeg',
    key: 'cafe-foods/non-veg-atho-noodles.jpeg',
    name: 'Non-Veg Atho Noodles',
    category: 'Noodles',
    tags: ['atho', 'atho noodles', 'non veg atho', 'burmese noodles', 'myanmar noodles', 'atho salad'],
    description:
      'Myanmar-style Atho noodles in rich spiced broth with egg, crispy onions and peanuts.\n' +
      'A bold, tangy noodle bowl packed with texture and deep umami flavour.',
    embedding_text:
      'Non veg atho noodles Burmese Myanmar style noodles egg boiled egg crispy onion fried garlic ' +
      'peanut powder tamarind broth spiced soup noodle salad Chennai street food.',
  },
  {
    file: 'parrota.jpeg',
    key: 'cafe-foods/parotta.jpeg',
    name: 'Parotta',
    category: 'Breads',
    tags: ['parotta', 'parrota', 'paratha', 'kerala parotta', 'layered bread', 'coin parotta'],
    description:
      'Flaky layered South Indian parotta made with maida, pan-fried golden and crispy.\n' +
      'Best enjoyed with spicy chicken or vegetable salna and onion raita.',
    embedding_text:
      'Parotta parrota layered flaky flat bread Kerala parotta maida kneaded pan fried golden crispy ' +
      'served with chicken salna vegetable kurma egg curry South Indian bread.',
  },
  {
    file: 'veg atho .jpeg',
    key: 'cafe-foods/veg-atho-noodles.jpeg',
    name: 'Veg Atho Noodles',
    category: 'Noodles',
    tags: ['veg atho', 'atho', 'vegetarian atho', 'veg noodles', 'atho noodles', 'burmese veg noodles'],
    description:
      'Burmese Atho noodles tossed with colourful vegetables, tofu, crispy onions and peanuts.\n' +
      'Light yet flavourful, with tangy tamarind, crunchy toppings and a hint of chilli.',
    embedding_text:
      'Veg atho noodles vegetarian Burmese Myanmar style noodles tofu mushroom baby corn capsicum ' +
      'crispy onion peanut tamarind broth light tangy noodle salad Chennai street food vegetarian.',
  },
];

const BUCKET = 'default-images';

// ── Helpers ────────────────────────────────────────────────────────────────────
async function uploadImage(localPath, storageKey) {
  const buf  = fs.readFileSync(localPath);
  const mime = localPath.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Check if already uploaded
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(path.dirname(storageKey), { search: path.basename(storageKey) });

  if (existing?.length) {
    console.log(`  ✓ already in storage: ${storageKey}`);
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storageKey}`;
  }

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storageKey, buf, { contentType: mime, upsert: true });

  if (error) throw new Error(`Upload failed for ${storageKey}: ${error.message}`);
  console.log(`  ↑ uploaded: ${storageKey}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storageKey}`;
}

async function embed(text) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 800),
  });
  return res.data[0].embedding;
}

// ── Main ───────────────────────────────────────────────────────────────────────
const IMAGES_DIR = path.join(__dirname, '..', 'food images', 'images');

for (const img of IMAGES) {
  console.log(`\n▶ ${img.name}`);
  const localPath = path.join(IMAGES_DIR, img.file);

  if (!fs.existsSync(localPath)) {
    console.warn(`  ⚠ file not found: ${localPath}, skipping`);
    continue;
  }

  // 1. Upload to Storage
  const imageUrl = await uploadImage(localPath, img.key);

  // 2. Check if row already exists
  const { data: existing } = await supabase
    .from('default_images')
    .select('id')
    .eq('image_url', imageUrl)
    .maybeSingle();

  if (existing) {
    console.log(`  ✓ row already exists in default_images`);
    continue;
  }

  // 3. Generate embedding
  console.log(`  ~ generating embedding…`);
  const embedding = await embed(img.embedding_text);

  // 4. Insert row
  const { error: insertError } = await supabase.from('default_images').insert({
    image_url:   imageUrl,
    description: img.description,
    embedding:   JSON.stringify(embedding),
    category:    img.category,
    tags:        img.tags,
  });

  if (insertError) {
    console.error(`  ✗ insert failed: ${insertError.message}`);
  } else {
    console.log(`  ✓ inserted into default_images`);
  }
}

console.log('\n✅ Seeding complete!');
