# QR Menu Template — Design Spec
**Date:** 2026-04-15  
**Branch:** redesign-MVP  
**Goal:** Replace `MenuKioskTemplate.tsx` with a new scalable `QRMenuTemplate.tsx` that exactly matches the Figma design. QR plan users get a browse-only menu view. The template system is built so future templates can be added by name.

---

## 1. Design Tokens

### Colors
| Role | Value |
|---|---|
| Primary background | `#ffffff` |
| Surface / card bg | `#fafafa`, `#f5f5f5`, `#f4f4f4` |
| Brand pink (primary CTA) | `#ef59a1` |
| Brand dark green (veg indicator) | `#004238` |
| Brand mid green (veg dot fill) | `#13801c` |
| Brand bright green (nonveg alt) | `#00a63e` |
| Non-veg red | `#fb2c36` |
| Dark text | `#191919` |
| Mid text | `#333333` |
| Gray text | `#666666` |
| Light gray text | `#999999`, `#b3b3b3` |
| Border | `#e6e6e6` |
| Border alt | `#d1d5dc`, `#e5e5e5` |
| Accent purple | `#3b1faa` |
| Accent amber | `#ffbc11` |
| Accent orange | `#ee7700` |
| Black | `#000000` |

### Typography
| Font | Usage |
|---|---|
| Poppins | Primary — headings, product names, prices, section titles |
| Manrope | Secondary — descriptions, supporting copy, badges |
| Inter | UI — small labels, chips, tags |

**Type scale:** 10, 11, 12, 13, 14, 16, 18, 20, 24, 26, 40px

### Border Radius
`2, 3, 4, 5, 6, 8, 10, 12, 14, 15, 16, 20, 40, 100px`  
Pill buttons → `100px`. Cards → `12px`. Chips → `100px`. Images → `12px`.

### Spacing
`4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 40px`

### Shadows
7 levels defined in Figma — use Tailwind `shadow-sm`, `shadow-md`, `shadow-lg` mapped to Figma equivalents.

---

## 2. Architecture

### Template System (Scalable)
```
src/components/templates/
  index.ts                  ← template registry (name → component map)
  QRMenuTemplate.tsx        ← NEW: replaces MenuKioskTemplate.tsx
```

**Registry pattern:**
```ts
// index.ts
export const TEMPLATE_MAP = {
  'qr-menu': QRMenuTemplate,
  // future: 'kiosk': KioskTemplate,
} as const;
export type TemplateName = keyof typeof TEMPLATE_MAP;
```

`ShopPageClient.tsx` uses `TEMPLATE_MAP[site.template ?? 'qr-menu']` to resolve the template dynamically.

### QRMenuTemplate Props
```ts
interface QRMenuTemplateProps {
  site: Site;              // shop name, slug, logo_url, banner_url
  products: MenuProduct[]; // from product_inventory
  banners: ShopBanner[];   // from shop_banners
  tier: 'view' | 'order';  // 'view' = QR plan (browse only)
}
```

---

## 3. Screen Breakdown

### Screen 1: Home (Menu List)
**Layout:** Single-column mobile scroll, max-width 430px centered.

**Sections top → bottom:**
1. **ShopHeader** — centered logo/shop name (Poppins SemiBold 20px), search icon right
2. **HeroBanner** — full-width image from `banners[0]`, aspect 16:7, `border-radius: 12px`, horizontal scroll if multiple banners
3. **CategoryChips** — horizontal scroll row, pills (`border-radius: 100px`), Poppins Medium 13px. "All" chip always first. Active chip: `#191919` bg + white text. Inactive: `#f4f4f4` bg + `#666666` text.
4. **ProductSections** — grouped by `product.category`. Each section:
   - Section header: Poppins SemiBold 16px, `#191919`, `border-bottom: 1px solid #e6e6e6`
   - Product rows (see below)
5. **FooterTagline** — "Skip the queue. Scan & order" centered, Poppins Medium 14px `#999999`, heart icon pink. "Crafted in தமிழ்நாடு" sub-line.

**Product Row:**
```
[veg-dot] [Name (Poppins SemiBold 14px #191919)]          [Image 80x80 rounded-12]
          [Description (Manrope Regular 12px #999999)]     [ADD button]
          [₹Price (Poppins Bold 16px #191919)]
```
- Veg dot: `#13801c` filled circle (veg), `#fb2c36` filled circle (non-veg)
- ADD button: outlined pink border `#ef59a1`, pink text, `border-radius: 8px`, 32x32px
- On `tier='view'`: ADD button is hidden — item is still tappable to open detail sheet

### Screen 2: Product Detail (Bottom Sheet)
Triggered by tapping any product row. Slides up from bottom.

**Layout top → bottom:**
1. Hero image — full width, aspect 4:3, `border-radius: 16px 16px 0 0`
2. Veg/nonveg indicator dot + label
3. Product name — Poppins SemiBold 20px `#191919`
4. Price row — `₹price` (Poppins Bold 24px `#191919`) + original price strikethrough (if discount) + discount badge (`#ffbc11` bg, Manrope Bold 11px)
5. Description — Manrope Regular 14px `#666666`, max 3 lines expandable
6. Divider `#e6e6e6`
7. **CTA section** (hidden on `tier='view'`):
   - Qty selector: `–` / count / `+`, rounded pill, border `#e6e6e6`
   - "Add to Cart" button: full-width, `#ef59a1` bg, white Poppins SemiBold 16px, `border-radius: 100px`, height 52px

### Screens 3–6 (tier='order' only — stubbed for now)
- Cart, Payment Gateway, Order Confirmed, Barcode Screen
- These screens exist in Figma but are **out of scope for this build** — they will be added when the ordering plan tier is implemented.
- The template file should have a `// TODO: order tier screens` stub comment.

---

## 4. Data Flow

```
ShopPage (server component)
  ↓ fetch site, products, banners from Supabase
  ↓ pass to ShopPageClient
    ↓ resolve template from TEMPLATE_MAP[site.template]
    ↓ render QRMenuTemplate with props
      ↓ internal state: selectedCategory, activeProduct (for detail sheet)
```

Products are already managed via `product-inventory` page. No writes happen in the template — it is purely a read/display component.

---

## 5. File Changes

| Action | File |
|---|---|
| DELETE | `src/components/templates/MenuKioskTemplate.tsx` |
| CREATE | `src/components/templates/QRMenuTemplate.tsx` |
| CREATE | `src/components/templates/index.ts` (registry) |
| UPDATE | `src/app/shop/[slug]/ShopPageClient.tsx` — use registry |
| UPDATE | `src/app/shop/[slug]/page.tsx` — pass `tier` from site data |

---

## 6. Out of Scope (this build)
- Cart, checkout, payment, order confirmation screens (tier='order')
- Multiple template variants beyond QRMenuTemplate
- Search functionality (icon present, not wired)
- Variants / add-on modal (Multiple Options screen from Figma)

---

## 7. Success Criteria
- `MenuKioskTemplate.tsx` deleted, zero references remain
- New template renders all products grouped by category
- Category chip filtering works client-side
- Product detail bottom sheet opens on tap
- `tier='view'` hides ADD button and CTA — browse only
- Template registry in `index.ts` — adding a new template = one line
- Matches Figma design system tokens exactly (pink, Poppins, border radii)
