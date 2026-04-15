'use client';

import React, { useState, useRef, useEffect } from 'react';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  pink:      '#ef59a1',
  pinkLight: '#fdf2f8',
  vegGreen:  '#13801c',
  nonvegRed: '#fb2c36',
  dark:      '#191919',
  mid:       '#333333',
  gray:      '#666666',
  lightGray: '#999999',
  border:    '#e6e6e6',
  surface:   '#f5f5f5',
  white:     '#ffffff',
  amber:     '#ffbc11',
} as const;

// ── TYPES ─────────────────────────────────────────────────────────────────────
export type Tier = 'view' | 'order';

export interface MenuProduct {
  id: string;
  name: string;
  selling_price: number;
  description?: string | null;
  image_url?: string | null;
  is_live?: boolean;
  category?: string | null;
  food_type?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ShopBanner {
  id: string;
  name: string;
  image_url: string | null;
  description?: string | null;
}

interface QRMenuTemplateProps {
  shopName: string;
  shopTagline?: string;
  logoUrl?: string | null;
  menuProducts: MenuProduct[];
  banners: ShopBanner[];
  tier: Tier;
}

// ── SHOP HEADER ───────────────────────────────────────────────────────────────
function ShopHeader({ shopName, logoUrl }: { shopName: string; logoUrl?: string | null }) {
  return (
    <header style={{
      background: T.white,
      borderBottom: `1px solid ${T.border}`,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{ width: 32 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {logoUrl && (
          <img
            src={logoUrl}
            alt={shopName}
            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
          />
        )}
        <span style={{
          fontFamily: 'var(--font-poppins)',
          fontWeight: 600,
          fontSize: 18,
          color: T.dark,
          letterSpacing: '-0.3px',
        }}>
          {shopName}
        </span>
      </div>
      <button
        aria-label="Search"
        style={{
          width: 32, height: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', cursor: 'pointer',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.dark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </button>
    </header>
  );
}

// ── HERO BANNER ───────────────────────────────────────────────────────────────
function HeroBanner({ banners }: { banners: ShopBanner[] }) {
  const [active, setActive] = useState(0);
  const visible = banners.filter(b => b.image_url);

  if (visible.length === 0) return null;

  return (
    <div style={{ padding: '12px 16px 0' }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
        <img
          src={visible[active].image_url!}
          alt={visible[active].name}
          style={{ width: '100%', aspectRatio: '16/7', objectFit: 'cover', display: 'block' }}
        />
        {visible.length > 1 && (
          <div style={{
            position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: 4,
          }}>
            {visible.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                style={{
                  width: i === active ? 16 : 6,
                  height: 6,
                  borderRadius: 100,
                  background: i === active ? T.white : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'width 0.2s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CATEGORY CHIPS ────────────────────────────────────────────────────────────
function CategoryChips({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  const all = ['All', ...categories];
  return (
    <div style={{
      padding: '12px 16px',
      overflowX: 'auto',
      display: 'flex',
      gap: 8,
      scrollbarWidth: 'none',
      WebkitOverflowScrolling: 'touch',
    } as React.CSSProperties}>
      {all.map(cat => {
        const isActive = cat === active;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            style={{
              flexShrink: 0,
              padding: '6px 16px',
              borderRadius: 100,
              border: `1px solid ${isActive ? T.dark : T.border}`,
              background: isActive ? T.dark : T.white,
              color: isActive ? T.white : T.gray,
              fontFamily: 'var(--font-poppins)',
              fontWeight: 500,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}

// ── VEG DOT ───────────────────────────────────────────────────────────────────
function VegDot({ foodType }: { foodType?: string | null }) {
  const color = foodType === 'nonveg' ? T.nonvegRed : T.vegGreen;
  return (
    <div style={{
      width: 14, height: 14,
      border: `1.5px solid ${color}`,
      borderRadius: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        width: 7, height: 7,
        borderRadius: '50%',
        background: color,
      }} />
    </div>
  );
}

// ── PRODUCT ROW ───────────────────────────────────────────────────────────────
function ProductRow({
  product,
  tier,
  onTap,
}: {
  product: MenuProduct;
  tier: Tier;
  onTap: (p: MenuProduct) => void;
}) {
  return (
    <div
      onClick={() => onTap(product)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        cursor: 'pointer',
        background: T.white,
      }}
    >
      {/* Left: text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <VegDot foodType={product.food_type} />
        <p style={{
          fontFamily: 'var(--font-poppins)',
          fontWeight: 600,
          fontSize: 14,
          color: T.dark,
          margin: '4px 0 2px',
          lineHeight: 1.3,
        }}>
          {product.name}
        </p>
        {product.description && (
          <p style={{
            fontFamily: 'var(--font-manrope)',
            fontSize: 12,
            color: T.lightGray,
            margin: '0 0 6px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {product.description}
          </p>
        )}
        <p style={{
          fontFamily: 'var(--font-poppins)',
          fontWeight: 700,
          fontSize: 15,
          color: T.dark,
          margin: 0,
        }}>
          ₹{product.selling_price}
        </p>
      </div>

      {/* Right: image + ADD */}
      <div style={{ position: 'relative', flexShrink: 0, paddingBottom: tier === 'order' ? 10 : 0 }}>
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: 88, height: 88, borderRadius: 12, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: 88, height: 88, borderRadius: 12,
            background: T.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="4" fill={T.border} />
              <path d="M8.5 14.5l2.5-3 2 2.5 1.5-1.5 2 2.5H8.5z" fill={T.lightGray} />
              <circle cx="9.5" cy="9.5" r="1.5" fill={T.lightGray} />
            </svg>
          </div>
        )}
        {tier === 'order' && (
          <button
            onClick={e => { e.stopPropagation(); onTap(product); }}
            style={{
              position: 'absolute',
              bottom: -10, left: '50%', transform: 'translateX(-50%)',
              padding: '4px 14px',
              borderRadius: 8,
              border: `1.5px solid ${T.pink}`,
              background: T.white,
              color: T.pink,
              fontFamily: 'var(--font-poppins)',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(239,89,161,0.15)',
            }}
          >
            ADD
          </button>
        )}
      </div>
    </div>
  );
}

// ── PRODUCT DETAIL SHEET ──────────────────────────────────────────────────────
function ProductDetailSheet({
  product,
  tier,
  onClose,
}: {
  product: MenuProduct | null;
  tier: Tier;
  onClose: () => void;
}) {
  const [qty, setQty] = useState(1);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setQty(1); }, [product]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!product) return null;

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'flex-end',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        ref={sheetRef}
        style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 auto',
          background: T.white,
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          animation: 'slideUp 0.25s ease',
          maxHeight: '90dvh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 4, borderRadius: 100, background: T.border }} />
        </div>

        {/* Hero image */}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '4/3',
            background: T.surface,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <rect width="24" height="24" rx="4" fill={T.border} />
              <path d="M8.5 14.5l2.5-3 2 2.5 1.5-1.5 2 2.5H8.5z" fill={T.lightGray} />
              <circle cx="9.5" cy="9.5" r="1.5" fill={T.lightGray} />
            </svg>
          </div>
        )}

        {/* Info */}
        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <VegDot foodType={product.food_type} />
            <span style={{
              fontFamily: 'var(--font-manrope)',
              fontSize: 12,
              color: product.food_type === 'nonveg' ? T.nonvegRed : T.vegGreen,
              fontWeight: 600,
            }}>
              {product.food_type === 'nonveg' ? 'Non-Veg' : 'Veg'}
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-poppins)',
            fontWeight: 600,
            fontSize: 20,
            color: T.dark,
            margin: '0 0 8px',
            lineHeight: 1.25,
          }}>
            {product.name}
          </h2>

          <p style={{
            fontFamily: 'var(--font-poppins)',
            fontWeight: 700,
            fontSize: 22,
            color: T.dark,
            margin: '0 0 12px',
          }}>
            ₹{product.selling_price}
          </p>

          {product.description && (
            <p style={{
              fontFamily: 'var(--font-manrope)',
              fontSize: 14,
              color: T.gray,
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}>
              {product.description}
            </p>
          )}

          {/* CTA — order tier only */}
          {tier === 'order' && (
            <>
              <div style={{ height: 1, background: T.border, margin: '16px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  border: `1px solid ${T.border}`,
                  borderRadius: 100,
                  padding: '8px 14px',
                }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.dark, lineHeight: 1, padding: 0 }}
                  >–</button>
                  <span style={{
                    fontFamily: 'var(--font-poppins)', fontWeight: 600,
                    fontSize: 16, color: T.dark, minWidth: 20, textAlign: 'center',
                  }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.pink, lineHeight: 1, padding: 0 }}
                  >+</button>
                </div>
                <button style={{
                  flex: 1, marginLeft: 12, height: 50,
                  background: T.pink, border: 'none', borderRadius: 100,
                  color: T.white,
                  fontFamily: 'var(--font-poppins)', fontWeight: 600, fontSize: 16,
                  cursor: 'pointer',
                }}>
                  Add to Cart — ₹{product.selling_price * qty}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{ padding: '24px 16px 48px', textAlign: 'center' }}>
      <p style={{
        fontFamily: 'var(--font-poppins)', fontSize: 13,
        color: T.lightGray, margin: '0 0 4px',
      }}>
        <span style={{ color: T.pink }}>♥</span> Skip the queue. Scan &amp; order.
      </p>
      <p style={{
        fontFamily: 'var(--font-manrope)', fontSize: 11,
        color: T.lightGray, margin: 0,
      }}>
        Crafted in தமிழ்நாடு
      </p>
    </div>
  );
}

// ── MAIN TEMPLATE ─────────────────────────────────────────────────────────────
export default function QRMenuTemplate({
  shopName,
  logoUrl,
  menuProducts,
  banners,
  tier,
}: QRMenuTemplateProps) {
  // Derive unique categories preserving insertion order
  const categories = Array.from(
    new Set(menuProducts.map(p => p.category).filter(Boolean) as string[])
  );

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);

  // Group products into sections
  const sections = (() => {
    if (activeCategory !== 'All') {
      const products = menuProducts.filter(p => p.category === activeCategory);
      return [{ category: activeCategory, products }];
    }
    const map = new Map<string, MenuProduct[]>();
    for (const p of menuProducts) {
      const cat = p.category ?? 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).map(([category, products]) => ({ category, products }));
  })();

  return (
    <>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 }           to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        * { -ms-overflow-style: none; scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        background: '#fafafa',
        maxWidth: 430,
        margin: '0 auto',
        position: 'relative',
      }}>
        <ShopHeader shopName={shopName} logoUrl={logoUrl} />
        <HeroBanner banners={banners} />

        {categories.length > 0 && (
          <CategoryChips
            categories={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />
        )}

        {/* Product sections */}
        <div style={{ background: T.white, marginTop: categories.length > 0 ? 0 : 12 }}>
          {sections.map(({ category, products }) => (
            <div key={category}>
              <div style={{
                padding: '14px 16px 10px',
                borderBottom: `1px solid ${T.border}`,
                background: '#fafafa',
              }}>
                <h3 style={{
                  fontFamily: 'var(--font-poppins)', fontWeight: 600,
                  fontSize: 16, color: T.dark, margin: 0,
                }}>
                  {category}
                </h3>
                <p style={{
                  fontFamily: 'var(--font-manrope)', fontSize: 12,
                  color: T.lightGray, margin: '2px 0 0',
                }}>
                  {products.length} item{products.length !== 1 ? 's' : ''}
                </p>
              </div>
              {products.map(p => (
                <ProductRow
                  key={p.id}
                  product={p}
                  tier={tier}
                  onTap={setActiveProduct}
                />
              ))}
            </div>
          ))}

          {sections.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{
                fontFamily: 'var(--font-poppins)', fontSize: 14, color: T.lightGray,
              }}>
                No items available right now.
              </p>
            </div>
          )}
        </div>

        <Footer />

        {activeProduct && (
          <ProductDetailSheet
            product={activeProduct}
            tier={tier}
            onClose={() => setActiveProduct(null)}
          />
        )}
      </div>
    </>
  );
}
