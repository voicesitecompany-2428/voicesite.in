'use client';

import React, { useState, useEffect } from 'react';

// ── DESIGN TOKENS (exact from Figma CSS export) ───────────────────────────────
const T = {
  pink:       '#EF59A1',
  vegGreen:   '#13801C',
  nonvegRed:  '#FB2C36',
  dark:       '#191919',
  nameColor:  '#333333',
  descColor:  '#808080',
  chipText:   '#0A0A0A',
  lightGray:  '#C5C5C5',
  border:     '#E6E6E6',
  chipBorder: '#D1D5DC',
  cardBg:     '#FAFAFA',
  white:      '#FFFFFF',
  amber:      '#FFBC11',
  footerSub:  '#484848',
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

// ── VEG/EGG/NONVEG DOT (14×14, Figma exact) ─────────────────────────────────
function VegDot({ foodType }: { foodType?: string | null }) {
  const isNonveg = foodType === 'nonveg' || foodType === 'non_veg';
  const isEgg    = foodType === 'egg';
  const color    = isNonveg ? T.nonvegRed : isEgg ? T.amber : T.vegGreen;
  return (
    <div style={{
      width: 14, height: 14, flexShrink: 0,
      border: `0.5px solid ${color}`, borderRadius: 4,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
    </div>
  );
}

// ── IMAGE PLACEHOLDER ─────────────────────────────────────────────────────────
function ImgPlaceholder({ size }: { size: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 8,
      background: '#F0F0F0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 32 32" fill="none">
        <rect x="3" y="7" width="26" height="20" rx="3" stroke="#D1D5DC" strokeWidth="1.5"/>
        <circle cx="11" cy="14" r="2.5" stroke="#D1D5DC" strokeWidth="1.5"/>
        <path d="M3 23l7-5 5 4 4-3 9 7" stroke="#D1D5DC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── PRODUCT DETAIL BOTTOM SHEET ───────────────────────────────────────────────
function ProductDetailSheet({
  product, tier, onClose,
}: {
  product: MenuProduct | null; tier: Tier; onClose: () => void;
}) {
  const meta = product?.metadata ?? {};

  // Detect product type from metadata
  const variants   = Array.isArray(meta.variants)   && (meta.variants   as any[]).length > 0 ? (meta.variants   as { size: string; price: number | string }[]) : null;
  const toppings   = Array.isArray(meta.toppings)   && (meta.toppings   as any[]).length > 0 ? (meta.toppings   as { name: string; price: number | string }[]) : null;
  const comboItems = Array.isArray(meta.comboItems) && (meta.comboItems as any[]).length > 0 ? (meta.comboItems as { name: string; qty: number | string }[]) : null;

  const productType: 'variant' | 'combo' | 'single' =
    variants   ? 'variant' :
    comboItems ? 'combo'   : 'single';

  // State
  const [qty, setQty] = useState(1);

  // Reset when product changes
  useEffect(() => { setQty(1); }, [product?.id]);

  if (!product) return null;

  const totalPrice = product.selling_price * qty;

  // ── Shared shell ─────────────────────────────────────────────────
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'qrFadeIn 0.15s ease',
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560,
        background: T.white, borderRadius: '20px 20px 0 0',
        animation: 'qrSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Drag handle */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: T.border }} />
        </div>

        {/* Hero image */}
        {product.image_url
          ? <img src={product.image_url} alt={product.name}
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          : <div style={{
              width: '100%', aspectRatio: '4/3',
              background: 'linear-gradient(135deg,#fce4ee,#f9e8f2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ImgPlaceholder size={80} />
            </div>
        }

        {/* Info */}
        <div style={{ padding: '14px 16px 32px' }}>
          {/* Veg dot + name row — Figma: flex row, gap 8, height 24 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <VegDot foodType={product.food_type} />
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 500,
              fontSize: 16, lineHeight: '24px', color: '#333333',
            }}>{product.name}</span>
          </div>

          {/* ── SINGLE: price row ── */}
          {productType === 'single' && (() => {
            const discountOn = !!(meta.discount_enabled) && !!(meta.original_price);
            return (
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                {/* Price cluster */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <span style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                    fontSize: 24, lineHeight: '36px', letterSpacing: '0.0161em', color: '#000000',
                  }}>₹{product.selling_price}</span>
                  {discountOn && (
                    <span style={{
                      fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                      fontSize: 10, lineHeight: '15px', letterSpacing: '0.0161em',
                      textDecoration: 'line-through', color: '#808080',
                      alignSelf: 'flex-end', paddingBottom: 4,
                    }}>MRP {meta.original_price as number}</span>
                  )}
                </div>
                {/* Discount badge */}
                {discountOn && (meta.discount_pct as number) > 0 && (
                  <div style={{
                    display: 'flex', flexDirection: 'row', justifyContent: 'center',
                    alignItems: 'center', padding: '2px 6px',
                    background: '#13801C', borderRadius: 3,
                  }}>
                    <span style={{
                      fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                      fontSize: 11, lineHeight: '16px', letterSpacing: '0.0161em', color: '#FFFFFF',
                    }}>Flat {meta.discount_pct as number}% Off</span>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Description — Figma: Manrope 500 12px #666666 line-height 18px */}
          {product.description && (
            <p style={{
              fontFamily: "'Manrope',sans-serif", fontWeight: 500, fontSize: 12,
              lineHeight: '18px', letterSpacing: '0.0161em',
              color: '#666666', margin: '0 0 14px',
            }}>{product.description}</p>
          )}

          {/* ── VARIANT: read-only size + price list ── */}
          {productType === 'variant' && variants && (
            <>
              <div style={{ height: 1, background: T.border, margin: '0 0 14px' }} />

              {/* Size → price rows, view-only */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {variants.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < variants.length - 1 ? `1px solid ${T.border}` : 'none',
                    }}
                  >
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                      fontSize: 14, lineHeight: '19px', color: '#333333',
                    }}>{v.size}</span>
                    <span style={{
                      fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                      fontSize: 15, lineHeight: '19px', color: '#000000',
                    }}>₹{v.price}</span>
                  </div>
                ))}
              </div>

              {/* Add-ons — read-only name + price */}
              {toppings && (
                <>
                  <div style={{ height: 1, background: T.border, margin: '14px 0' }} />
                  <p style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                    fontSize: 13, color: T.dark, margin: '0 0 8px',
                  }}>Add-ons <span style={{ fontWeight: 400, color: T.descColor }}>(optional)</span></p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {toppings.map((t, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 0',
                          borderBottom: i < toppings.length - 1 ? `1px solid ${T.border}` : 'none',
                        }}
                      >
                        <span style={{
                          fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                          fontSize: 14, lineHeight: '19px', color: '#333333',
                        }}>{t.name}</span>
                        <span style={{
                          fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                          fontSize: 14, color: T.pink,
                        }}>+₹{t.price}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {/* ── COMBO: price + "What's included" list ── */}
          {productType === 'combo' && comboItems && (
            <>
              <div style={{ height: 1, background: T.border, margin: '0 0 14px' }} />

              {/* Combo price */}
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 14 }}>
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                  fontSize: 24, lineHeight: '36px', letterSpacing: '0.0161em', color: '#000000',
                }}>₹{product.selling_price}</span>
              </div>

              <p style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                fontSize: 13, color: T.dark, margin: '0 0 8px',
              }}>What&apos;s included</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 14 }}>
                {comboItems.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: i < comboItems.length - 1 ? `1px solid ${T.border}` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.pink, flexShrink: 0 }} />
                      <span style={{
                        fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                        fontSize: 14, lineHeight: '19px', color: '#333333',
                      }}>{item.name}</span>
                    </div>
                    <span style={{
                      fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                      fontSize: 12, color: T.descColor,
                      background: '#F4F4F5', borderRadius: 6, padding: '2px 8px',
                    }}>×{item.qty}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── ORDER CTA (all types) ── */}
          {tier === 'order' && (
            <>
              <div style={{ height: 1, background: T.border, margin: '0 0 20px' }} />

<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Qty stepper */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 18,
                  border: `1.5px solid ${T.border}`, borderRadius: 100, padding: '8px 16px',
                }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 22, color: T.dark, lineHeight: 1, padding: 0,
                  }}>–</button>
                  <span style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                    fontSize: 16, color: T.dark, minWidth: 20, textAlign: 'center',
                  }}>{qty}</span>
                  <button onClick={() => setQty(q => q + 1)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 22, color: T.pink, lineHeight: 1, padding: 0,
                  }}>+</button>
                </div>

                {/* Add to Cart */}
                <button style={{
                  flex: 1, height: 52, background: T.pink,
                  border: 'none', borderRadius: 100, color: T.white,
                  fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,89,161,0.35)',
                }}>
                  Add to Cart · ₹{totalPrice}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SEARCH OVERLAY ────────────────────────────────────────────────────────────
function SearchOverlay({
  products,
  categories,
  onClose,
  onSelectProduct,
  tier,
}: {
  products: MenuProduct[];
  categories: string[];
  onClose: () => void;
  onSelectProduct: (p: MenuProduct) => void;
  tier: Tier;
}) {
  const [query, setQuery] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus the input when overlay opens
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const q = query.trim().toLowerCase();
  const results = q
    ? products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q)
      )
    : [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: T.white,
      display: 'flex', flexDirection: 'column',
      animation: 'qrFadeIn 0.15s ease',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        {/* Back */}
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 4, display: 'flex', alignItems: 'center', color: T.dark,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={T.dark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 600,
          fontSize: 18, color: T.dark,
        }}>Search</span>
      </div>

      {/* Search input */}
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#F4F4F5', borderRadius: 100,
          padding: '10px 16px',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Find your Craving's Partner"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: "'Poppins',sans-serif", fontWeight: 400,
              fontSize: 14, color: T.dark,
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', padding: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="#9CA3AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        {!q ? (
          /* ── Often Searched ── */
          <>
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 600,
              fontSize: 14, color: T.dark, margin: '0 0 14px',
            }}>Often Searched</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {categories.map(cat => (
                <button key={cat} onClick={() => setQuery(cat)} style={{
                  padding: '7px 14px', borderRadius: 100,
                  border: `1px solid ${T.chipBorder}`,
                  background: T.white, color: T.dark,
                  fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                  fontSize: 13, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>
                  {cat}
                </button>
              ))}
            </div>
          </>
        ) : results.length === 0 ? (
          /* ── No results ── */
          <div style={{ paddingTop: 48, textAlign: 'center' }}>
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.lightGray,
            }}>No items found for &quot;{query}&quot;</p>
          </div>
        ) : (
          /* ── Results ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {results.map(p => (
              <div
                key={p.id}
                className="qr-card"
                onClick={() => { onSelectProduct(p); onClose(); }}
                style={{
                  position: 'relative',
                  width: '100%', height: 102,
                  background: T.cardBg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  position: 'absolute', right: 8, top: 8,
                  width: 75, height: 75, borderRadius: 8, overflow: 'hidden', background: T.white,
                }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <ImgPlaceholder size={75} />
                  }
                </div>
                {/* Veg dot */}
                <div style={{ position: 'absolute', left: 8, top: 11 }}>
                  <VegDot foodType={p.food_type} />
                </div>
                {/* Name */}
                <p style={{
                  position: 'absolute', left: 28, top: 8, right: 91, margin: 0,
                  fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                  fontSize: 14, lineHeight: '21px', color: T.nameColor,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>{p.name}</p>
                {/* Description */}
                {p.description && (
                  <p style={{
                    position: 'absolute', left: 8, top: 33, right: 91, margin: 0,
                    fontFamily: "'Poppins',sans-serif", fontWeight: 300,
                    fontSize: 10, lineHeight: '16px', color: T.descColor,
                    display: '-webkit-box',
                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  } as React.CSSProperties}>{p.description}</p>
                )}
                {/* Price */}
                <p style={{
                  position: 'absolute', left: 8, bottom: 8, margin: 0,
                  fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                  fontSize: 16, lineHeight: '24px', color: T.pink,
                }}>₹{p.selling_price}</p>
                {/* ADD button */}
                {tier === 'order' && (
                  <button
                    onClick={e => { e.stopPropagation(); onSelectProduct(p); onClose(); }}
                    style={{
                      position: 'absolute', right: 8, bottom: 8,
                      width: 57, height: 26, borderRadius: 14,
                      border: `1px solid ${T.pink}`, background: T.white, color: T.pink,
                      fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                      fontSize: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >ADD</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN TEMPLATE ─────────────────────────────────────────────────────────────
export default function QRMenuTemplate({
  shopName, shopTagline, logoUrl, menuProducts, banners, tier,
}: QRMenuTemplateProps) {
  const categories = Array.from(
    new Set(menuProducts.map(p => p.category).filter(Boolean) as string[])
  );
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeProduct, setActiveProduct]   = useState<MenuProduct | null>(null);
  const [activeBanner, setActiveBanner]     = useState(0);
  const [searchOpen, setSearchOpen]         = useState(false);
  const visibleBanners = banners.filter(b => b.image_url);
  void shopTagline;

  // Auto-slide banners every 3 seconds
  useEffect(() => {
    if (visibleBanners.length <= 1) return;
    const id = setInterval(() => {
      setActiveBanner(i => (i + 1) % visibleBanners.length);
    }, 3000);
    return () => clearInterval(id);
  }, [visibleBanners.length]);

  const sections = (() => {
    if (activeCategory !== 'All') {
      return [{ category: activeCategory, products: menuProducts.filter(p => p.category === activeCategory) }];
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
        @keyframes qrFadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes qrSlideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }

        /* Reset and shared */
        .qr-wrap * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        .qr-wrap *::-webkit-scrollbar { display:none; }
        .qr-wrap * { scrollbar-width:none; }

        /* Shell — full viewport */
        .qr-shell {
          width: 100%;
          min-height: 100dvh;
          background: ${T.white};
          display: flex;
          flex-direction: column;
        }

        /* ── Chips scroll row ── */
        .qr-chips {
          display: flex;
          flex-direction: row;
          align-items: center;
          padding: 12px 16px;
          gap: 12px;
          overflow-x: auto;
          background: ${T.white};
          min-height: 60px;
        }

        /* ── Card hover ── */
        .qr-card {
          cursor: pointer;
          transition: box-shadow 0.12s;
        }
        .qr-card:hover  { box-shadow: 0 2px 12px rgba(0,0,0,0.07); }
        .qr-card:active { box-shadow: none; opacity: 0.9; }

        /* ── Section header ── */
        .qr-section-hdr {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: center;
          padding: 0px 10px 0px 16px;
          width: 100%;
          height: 24px;
        }
      `}</style>

      <div className="qr-wrap qr-shell">

        {/* ── STICKY HEADER ── */}
        <header style={{
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div style={{ width: 36 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {logoUrl && (
              <img src={logoUrl} alt={shopName}
                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
            )}
            <span style={{
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 700, fontSize: 16,
              color: T.pink,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}>{shopName}</span>
          </div>

          <button aria-label="Search" onClick={() => setSearchOpen(true)} style={{
            width: 36, height: 36, border: 'none', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={T.dark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </header>

        {/* ── BANNER ── */}
        {visibleBanners.length > 0 && (
          <div style={{ padding: '10px 12px 0' }}>
            <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
              {/* Sliding strip — all banners side-by-side, translate on active index */}
              <div style={{
                display: 'flex',
                transform: `translateX(-${activeBanner * 100}%)`,
                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                willChange: 'transform',
              }}>
                {visibleBanners.map((b) => (
                  <img
                    key={b.id}
                    src={b.image_url!}
                    alt={b.name}
                    style={{
                      width: '100%', flexShrink: 0,
                      aspectRatio: '351/134', objectFit: 'cover', display: 'block',
                    }}
                  />
                ))}
              </div>
              {/* Dot indicators */}
              {visibleBanners.length > 1 && (
                <div style={{
                  position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                  display: 'flex', gap: 4,
                }}>
                  {visibleBanners.map((_, i) => (
                    <button key={i} onClick={() => setActiveBanner(i)} style={{
                      width: i === activeBanner ? 18 : 6, height: 6, borderRadius: 100,
                      background: i === activeBanner ? T.white : 'rgba(255,255,255,0.55)',
                      border: 'none', padding: 0, cursor: 'pointer', transition: 'width 0.25s',
                    }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── CATEGORY CHIPS ── */}
        {categories.length > 0 && (
          <div className="qr-chips">
            {['All', ...categories].map(cat => {
              const on = cat === activeCategory;
              return (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  flexShrink: 0,
                  display: 'flex', flexDirection: 'row', alignItems: 'center',
                  padding: '8px 12px', gap: 8,
                  height: 36, borderRadius: 40,
                  border: `0.65px solid ${on ? T.pink : T.chipBorder}`,
                  background: on ? T.pink : T.white,
                  color: on ? T.white : T.chipText,
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: 400, fontSize: 14,
                  lineHeight: '20px', letterSpacing: '-0.15px',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}>
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* ── PRODUCT SECTIONS ── */}
        {/* Outer: flex column, gap 20px between sections */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 0 }}>
          {sections.map(({ category, products }) => (
            /* Each section: flex column, gap 10px, align-items center */
            <div key={category} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: 0, gap: 10, width: '100%',
            }}>
              {/* Section header row — full width, Poppins Medium 16px #191919 */}
              <div className="qr-section-hdr">
                <span style={{
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: 500, fontSize: 16, lineHeight: '24px',
                  color: T.dark,
                }}>{category}</span>
              </div>

              {/* Cards container — 343px centred (= 100% - 32px padding) */}
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'flex-start', gap: 12,
                width: '100%', padding: '0 16px',
              }}>
                {products.map(p => (
                  /* Card — fixed 102px height, absolute-positioned internals (Figma exact) */
                  <div
                    key={p.id}
                    className="qr-card"
                    onClick={() => setActiveProduct(p)}
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: 102,
                      background: T.cardBg,
                      border: `1px solid ${T.border}`,
                      borderRadius: 6,
                    }}
                  >
                    {/* Thumbnail — right: 8, top: 8 */}
                    <div style={{
                      position: 'absolute', right: 8, top: 8,
                      width: 75, height: 75,
                      borderRadius: 8, overflow: 'hidden',
                      background: T.white,
                    }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : <ImgPlaceholder size={75} />
                      }
                    </div>

                    {/* Food type dot — left: 8, top: 11 */}
                    <div style={{ position: 'absolute', left: 8, top: 11 }}>
                      <VegDot foodType={p.food_type} />
                    </div>

                    {/* Product name — left: 28, top: 8, right: 91 */}
                    <p style={{
                      position: 'absolute', left: 28, top: 8, right: 91,
                      margin: 0,
                      fontFamily: "'Poppins',sans-serif",
                      fontWeight: 600, fontSize: 14, lineHeight: '21px',
                      color: T.nameColor,
                      overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    }}>{p.name}</p>

                    {/* Description — left: 8, top: 33, right: 91 */}
                    {p.description && (
                      <p style={{
                        position: 'absolute', left: 8, top: 33, right: 91,
                        margin: 0,
                        fontFamily: "'Poppins',sans-serif",
                        fontWeight: 300, fontSize: 10, lineHeight: '16px',
                        letterSpacing: '0.0161em',
                        color: T.descColor,
                        display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      } as React.CSSProperties}>{p.description}</p>
                    )}

                    {/* Price row — left: 11, bottom: 8 */}
                    {p.metadata?.discount_enabled && p.metadata?.original_price ? (
                      /* ── OFFER CARD price row ── */
                      <div style={{
                        position: 'absolute', left: 11, bottom: 8,
                        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 6,
                      }}>
                        {/* Selling price + MRP */}
                        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <span style={{
                            fontFamily: "'Manrope',sans-serif", fontWeight: 800,
                            fontSize: 18, lineHeight: '25px', letterSpacing: '0.0161em',
                            color: T.pink,
                          }}>₹{p.selling_price}</span>
                          <span style={{
                            fontFamily: "'Manrope',sans-serif", fontWeight: 400,
                            fontSize: 10, lineHeight: '14px', letterSpacing: '0.0161em',
                            textDecoration: 'line-through', color: T.descColor,
                            alignSelf: 'flex-end', paddingBottom: 2,
                          }}>MRP {p.metadata.original_price as number}</span>
                        </div>
                        {/* Discount badge */}
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          padding: '2px 6px',
                          background: '#13801C', borderRadius: 3,
                          fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                          fontSize: 11, lineHeight: '15px', letterSpacing: '0.0161em',
                          color: '#FFFFFF',
                          whiteSpace: 'nowrap',
                        }}>
                          Flat {p.metadata.discount_pct as number}% Off
                        </span>
                      </div>
                    ) : (
                      /* ── NORMAL price ── */
                      <p style={{
                        position: 'absolute', left: 8, bottom: 8,
                        margin: 0,
                        fontFamily: "'Poppins',sans-serif",
                        fontWeight: 600, fontSize: 16, lineHeight: '24px',
                        color: T.pink,
                      }}>₹{p.selling_price}</p>
                    )}

                    {/* ADD button — right: 8, bottom: 8 — 57×26px, border-radius 14 */}
                    {tier === 'order' && (
                      <button
                        onClick={e => { e.stopPropagation(); setActiveProduct(p); }}
                        style={{
                          position: 'absolute', right: 8, bottom: 8,
                          width: 57, height: 26, borderRadius: 14,
                          border: `1px solid ${T.pink}`,
                          background: T.white, color: T.pink,
                          fontFamily: "'Manrope',sans-serif",
                          fontWeight: 700, fontSize: 12, lineHeight: '12px',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0px 2px 1px rgba(0,0,0,0.08)',
                        }}
                      >ADD</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {sections.length === 0 && (
            <div style={{ padding: '56px 16px', textAlign: 'center' }}>
              <p style={{
                fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.lightGray,
              }}>No items available right now.</p>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '32px 16px 48px',
          background: T.white,
          borderTop: `1px solid ${T.border}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Skip the queue — Poppins SemiBold 26px #C5C5C5 */}
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 26,
            lineHeight: '37px', color: T.lightGray,
            margin: '0 0 8px', maxWidth: 256,
          }}>Skip the queue. Scan &amp; order</p>

          {/* Heart + Crafted line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.2 3.5 3.5 0 0 1 14.5 5.5C14.5 9.5 8 13.5 8 13.5Z"
                fill="#F9595F"/>
            </svg>
            <span style={{
              fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 12,
              lineHeight: '16px', color: T.footerSub,
            }}>Crafted in தமிழ்நாடு</span>
          </div>
        </div>

      </div>{/* /qr-shell */}

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <SearchOverlay
          products={menuProducts}
          categories={categories}
          tier={tier}
          onClose={() => setSearchOpen(false)}
          onSelectProduct={p => { setActiveProduct(p); setSearchOpen(false); }}
        />
      )}

      {/* ── DETAIL SHEET ── */}
      {activeProduct && (
        <ProductDetailSheet
          product={activeProduct}
          tier={tier}
          onClose={() => setActiveProduct(null)}
        />
      )}
    </>
  );
}
