'use client';

import React, { useState, useRef, useEffect } from 'react';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const T = {
  pink:      '#ef59a1',
  pinkLight: '#fdf2f8',
  pinkBorder:'rgba(239,89,161,0.25)',
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
  pageBg:    '#fafafa',
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

// ── VEG DOT ───────────────────────────────────────────────────────────────────
function VegDot({ foodType }: { foodType?: string | null }) {
  const color = foodType === 'nonveg' ? T.nonvegRed : T.vegGreen;
  return (
    <div style={{
      width: 14, height: 14,
      border: `1.5px solid ${color}`,
      borderRadius: 2,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
    </div>
  );
}

// ── IMAGE PLACEHOLDER ─────────────────────────────────────────────────────────
function ImgPlaceholder({ size }: { size: number }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: 12,
      background: `linear-gradient(135deg, #f9e8f2 0%, #fce4ee 100%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size * 0.4} height={size * 0.4} viewBox="0 0 40 40" fill="none">
        <path d="M20 6C12.268 6 6 12.268 6 20s6.268 14 14 14 14-6.268 14-14S27.732 6 20 6zm0 5a4 4 0 110 8 4 4 0 010-8zm0 20c-3.866 0-7.307-1.87-9.455-4.752C12.6 23.86 16.083 22 20 22c3.917 0 7.4 1.86 9.455 4.248C27.307 29.13 23.866 31 20 31z"
          fill={T.pink} fillOpacity="0.4"/>
      </svg>
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

  if (!product) return null;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'qrFadeIn 0.15s ease',
      }}
    >
      <div
        ref={sheetRef}
        style={{
          width: '100%',
          maxWidth: 600,
          background: T.white,
          borderRadius: '20px 20px 0 0',
          overflow: 'hidden',
          animation: 'qrSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: '92dvh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ padding: '12px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: T.border }} />
        </div>

        {/* Hero image */}
        {product.image_url ? (
          <img src={product.image_url} alt={product.name}
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{
            width: '100%', aspectRatio: '16/9', background: `linear-gradient(135deg,#f9e8f2,#fce4ee)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ImgPlaceholder size={80} />
          </div>
        )}

        {/* Info */}
        <div style={{ padding: '20px 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <VegDot foodType={product.food_type} />
            <span style={{
              fontFamily: 'var(--font-manrope), Manrope, sans-serif',
              fontSize: 12, fontWeight: 600,
              color: product.food_type === 'nonveg' ? T.nonvegRed : T.vegGreen,
            }}>
              {product.food_type === 'nonveg' ? 'Non-Veg' : 'Veg'}
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontWeight: 700, fontSize: 22, color: T.dark,
            margin: '0 0 6px', lineHeight: 1.25,
          }}>
            {product.name}
          </h2>

          <p style={{
            fontFamily: 'var(--font-poppins), Poppins, sans-serif',
            fontWeight: 700, fontSize: 24, color: T.pink,
            margin: '0 0 14px',
          }}>
            ₹{product.selling_price}
          </p>

          {product.description && (
            <p style={{
              fontFamily: 'var(--font-manrope), Manrope, sans-serif',
              fontSize: 14, color: T.gray, lineHeight: 1.65, margin: '0 0 20px',
            }}>
              {product.description}
            </p>
          )}

          {tier === 'order' && (
            <>
              <div style={{ height: 1, background: T.border, margin: '0 0 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  border: `1.5px solid ${T.border}`, borderRadius: 100, padding: '8px 16px',
                }}>
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.dark, lineHeight: 1, padding: 0 }}>–</button>
                  <span style={{ fontFamily: 'var(--font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 16, color: T.dark, minWidth: 20, textAlign: 'center' }}>
                    {qty}
                  </span>
                  <button onClick={() => setQty(q => q + 1)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: T.pink, lineHeight: 1, padding: 0 }}>+</button>
                </div>
                <button style={{
                  flex: 1, height: 52, background: T.pink, border: 'none', borderRadius: 100,
                  color: T.white, fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                  fontWeight: 600, fontSize: 16, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(239,89,161,0.35)',
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
  shopName,
  shopTagline,
  logoUrl,
  menuProducts,
  banners,
  tier,
}: QRMenuTemplateProps) {
  const categories = Array.from(
    new Set(menuProducts.map(p => p.category).filter(Boolean) as string[])
  );

  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);

  const visibleBanners = banners.filter(b => b.image_url);
  const [activeBanner, setActiveBanner] = useState(0);

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
        @keyframes qrFadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes qrSlideUp { from { transform:translateY(60px); opacity:0 } to { transform:translateY(0); opacity:1 } }
        .qr-root *  { -ms-overflow-style:none; scrollbar-width:none; box-sizing:border-box; }
        .qr-root *::-webkit-scrollbar { display:none; }

        /* ── Responsive layout ── */
        .qr-layout      { display:flex; flex-direction:column; min-height:100dvh; background:${T.pageBg}; }
        .qr-header      { background:${T.white}; border-bottom:1px solid ${T.border}; padding:14px 24px;
                          display:flex; align-items:center; justify-content:space-between;
                          position:sticky; top:0; z-index:50; }
        .qr-body        { display:flex; flex:1; }
        .qr-sidebar     { display:none; }
        .qr-main        { flex:1; min-width:0; }
        .qr-banner      { padding:16px 16px 0; }
        .qr-chips       { padding:12px 16px; display:flex; gap:8px; overflow-x:auto; }
        .qr-product-grid{ display:block; }
        .qr-section-hdr { padding:14px 16px 10px; background:${T.pageBg}; border-bottom:1px solid ${T.border}; }

        /* Desktop ≥ 768px */
        @media (min-width:768px) {
          .qr-header    { padding:16px 40px; }
          .qr-sidebar   {
            display:flex; flex-direction:column; gap:4px;
            width:220px; flex-shrink:0;
            padding:20px 0;
            border-right:1px solid ${T.border};
            background:${T.white};
            position:sticky; top:65px; height:calc(100dvh - 65px); overflow-y:auto;
          }
          .qr-sidebar-btn {
            text-align:left; padding:10px 24px;
            fontFamily:'var(--font-poppins),Poppins,sans-serif';
            font-size:13px; font-weight:500; cursor:pointer;
            border:none; background:transparent; color:${T.gray};
            border-left:3px solid transparent;
            transition:all 0.15s;
          }
          .qr-sidebar-btn:hover  { background:${T.pinkLight}; color:${T.pink}; }
          .qr-sidebar-btn.active { background:${T.pinkLight}; color:${T.pink}; border-left-color:${T.pink}; font-weight:600; }
          .qr-main      { }
          .qr-banner    { padding:20px 32px 0; }
          .qr-chips     { display:none; }
          .qr-section-hdr { padding:16px 32px 12px; }
          .qr-product-grid{ display:grid; grid-template-columns:1fr 1fr; }
        }

        /* Large desktop ≥ 1200px */
        @media (min-width:1200px) {
          .qr-sidebar   { width:260px; }
          .qr-product-grid { grid-template-columns:1fr 1fr 1fr; }
        }

        .qr-product-card {
          border-bottom:1px solid ${T.border};
          cursor:pointer;
          transition:background 0.15s;
          padding:16px;
        }
        .qr-product-card:hover { background:${T.pinkLight}; }

        /* On desktop grid each card needs right border for columns */
        @media (min-width:768px) {
          .qr-product-card { border-right:1px solid ${T.border}; }
        }
      `}</style>

      <div className="qr-root qr-layout">

        {/* ── HEADER ── */}
        <header className="qr-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {logoUrl && (
              <img src={logoUrl} alt={shopName}
                style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover' }} />
            )}
            <div>
              <span style={{
                fontFamily:'var(--font-poppins),Poppins,sans-serif',
                fontWeight:700, fontSize:18, color:T.pink, letterSpacing:'-0.3px',
                display:'block',
              }}>
                {shopName}
              </span>
              {shopTagline && (
                <span style={{
                  fontFamily:'var(--font-manrope),Manrope,sans-serif',
                  fontSize:11, color:T.lightGray, display:'block', lineHeight:1.2,
                }}>
                  {shopTagline}
                </span>
              )}
            </div>
          </div>
          <button aria-label="Search" style={{
            width:36, height:36, display:'flex', alignItems:'center', justifyContent:'center',
            background:T.surface, border:'none', borderRadius:'50%', cursor:'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.gray} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </header>

        {/* ── BODY ── */}
        <div className="qr-body">

          {/* Desktop sidebar */}
          <nav className="qr-sidebar">
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                className={`qr-sidebar-btn${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </nav>

          {/* Main content */}
          <main className="qr-main">

            {/* Banner */}
            {visibleBanners.length > 0 && (
              <div className="qr-banner">
                <div style={{ position:'relative', borderRadius:12, overflow:'hidden' }}>
                  <img
                    src={visibleBanners[activeBanner].image_url!}
                    alt={visibleBanners[activeBanner].name}
                    style={{ width:'100%', aspectRatio:'21/8', objectFit:'cover', display:'block' }}
                  />
                  {visibleBanners.length > 1 && (
                    <div style={{ position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)', display:'flex', gap:4 }}>
                      {visibleBanners.map((_, i) => (
                        <button key={i} onClick={() => setActiveBanner(i)} style={{
                          width: i === activeBanner ? 18 : 6, height:6, borderRadius:100,
                          background: i === activeBanner ? T.white : 'rgba(255,255,255,0.5)',
                          border:'none', padding:0, cursor:'pointer', transition:'width 0.2s',
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile chips */}
            {categories.length > 0 && (
              <div className="qr-chips">
                {['All', ...categories].map(cat => {
                  const isActive = cat === activeCategory;
                  return (
                    <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                      flexShrink:0, padding:'7px 18px', borderRadius:100,
                      border:`1.5px solid ${isActive ? T.pink : T.border}`,
                      background: isActive ? T.pink : T.white,
                      color: isActive ? T.white : T.gray,
                      fontFamily:'var(--font-poppins),Poppins,sans-serif',
                      fontWeight:500, fontSize:13, cursor:'pointer',
                      whiteSpace:'nowrap', transition:'all 0.15s',
                    }}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Product sections */}
            {sections.map(({ category, products }) => (
              <div key={category}>
                <div className="qr-section-hdr">
                  <h3 style={{
                    fontFamily:'var(--font-poppins),Poppins,sans-serif',
                    fontWeight:600, fontSize:16, color:T.dark, margin:0,
                  }}>
                    {category}
                  </h3>
                </div>
                <div className="qr-product-grid">
                  {products.map(p => (
                    <div
                      key={p.id}
                      className="qr-product-card"
                      onClick={() => setActiveProduct(p)}
                    >
                      <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                        {/* Text */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <VegDot foodType={p.food_type} />
                          <p style={{
                            fontFamily:'var(--font-poppins),Poppins,sans-serif',
                            fontWeight:600, fontSize:14, color:T.dark,
                            margin:'5px 0 3px', lineHeight:1.35,
                          }}>
                            {p.name}
                          </p>
                          {p.description && (
                            <p style={{
                              fontFamily:'var(--font-manrope),Manrope,sans-serif',
                              fontSize:12, color:T.lightGray,
                              margin:'0 0 8px', lineHeight:1.5,
                              display:'-webkit-box',
                              WebkitLineClamp:2,
                              WebkitBoxOrient:'vertical',
                              overflow:'hidden',
                            } as React.CSSProperties}>
                              {p.description}
                            </p>
                          )}
                          <p style={{
                            fontFamily:'var(--font-poppins),Poppins,sans-serif',
                            fontWeight:700, fontSize:15, color:T.pink, margin:0,
                          }}>
                            ₹{p.selling_price}
                          </p>
                        </div>
                        {/* Image */}
                        <div style={{ position:'relative', flexShrink:0, paddingBottom: tier === 'order' ? 12 : 0 }}>
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name}
                              style={{ width:88, height:88, borderRadius:12, objectFit:'cover', display:'block' }} />
                          ) : (
                            <ImgPlaceholder size={88} />
                          )}
                          {tier === 'order' && (
                            <button
                              onClick={e => { e.stopPropagation(); setActiveProduct(p); }}
                              style={{
                                position:'absolute', bottom:-8, left:'50%', transform:'translateX(-50%)',
                                padding:'3px 16px', borderRadius:8,
                                border:`1.5px solid ${T.pink}`, background:T.white,
                                color:T.pink,
                                fontFamily:'var(--font-poppins),Poppins,sans-serif',
                                fontWeight:700, fontSize:12, cursor:'pointer',
                                whiteSpace:'nowrap',
                                boxShadow:'0 2px 8px rgba(239,89,161,0.2)',
                              }}
                            >
                              ADD
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {sections.length === 0 && (
              <div style={{ padding:64, textAlign:'center' }}>
                <p style={{ fontFamily:'var(--font-poppins),Poppins,sans-serif', fontSize:14, color:T.lightGray }}>
                  No items available right now.
                </p>
              </div>
            )}

            {/* Footer */}
            <div style={{ padding:'28px 24px 48px', textAlign:'center', borderTop:`1px solid ${T.border}` }}>
              <p style={{ fontFamily:'var(--font-poppins),Poppins,sans-serif', fontSize:13, color:T.lightGray, margin:'0 0 4px' }}>
                <span style={{ color:T.pink }}>♥</span> Skip the queue. Scan &amp; order.
              </p>
              <p style={{ fontFamily:'var(--font-manrope),Manrope,sans-serif', fontSize:11, color:T.lightGray, margin:0 }}>
                Crafted in தமிழ்நாடு
              </p>
            </div>
          </main>
        </div>
      </div>

      {/* Product detail sheet */}
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
