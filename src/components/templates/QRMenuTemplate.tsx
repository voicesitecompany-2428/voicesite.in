'use client';

import React, { useState, useEffect } from 'react';

// ── DESIGN TOKENS (exact from Figma Home-1) ───────────────────────────────────
const T = {
  pink:       '#ef59a1',
  vegGreen:   '#13801c',
  nonvegRed:  '#fb2c36',
  dark:       '#191919',
  gray:       '#666666',
  lightGray:  '#999999',
  border:     '#e6e6e6',
  chipBorder: '#d1d5dc',
  surface:    '#f5f5f5',
  pageBg:     '#fafafa',
  white:      '#ffffff',
  amber:      '#ffbc11',
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

// ── VEG/NONVEG INDICATOR ─────────────────────────────────────────────────────
function VegDot({ foodType }: { foodType?: string | null }) {
  const isNonveg = foodType === 'nonveg';
  const isEgg    = foodType === 'egg';
  const color    = isNonveg ? T.nonvegRed : isEgg ? T.amber : T.vegGreen;
  return (
    <div style={{
      width: 16, height: 16, flexShrink: 0,
      border: `1.5px solid ${color}`, borderRadius: 3,
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
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: 'linear-gradient(135deg,#fce4ee 0%,#f9e8f2 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <svg width={size * 0.45} height={size * 0.45} viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="20" r="7" fill={T.pink} fillOpacity=".35"/>
        <path d="M8 38c0-8.837 7.163-14 16-14s16 5.163 16 14" stroke={T.pink} strokeOpacity=".35" strokeWidth="3" strokeLinecap="round"/>
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
  const [qty, setQty] = useState(1);
  useEffect(() => { setQty(1); }, [product]);
  if (!product) return null;

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
        width: '100%', maxWidth: 430,
        background: T.white, borderRadius: '20px 20px 0 0',
        overflow: 'hidden',
        animation: 'qrSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
        maxHeight: '92dvh', overflowY: 'auto',
      }}>
        {/* Handle */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: T.border }} />
        </div>

        {/* Hero */}
        {product.image_url
          ? <img src={product.image_url} alt={product.name}
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
          : <div style={{
              width: '100%', aspectRatio: '4/3',
              background: 'linear-gradient(135deg,#fce4ee,#f9e8f2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ImgPlaceholder size={72} />
            </div>
        }

        {/* Info */}
        <div style={{ padding: '18px 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <VegDot foodType={product.food_type} />
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 600,
              color: product.food_type === 'nonveg' ? T.nonvegRed : T.vegGreen,
            }}>
              {product.food_type === 'nonveg' ? 'Non-Veg' : product.food_type === 'egg' ? 'Egg' : 'Veg'}
            </span>
          </div>
          <h2 style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 20, color: T.dark, margin: '0 0 6px', lineHeight: 1.25,
          }}>{product.name}</h2>
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 22, color: T.dark, margin: '0 0 12px',
          }}>₹{product.selling_price}</p>
          {product.description && (
            <p style={{
              fontFamily: "'Manrope',sans-serif", fontSize: 14,
              color: T.gray, lineHeight: 1.65, margin: '0 0 20px',
            }}>{product.description}</p>
          )}

          {/* CTA — order tier only */}
          {tier === 'order' && (
            <>
              <div style={{ height: 1, background: T.border, margin: '0 0 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
                <button style={{
                  flex: 1, height: 52, background: T.pink,
                  border: 'none', borderRadius: 100, color: T.white,
                  fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
                  cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,89,161,0.35)',
                }}>
                  Add to Cart · ₹{product.selling_price * qty}
                </button>
              </div>
            </>
          )}
        </div>
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
  const visibleBanners = banners.filter(b => b.image_url);
  void shopTagline; // reserved for future use

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
        @keyframes qrFadeIn  { from{opacity:0}         to{opacity:1} }
        @keyframes qrSlideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
        .qr-wrap * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        .qr-wrap *::-webkit-scrollbar { display:none; }
        .qr-wrap * { scrollbar-width:none; }

        /* Outer shell — fills viewport, centres the phone column */
        .qr-shell {
          min-height: 100dvh;
          background: #f0f0f0;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        /* Phone column — always 430px wide, white card */
        .qr-phone {
          width: 100%;
          max-width: 430px;
          min-height: 100dvh;
          background: ${T.white};
          display: flex;
          flex-direction: column;
        }

        /* On desktop add a subtle box shadow to lift the card */
        @media (min-width: 500px) {
          .qr-shell  { padding: 0; background: #e8e8e8; }
          .qr-phone  { min-height: 100dvh; box-shadow: 0 0 60px rgba(0,0,0,0.12); }
        }

        /* Chip row — no scrollbar */
        .qr-chips { display:flex; gap:8px; overflow-x:auto; padding:12px 16px; }

        /* Product row hover */
        .qr-item { cursor:pointer; transition:background 0.12s; }
        .qr-item:hover { background:#fdf2f8; }
        .qr-item:active { background:#fce4ee; }

        /* Section header */
        .qr-section-hdr {
          padding: 12px 16px 10px;
          font-family: 'Poppins', sans-serif;
          font-weight: 600; font-size: 16px;
          color: ${T.dark};
          border-top: 8px solid ${T.pageBg};
        }
      `}</style>

      <div className="qr-wrap qr-shell">
        <div className="qr-phone">

          {/* ── HEADER ── */}
          <header style={{
            background: T.white,
            borderBottom: `1px solid ${T.border}`,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky', top: 0, zIndex: 50,
          }}>
            {/* left spacer */}
            <div style={{ width: 36 }} />

            {/* centre: logo + name */}
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

            {/* right: search */}
            <button aria-label="Search" style={{
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
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
                <img
                  src={visibleBanners[activeBanner].image_url!}
                  alt={visibleBanners[activeBanner].name}
                  style={{ width: '100%', aspectRatio: '16/7', objectFit: 'cover', display: 'block' }}
                />
                {visibleBanners.length > 1 && (
                  <div style={{
                    position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
                    display: 'flex', gap: 4,
                  }}>
                    {visibleBanners.map((_, i) => (
                      <button key={i} onClick={() => setActiveBanner(i)} style={{
                        width: i === activeBanner ? 18 : 6, height: 6, borderRadius: 100,
                        background: i === activeBanner ? T.white : 'rgba(255,255,255,0.55)',
                        border: 'none', padding: 0, cursor: 'pointer', transition: 'width 0.2s',
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
                    padding: '6px 16px', borderRadius: 100,
                    border: `1.5px solid ${on ? T.pink : T.chipBorder}`,
                    background: on ? T.pink : T.white,
                    color: on ? T.white : T.gray,
                    fontFamily: "'Poppins',sans-serif",
                    fontWeight: 500, fontSize: 13,
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
          <div style={{ flex: 1 }}>
            {sections.map(({ category, products }) => (
              <div key={category}>
                <div className="qr-section-hdr">{category}</div>

                {products.map((p, idx) => (
                  <div
                    key={p.id}
                    className="qr-item"
                    onClick={() => setActiveProduct(p)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '14px 16px',
                      borderBottom: idx < products.length - 1 ? `1px solid ${T.border}` : 'none',
                    }}
                  >
                    {/* Left: text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <VegDot foodType={p.food_type} />
                      <p style={{
                        fontFamily: "'Poppins',sans-serif",
                        fontWeight: 600, fontSize: 14, color: T.dark,
                        margin: '5px 0 3px', lineHeight: 1.35,
                      }}>{p.name}</p>
                      {p.description && (
                        <p style={{
                          fontFamily: "'Manrope',sans-serif",
                          fontSize: 12, color: T.lightGray,
                          margin: '0 0 8px', lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as React.CSSProperties}>{p.description}</p>
                      )}
                      <p style={{
                        fontFamily: "'Poppins',sans-serif",
                        fontWeight: 700, fontSize: 15, color: T.dark, margin: 0,
                      }}>₹{p.selling_price}</p>
                    </div>

                    {/* Right: image + optional ADD */}
                    <div style={{
                      position: 'relative', flexShrink: 0,
                      paddingBottom: tier === 'order' ? 14 : 0,
                    }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{
                            width: 90, height: 90, borderRadius: 12,
                            objectFit: 'cover', display: 'block',
                          }} />
                        : <ImgPlaceholder size={90} />
                      }
                      {tier === 'order' && (
                        <button
                          onClick={e => { e.stopPropagation(); setActiveProduct(p); }}
                          style={{
                            position: 'absolute', bottom: -2,
                            left: '50%', transform: 'translateX(-50%)',
                            padding: '3px 18px', borderRadius: 8,
                            border: `1.5px solid ${T.pink}`,
                            background: T.white, color: T.pink,
                            fontFamily: "'Poppins',sans-serif",
                            fontWeight: 700, fontSize: 12,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(239,89,161,0.18)',
                            letterSpacing: '0.3px',
                          }}
                        >ADD</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {sections.length === 0 && (
              <div style={{ padding: 56, textAlign: 'center' }}>
                <p style={{
                  fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.lightGray,
                }}>No items available right now.</p>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div style={{
            padding: '24px 16px 40px', textAlign: 'center',
            borderTop: `1px solid ${T.border}`,
          }}>
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontSize: 13,
              color: T.lightGray, margin: '0 0 4px',
            }}>
              <span style={{ color: T.pink }}>♥</span> Skip the queue. Scan &amp; order.
            </p>
            <p style={{
              fontFamily: "'Manrope',sans-serif", fontSize: 11,
              color: T.lightGray, margin: 0,
            }}>Crafted in தமிழ்நாடு</p>
          </div>

        </div>{/* /qr-phone */}
      </div>{/* /qr-shell */}

      {/* Detail sheet portal */}
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
