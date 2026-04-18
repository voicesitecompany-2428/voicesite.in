// scripts/seed-food-images-2.mjs
// Uploads images from "food image 2/" to Supabase Storage,
// generates OpenAI embeddings, and inserts rows into default_images table.
// Run: node scripts/seed-food-images-2.mjs

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://wdnruubljlwrduxnvuhr.supabase.co';
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbnJ1dWJsamx3cmR1eG52dWhyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM1NjM0NiwiZXhwIjoyMDg1OTMyMzQ2fQ.Mo7mf9WFCWyhkoZ6HN6NDNBg4Z2RybpYwR4gD9STyX0';
const OPENAI_KEY   = process.env.OPENAI_API_KEY;
const BUCKET       = 'default-images';
const FOLDER       = path.join(ROOT, 'food image 2');

if (!OPENAI_KEY) {
  console.error('Set OPENAI_API_KEY env var before running');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const openai   = new OpenAI({ apiKey: OPENAI_KEY });

// ── Image catalogue ─────────────────────────────────────────────────────────
// filename → { slug, name, description }
const IMAGES = [
  {
    file: 'Chicken Shawarma.jpeg',
    slug: 'chicken-shawarma.jpeg',
    name: 'Chicken Shawarma',
    description: 'Tender marinated chicken slow-roasted on a vertical spit, wrapped in soft flatbread with garlic sauce and pickled vegetables.\nA Middle Eastern street-food favourite — juicy, smoky and full of bold spices.',
  },
  {
    file: 'Chicken Tikka.jpeg',
    slug: 'chicken-tikka.jpeg',
    name: 'Chicken Tikka',
    description: 'Boneless chicken pieces marinated in spiced yoghurt and char-grilled in a tandoor until smoky and juicy.\nServed with mint chutney, sliced onions and a squeeze of lime.',
  },
  {
    file: 'Chicken noddles.jpeg',
    slug: 'chicken-noodles-2.jpeg',
    name: 'Chicken Noodles',
    description: 'Stir-fried egg noodles tossed with tender chicken strips, capsicum and spring onions in Indo-Chinese sauces.\nSpicy, saucy and satisfying — a popular street-style noodle dish.',
  },
  {
    file: 'Egg Biriyani .jpeg',
    slug: 'egg-biriyani.jpeg',
    name: 'Egg Biryani',
    description: 'Fragrant basmati rice layered with spiced boiled eggs, caramelised onions and fresh herbs.\nA vegetarian-friendly biryani with rich masala flavours and a saffron aroma.',
  },
  {
    file: 'bread omelette.jpeg',
    slug: 'bread-omelette.jpeg',
    name: 'Bread Omelette',
    description: 'Fluffy spiced egg omelette cooked with onions, green chilli and coriander, sandwiched between buttered bread slices.\nA quick, hearty breakfast or snack — crispy on the outside, soft inside.',
  },
  {
    file: 'brownie.jpeg',
    slug: 'brownie.jpeg',
    name: 'Brownie',
    description: 'Rich, fudgy chocolate brownie baked with dark chocolate and butter for a dense, moist crumb.\nServed warm with a dusting of powdered sugar or a scoop of vanilla ice cream.',
  },
  {
    file: 'burger.jpeg',
    slug: 'burger.jpeg',
    name: 'Burger',
    description: 'Juicy grilled patty stacked with fresh lettuce, tomato, cheese and house sauce in a toasted sesame bun.\nA classic crowd-pleaser — crispy, saucy and satisfying with every bite.',
  },
  {
    file: 'butter naan.jpeg',
    slug: 'butter-naan.jpeg',
    name: 'Butter Naan',
    description: 'Soft leavened flatbread baked in a tandoor and generously brushed with melted butter.\nLight, fluffy and slightly charred — perfect with any curry or dal.',
  },
  {
    file: 'chicken  leg lollipop.jpeg',
    slug: 'chicken-leg-lollipop.jpeg',
    name: 'Chicken Leg Lollipop',
    description: 'Chicken drumsticks marinated in spicy red masala and deep-fried to a crispy, juicy finish.\nA fun finger food — boldly spiced, crunchy outside and succulent inside.',
  },
  {
    file: 'chicken 65.jpeg',
    slug: 'chicken-65.jpeg',
    name: 'Chicken 65',
    description: 'Bite-sized chicken pieces deep-fried in a fiery red spice marinade with curry leaves and green chilli.\nA South Indian classic starter — crispy, tangy and intensely flavourful.',
  },
  {
    file: 'chicken BBQ .jpeg',
    slug: 'chicken-bbq.jpeg',
    name: 'Chicken BBQ',
    description: 'Chicken pieces marinated in smoky BBQ sauce and grilled over open flame until charred and caramelised.\nSweet, smoky and tender — served with coleslaw and dipping sauce.',
  },
  {
    file: 'chicken kebab.jpeg',
    slug: 'chicken-kebab.jpeg',
    name: 'Chicken Kebab',
    description: 'Minced chicken blended with herbs and spices, shaped on skewers and grilled in a tandoor.\nSmooth, smoky and aromatic — served with green chutney and sliced onions.',
  },
  {
    file: 'chicken pizza.jpeg',
    slug: 'chicken-pizza.jpeg',
    name: 'Chicken Pizza',
    description: 'Thin or thick crust pizza topped with spiced chicken, mozzarella, capsicum and tangy tomato sauce.\nGolden, bubbly and loaded with toppings — a crowd favourite at any table.',
  },
  {
    file: 'chicken tandoori.jpeg',
    slug: 'chicken-tandoori.jpeg',
    name: 'Chicken Tandoori',
    description: 'Whole chicken marinated overnight in yoghurt, lemon and red spices, roasted in a clay tandoor oven.\nJuicy inside with a beautifully charred crust — served with onion rings and chutney.',
  },
  {
    file: 'cool drinks.jpeg',
    slug: 'cool-drinks.jpeg',
    name: 'Cool Drinks',
    description: 'Chilled soft drinks and sodas served ice-cold — Pepsi, Coke, Sprite, Thumbs Up and more.\nThe perfect refresher to pair with any spicy South Indian meal.',
  },
  {
    file: 'crab fry.jpeg',
    slug: 'crab-fry.jpeg',
    name: 'Crab Fry',
    description: 'Fresh crab pieces tossed in a fiery South Indian masala with curry leaves, pepper and coastal spices.\nDeep, bold seafood flavours — spicy, aromatic and absolutely finger-licking.',
  },
  {
    file: 'curd rice .jpeg',
    slug: 'curd-rice.jpeg',
    name: 'Curd Rice',
    description: 'Soft cooked rice mixed with fresh yoghurt and tempered with mustard seeds, curry leaves and ginger.\nCooling, comforting and easy on the stomach — a South Indian staple.',
  },
  {
    file: 'fish fry .jpeg',
    slug: 'fish-fry.jpeg',
    name: 'Fish Fry',
    description: 'Fresh fish fillets coated in spiced masala and pan-fried or deep-fried until crispy and golden.\nCrunchy outside, flaky and juicy inside — best with lemon and onion salad.',
  },
  {
    file: 'french fry.jpeg',
    slug: 'french-fry.jpeg',
    name: 'French Fries',
    description: 'Golden crispy potato strips deep-fried to perfection and lightly salted.\nA universally loved snack — crunchy, hot and great with ketchup or dips.',
  },
  {
    file: 'full lunch rice meals.jpeg',
    slug: 'full-meals.jpeg',
    name: 'Full Meals',
    description: 'Traditional South Indian thali with steamed rice, sambar, rasam, kootu, papad, pickle and payasam.\nA complete balanced meal served on a banana leaf — wholesome and satisfying.',
  },
  {
    file: 'ice cream.jpeg',
    slug: 'ice-cream.jpeg',
    name: 'Ice Cream',
    description: 'Creamy, chilled ice cream scoops in classic and seasonal flavours — vanilla, chocolate, strawberry and more.\nA sweet, indulgent finish to any meal.',
  },
  {
    file: 'kadai chicken.jpeg',
    slug: 'kadai-chicken.jpeg',
    name: 'Kadai Chicken',
    description: 'Chicken cooked in a wok with freshly ground spices, capsicum, onion and tomato in a rich masala gravy.\nRobust, aromatic and slightly dry — best mopped up with naan or roti.',
  },
  {
    file: 'lassi.jpeg',
    slug: 'lassi.jpeg',
    name: 'Lassi',
    description: 'Thick, chilled yoghurt drink blended smooth — sweet, salted or flavoured with mango or rose.\nCreamy, refreshing and the perfect antidote to spicy food.',
  },
  {
    file: 'malai chicken.jpeg',
    slug: 'malai-chicken.jpeg',
    name: 'Malai Chicken',
    description: 'Tender chicken marinated in cream, cheese and mild spices, grilled to a silky, melt-in-mouth finish.\nDelicately spiced with a rich, creamy texture — a mild and luxurious kebab.',
  },
  {
    file: 'mutton biriyani.jpeg',
    slug: 'mutton-biriyani.jpeg',
    name: 'Mutton Biryani',
    description: 'Slow-cooked tender mutton layered with saffron-infused basmati rice, fried onions and whole spices.\nA robust, deeply flavoured biryani — rich, hearty and utterly indulgent.',
  },
  {
    file: 'naan.jpeg',
    slug: 'naan.jpeg',
    name: 'Naan',
    description: 'Soft, pillowy leavened bread baked in a tandoor — plain, garlic or stuffed with paneer or keema.\nThe perfect accompaniment to any North Indian curry or dal.',
  },
  {
    file: 'panner butter masala .jpeg',
    slug: 'paneer-butter-masala.jpeg',
    name: 'Paneer Butter Masala',
    description: 'Soft paneer cubes simmered in a velvety tomato, butter and cashew gravy with aromatic spices.\nRich, creamy and mildly spiced — the quintessential North Indian vegetarian curry.',
  },
  {
    file: 'prawn biriyani.jpeg',
    slug: 'prawn-biriyani.jpeg',
    name: 'Prawn Biryani',
    description: 'Plump prawns cooked with fragrant basmati rice, coastal spices, fried onions and fresh coriander.\nA succulent seafood biryani — bold, aromatic and irresistibly flavourful.',
  },
  {
    file: 'roti chappathi .jpeg',
    slug: 'roti-chapathi.jpeg',
    name: 'Roti / Chapathi',
    description: 'Soft whole-wheat flatbread rolled thin and cooked on a tawa until lightly puffed and golden.\nLight, healthy and versatile — pairs perfectly with any curry, dal or sabzi.',
  },
  {
    file: 'veg noddels.jpeg',
    slug: 'veg-noodles.jpeg',
    name: 'Veg Noodles',
    description: 'Stir-fried egg noodles tossed with colourful vegetables in soy, chilli and sesame sauce.\nA quick Indo-Chinese favourite — flavourful, light and satisfying.',
  },
  {
    file: 'veg pizza .jpeg',
    slug: 'veg-pizza.jpeg',
    name: 'Veg Pizza',
    description: 'Crispy pizza base topped with tangy tomato sauce, mozzarella, capsicum, corn and olives.\nGolden, cheesy and loaded with vegetables — a hearty vegetarian treat.',
  },
  {
    file: 'veg salad .jpeg',
    slug: 'veg-salad.jpeg',
    name: 'Veg Salad',
    description: 'Fresh garden salad with crisp lettuce, cucumber, tomato, carrot and a tangy lemon dressing.\nLight, crunchy and refreshing — a healthy starter or side.',
  },
  {
    file: 'veg shawarma.jpeg',
    slug: 'veg-shawarma.jpeg',
    name: 'Veg Shawarma',
    description: 'Crispy spiced vegetables and paneer wrapped in soft flatbread with garlic sauce and fresh salad.\nA vegetarian twist on the Middle Eastern classic — filling and full of flavour.',
  },
  {
    file: 'white rice.jpeg',
    slug: 'white-rice.jpeg',
    name: 'White Rice',
    description: 'Soft, fluffy steamed white rice cooked to perfection — plain, simple and comforting.\nThe essential South Indian base — best with sambar, rasam, curd or any curry.',
  },
];

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nSeeding ${IMAGES.length} images...\n`);

  for (const img of IMAGES) {
    const filePath = path.join(FOLDER, img.file);
    const storagePath = `cafe-foods/${img.slug}`;
    const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    // 1. Upload to storage
    const fileBuffer = fs.readFileSync(filePath);
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    if (uploadError) {
      console.error(`  ✗ Upload failed: ${img.slug} — ${uploadError.message}`);
      continue;
    }
    console.log(`  ✓ Uploaded: ${img.slug}`);

    // 2. Generate embedding for the description
    const embRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: img.name.toLowerCase(),
    });
    const embedding = embRes.data[0].embedding;

    // 3. Insert into default_images table (skip if URL already exists)
    const { data: existing } = await supabase
      .from('default_images')
      .select('id')
      .eq('image_url', imageUrl)
      .maybeSingle();

    let dbError;
    if (existing) {
      const { error } = await supabase
        .from('default_images')
        .update({ description: img.description, embedding })
        .eq('image_url', imageUrl);
      dbError = error;
    } else {
      const { error } = await supabase
        .from('default_images')
        .insert({ image_url: imageUrl, description: img.description, embedding });
      dbError = error;
    }
    if (dbError) {
      console.error(`  ✗ DB insert failed: ${img.name} — ${dbError.message}`);
    } else {
      console.log(`  ✓ DB row upserted: ${img.name}`);
    }
  }

  console.log('\nDone! All images seeded.\n');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
