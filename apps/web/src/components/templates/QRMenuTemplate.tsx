'use client';
import { Spinner } from '@/components/loading';

import React, { useState, useEffect, useMemo, useRef, useCallback, startTransition } from 'react';
import CartSheet from './CartSheet';
import CheckoutScreen from './CheckoutScreen';
import CounterWaitingScreen from './CounterWaitingScreen';
import OrderConfirmedScreen from './OrderConfirmedScreen';
import { ORDERING_FROZEN } from '@/lib/platform/productFlags';
import MenuItemCard from './MenuItemCard';
import MenuSheet from './MenuSheet';
import { T, TV } from './menuTokens';
import {
  resolveTheme, resolveFontPair, resolveAccent, themeCssVars,
} from '@/lib/menu/menuThemes';
import {
  MENU_MOTION_CSS, EASE_IN, EASE_OUT, LIST_OUT_MS, ENTER_COUNT, listEnterDelayMs,
  BAR_SHOW_MS, BAR_HIDE_MS, REDUCED_FADE_MS, BANNER_EVERY_MS, BANNER_SLIDE_MS, BANNER_EASE,
  BANNER_HOLD_MS, BANNER_SWIPE_PX, DOT_W, DOT_ACTIVE_W, DOT_GAP, DOT_MS, centeredScrollLeft,
} from '@/lib/menu/menuMotion';
import { pressHandlers } from '@/lib/menu/pressFeedback';
import { menuThumbSrc, fallBackToOriginal } from '@/lib/menu/menuImages';
import { resolveBadge } from '@/lib/menu/badges';
import { shopNameFontSize } from '@/lib/menu/shopNameStyle';
import { useQuickReturn } from '@/hooks/useQuickReturn';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScrollLock } from '@/hooks/useScrollLock';

// ── VARIANT DESCRIPTION HELPERS ──────────────────────────────────────────────
// When a description is stored as "variant-info || dish-description", returns
// the dish-description part. Falls back to the full text when no separator is
// present (owner just typed a regular description).
function getVariantDishDesc(desc: string | null | undefined): string {
  if (!desc) return '';
  const idx = desc.indexOf(' || ');
  return (idx >= 0 ? desc.slice(idx + 4) : desc).trim();
}

function hasRealVariants(meta: Record<string, unknown> | null | undefined): boolean {
  const v = meta?.variants;
  return Array.isArray(v) && v.length > 0;
}

/** Convert a "|"-delimited description into a clean readable paragraph. */
function toParagraph(desc: string | null | undefined): string {
  if (!desc) return '';
  const parts = desc.split('|')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/[.!?]+$/, ''));
  if (!parts.length) return '';
  return parts.join('. ') + '.';
}

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
// Design tokens now live in ./menuTokens so MenuItemCard can share them.

// ── TYPES ─────────────────────────────────────────────────────────────────────
export type Tier = 'view' | 'order' | 'order_no_pay';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
  variantSize?: string;
  food_type?: string | null;
}

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
  display_order?: number | null;
  ks_quadrant?: string | null;
  star_rating?: number | null;
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
  menuProducts: MenuProduct[];
  banners: ShopBanner[];
  tier: Tier;
  shopId: string;
  shopSlug: string;
  tableNumber?: number;
  /** Server-snapshotted GST rate (5 / 18 / 0). Used only to preview tax on the cart;
   *  the server recomputes authoritatively at order creation. */
  gstRatePct?: number;
  /** When true and tier === 'order_no_pay', placing an order writes a lightweight
   *  row and redirects to wa.me instead of going through the token / confirm flow. */
  whatsappOrderTaking?: boolean;
  /** Display currency code — only changes the symbol shown; numbers are the same. */
  currencyCode?: 'INR' | 'AED';
  /** Menu design. Config only — it never changes what the menu says. */
  menuTheme?: string | null;
  menuFont?: string | null;
  /** Owner brand colour. Validated before it reaches a style block. */
  brandColor?: string | null;
  /** Whether to draw the logo. Opt-out: most stores have none. */
  onAddToCart?: (product: MenuProduct, qty: number, variantSize?: string) => void;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function numMeta(val: unknown): number {
  return typeof val === 'number' ? val : 0;
}

// ── VEG/EGG/NONVEG DOT ───────────────────────────────────────────────────────
function VegDot({ foodType }: { foodType?: string | null }) {
  const isNonveg = foodType === 'nonveg' || foodType === 'non_veg';
  const isEgg = foodType === 'egg';
  const color = isNonveg ? T.nonvegRed : isEgg ? T.amber : T.vegGreen;
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

// The image placeholder was deleted with its last caller: an empty frame
// reads as a failed image rather than "this dish has no photo".

// Recommendation badges moved to @/lib/menu/badges + MenuItemCard, so the
// list and the detail sheet can no longer disagree about which dish is a
// Best Seller. The old inline version was matched with two different casings.

// Scroll locking moved to @/hooks/useScrollLock: it locked <body>, which —
// with html's overflow-x: clip — made body a scroll container and dropped the
// sticky header off screen whenever a sheet opened.

/**
 * The detail sheet's hero fades in like the list thumbs (`.qr-thumb-img`).
 * Set on the element directly — the sheet does not re-render for it — and a
 * photo that is already decoded shows at once, without the fade.
 */
function settleHero(img: HTMLImageElement | null) {
  if (img?.complete && img.naturalWidth > 0) img.dataset.loaded = 'instant';
}

// ── RADIO CIRCLE ─────────────────────────────────────────────────────────────
function RadioCircle({ selected }: { selected: boolean }) {
  const color = selected ? TV.accent : '#B3B3B3';
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%',
      border: `2px solid ${color}`, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {selected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />}
    </div>
  );
}

// ── PRODUCT DETAIL BOTTOM SHEET ───────────────────────────────────────────────
function ProductDetailSheet({
  product, open, tier, onClose, onExited, onAddToCart, editingCartItem, onReplaceCartItem, currencyCode = 'INR',
}: {
  product: MenuProduct | null;
  /** False while the sheet slides away; it unmounts on `onExited`. */
  open: boolean;
  tier: Tier;
  onClose: () => void;
  onExited: () => void;
  onAddToCart?: (product: MenuProduct, qty: number, variantSize?: string, priceOverride?: number) => void;
  editingCartItem?: CartItem | null;
  onReplaceCartItem?: (old: CartItem, product: MenuProduct, qty: number, variantSize?: string, priceOverride?: number) => void;
  currencyCode?: 'INR' | 'AED';
}) {
  const CURR = currencyCode === 'AED' ? 'AED ' : '₹';

  const meta = product?.metadata ?? {};
  const variants = Array.isArray(meta.variants) && (meta.variants as unknown[]).length > 0
    ? (meta.variants as { size: string; price: number | string; recommended?: boolean }[]) : null;
  const toppings = Array.isArray(meta.toppings) && (meta.toppings as unknown[]).length > 0
    ? (meta.toppings as { name: string; price: number | string }[]) : null;
  const comboItems = Array.isArray(meta.comboItems) && (meta.comboItems as unknown[]).length > 0
    ? (meta.comboItems as { name: string; qty: number | string }[]) : null;

  const productType: 'variant' | 'combo' | 'single' =
    variants ? 'variant' : comboItems ? 'combo' : 'single';

  /**
   * On the view-only plan the sheet is a reference page, not a form.
   *
   * The ordering controls were already gated on tier, but the SIZE LIST was
   * not: it kept rendering as tappable rows with a radio, so it looked like a
   * choice, responded to a tap, and led nowhere. A diner who picks "Family"
   * reasonably expects something to happen. Below, the same information is
   * rendered as a read-only price list when nothing can be ordered.
   *
   * The selectable branch is deliberately KEPT rather than deleted — it is
   * what the freeze is hiding, and it must still work on the day ordering is
   * switched back on.
   */
  const canOrder = tier === 'order' || tier === 'order_no_pay';

  const isEditing = !!(editingCartItem && onReplaceCartItem);

  const [qty, setQty] = useState(1);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [selectedToppingIdx, setSelectedToppingIdx] = useState<number | null>(null);
  // Re-entry guard — prevents a rapid double-tap from adding the item twice
  // while the parent's history.back() close animation is still in flight.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (editingCartItem?.variantSize && variants) {
      const idx = variants.findIndex(v => v.size === editingCartItem.variantSize);
      setSelectedVariantIdx(idx >= 0 ? idx : 0);
    } else {
      setSelectedVariantIdx(0);
    }
    setQty(editingCartItem?.qty ?? 1);
    setSelectedToppingIdx(null);
    submittingRef.current = false;
  }, [product?.id, editingCartItem?.variantSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!product) return null;

  const selectedVariantPrice = variants
    ? Number(variants[selectedVariantIdx]?.price ?? product.selling_price)
    : product.selling_price;
  const selectedToppingPrice = toppings && selectedToppingIdx !== null
    ? Number(toppings[selectedToppingIdx]?.price ?? 0) : 0;
  const totalPrice = (selectedVariantPrice + selectedToppingPrice) * qty;

  const discountOn = !!(meta.discount_enabled) && !!(meta.original_price);
  const discountPct = numMeta(meta.discount_pct);


  // ── VARIANT LAYOUT (Figma design) ─────────────────────────────────────────
  if (productType === 'variant' && variants) {
    const dishDesc = getVariantDishDesc(product.description);
    return (
      <MenuSheet
        open={open}
        onRequestClose={onClose}
        onExited={onExited}
        label={product.name}
        panelStyle={{
          borderRadius: '30px 30px 0 0',
          maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: '#F1F0F5',
        }}
      >
          {/* ── COMPACT HEADER ── (top padding leaves room for the drag handle) */}
          <div style={{
            background: T.white, borderRadius: '30px 30px 0 0', flexShrink: 0,
            padding: '22px 16px 14px', display: 'flex', alignItems: 'center', gap: 12,
          }}>
            {/* No photo, no frame — see the note on the hero below. */}
            {product.image_url && (
              <div style={{
                width: 54, height: 54, borderRadius: 6, overflow: 'hidden',
                flexShrink: 0, background: '#F0F0F0',
              }}>
                <img src={menuThumbSrc(product.image_url)} alt={product.name}
                  onError={e => { fallBackToOriginal(e.currentTarget, product.image_url as string); }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
                lineHeight: '24px', color: '#333333', margin: 0,
                overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>{product.name}</p>
              {product.category && (
                <p style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 400, fontSize: 12,
                  lineHeight: '18px', color: '#999999', margin: 0,
                }}>{product.category}</p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'rgba(0,0,0,0.75)', border: 'none', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── SCROLLABLE GRAY BODY ── */}
          <div data-sheet-scroll style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>

            {/* Offer banner — prioritized when discount is active */}
            {discountOn && discountPct > 0 && (() => {
              const orig = numMeta(meta.original_price);
              const baseSelling = Number(product.selling_price);
              const savings = Math.max(0, orig - baseSelling);
              return (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'linear-gradient(90deg, #ECFDF5 0%, #F7FEE7 100%)',
                  border: '1px dashed #16A34A', borderRadius: 8,
                  padding: '10px 12px', marginBottom: 12,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#16A34A',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="7" cy="7" r="1.2" fill="#FFFFFF"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 13, lineHeight: '18px', color: '#15803D' }}>Flat {discountPct}% OFF applied</p>
                    {savings > 0 && (
                      <p style={{ margin: '1px 0 0', fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 11, lineHeight: '15px', color: '#166534' }}>You save {CURR}{savings} on this item</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Description — paragraph; muted when an offer is taking priority */}
            {dishDesc && (() => {
              const paragraph = toParagraph(dishDesc);
              const offerActive = discountOn && discountPct > 0;
              return (
                <p style={{
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: 400,
                  fontSize: offerActive ? 12 : 13,
                  lineHeight: offerActive ? '18px' : '20px',
                  color: offerActive ? '#6B7280' : '#4B5563',
                  margin: '0 0 14px',
                }}>{paragraph}</p>
              );
            })()}

            {/* Sizes. A price list when nothing can be ordered, a picker when
                it can. Same rows, same order — only the affordance differs. */}
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 14,
              lineHeight: '12px', color: '#4C4C4C', margin: '0 0 10px 4px',
            }}>{canOrder ? 'Prefer Quantity' : 'Sizes'}</p>
            <div style={{
              background: T.white, border: '1px solid #E6E6E6', borderRadius: 10,
              overflow: 'hidden', marginBottom: 16,
            }}>
              {!canOrder && variants.map((v, i) => (
                <div
                  key={v.size}
                  data-testid="variant-price-row"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 12px', width: '100%',
                    borderBottom: i < variants.length - 1 ? '1px solid #F0F0F0' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                      fontSize: 15, lineHeight: '21px', color: '#231F23',
                    }}>{v.size}</span>
                    {v.recommended && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 6px', background: '#FFEDE4', borderRadius: 17,
                        fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                        fontSize: 11, lineHeight: '15px', color: '#F18145', whiteSpace: 'nowrap',
                      }}>Recommended</span>
                    )}
                  </div>
                  <span style={{
                    fontFamily: "'Manrope',sans-serif", fontWeight: 800,
                    fontSize: 16, color: '#191919',
                  }}>{CURR}{v.price}</span>
                </div>
              ))}
              {canOrder && variants.map((v, i) => (
                <button
                  key={v.size}
                  onClick={() => setSelectedVariantIdx(i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 12px', width: '100%', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: i < variants.length - 1 ? '1px solid #F0F0F0' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                      fontSize: 14, lineHeight: '19px', color: '#333333',
                    }}>{v.size}</span>
                    {v.recommended && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 6px', background: '#FFEDE4', borderRadius: 17,
                        fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                        fontSize: 11, lineHeight: '15px', letterSpacing: '0.0161em', color: '#F18145',
                        whiteSpace: 'nowrap',
                      }}>Recommended</span>
                    )}
                    <span style={{
                      fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                      fontSize: 12, color: '#999999',
                    }}>{CURR}{v.price}</span>
                  </div>
                  <RadioCircle selected={i === selectedVariantIdx} />
                </button>
              ))}
            </div>

            {/* Toppings */}
            {toppings && (
              <>
                <p style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 14,
                  lineHeight: '12px', color: '#4C4C4C', margin: '0 0 10px 4px',
                }}>Toppings</p>
                <div style={{
                  background: T.white, border: '1px solid #E6E6E6', borderRadius: 10,
                  overflow: 'hidden',
                }}>
                  {toppings.map((t, i) => {
                    const toppingPrice = Number(t.price ?? 0);
                    return (
                      <button
                        key={t.name}
                        onClick={() => setSelectedToppingIdx(i === selectedToppingIdx ? null : i)}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '12px 12px', width: '100%', textAlign: 'left',
                          background: 'none', border: 'none', cursor: 'pointer',
                          borderBottom: i < toppings.length - 1 ? '1px solid #F0F0F0' : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                            fontSize: 14, lineHeight: '19px', color: '#333333',
                          }}>{t.name}</span>
                          {toppingPrice > 0 && (
                            <span style={{
                              fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                              fontSize: 12, color: '#999999',
                            }}>+{CURR}{toppingPrice}</span>
                          )}
                        </div>
                        <RadioCircle selected={i === selectedToppingIdx} />
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── BOTTOM BAR ── */}
          {(tier === 'order' || tier === 'order_no_pay') && (
            <div style={{
              height: 70, flexShrink: 0,
              background: 'linear-gradient(271.36deg, #FFFFFF 1.97%, #FFF3E6 126.56%)',
              display: 'flex', alignItems: 'center',
              padding: '0 12px', gap: 12,
            }}>
              {/* Qty pill */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: 140, height: 46, flexShrink: 0,
                border: `1px solid ${T.pink}`, borderRadius: 100, padding: '0 14px',
              }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14" stroke={T.pink} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                  fontSize: 18, lineHeight: '27px', letterSpacing: '0.0161em', color: T.pink,
                }}>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(99, q + 1))}
                  aria-label="Increase quantity"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke={T.pink} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Add / Update button */}
              <button
                onClick={() => {
                  if (submittingRef.current) return;
                  submittingRef.current = true;
                  const variantSize = variants[selectedVariantIdx]?.size;
                  const pricePerItem = selectedVariantPrice + selectedToppingPrice;
                  if (isEditing) {
                    onReplaceCartItem!(editingCartItem!, product, qty, variantSize, pricePerItem);
                  } else {
                    onAddToCart?.(product, qty, variantSize, pricePerItem);
                  }
                  onClose();
                }}
                style={{
                  flex: 1, height: 46, background: T.pink, border: 'none',
                  borderRadius: 6, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                    fontSize: 14, lineHeight: '21px', color: T.white,
                  }}>{CURR}{totalPrice}</span>
                  <span style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                    fontSize: 12, lineHeight: '18px', color: T.white,
                  }}>Total</span>
                </div>
                <div style={{ width: 1, height: 34, background: '#F4D2A7', margin: '0 14px' }} />
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                  fontSize: 14, lineHeight: '21px', color: T.white,
                }}>{isEditing ? 'Update' : 'Add'}</span>
              </button>
            </div>
          )}
      </MenuSheet>
    );
  }

  // ── SINGLE / COMBO LAYOUT (existing design) ───────────────────────────────
  return (
    <MenuSheet
      open={open}
      onRequestClose={onClose}
      onExited={onExited}
      label={product.name}
      handleOnPhoto={!!product.image_url}
      // Floating close button, centred above the sheet (Zomato/Swiggy
      // pattern). Passed as `above` so it rides up WITH the sheet; as a
      // sibling it was on screen before the sheet had arrived.
      above={(
        <button
          onClick={onClose}
          aria-label="Close"
          className="qr-sheet-x"
          style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: '#FFFFFF', border: 'none', marginBottom: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="#1A1A1A" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      panelStyle={{
        background: T.white, borderRadius: '20px 20px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
        <div data-sheet-scroll style={{ flex: 1, overflowY: 'auto' }}>
        {/* The photo, with the drag handle (drawn by MenuSheet) over its top
            edge. With no photo this collapses to a short strip that holds
            only the handle — everything that used to be positioned over the
            image moves into the normal flow below. */}
        <div style={{ position: 'relative', minHeight: product.image_url ? undefined : 24 }}>
          {/* No photo means no hero. A pink gradient block with a picture
              glyph in it reads as a failed image, not as "this dish has no
              photo", and it pushed the name and price below the fold. */}
          {product.image_url && (
            <div style={{ background: T.photoWait }}>
              <img src={product.image_url} alt={product.name}
                style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
                className="qr-thumb-img" ref={settleHero}
                onLoad={e => { e.currentTarget.dataset.loaded ??= 'true'; }}
                onError={e => { e.currentTarget.dataset.loaded = 'true'; }} />
            </div>
          )}
        </div>

        <div style={{ padding: '18px 16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Recommendation label, above the dish name, always.
              It used to be absolutely positioned onto the photo, so it moved
              with the photo and — once a dish with no photo could exist —
              landed on top of the name. A row of its own is legible in both
              cases and is one behaviour instead of two.
              (It also once tested `ks_quadrant === 'star'` in lowercase while
              the database stores 'Star', so it never rendered at all: the
              badge showed in the list and vanished the moment the customer
              opened the item, which is exactly when it matters. resolveBadge
              matches case-insensitively across all three quadrants.) */}
          {(() => {
            const b = resolveBadge(product.ks_quadrant);
            if (!b) return null;
            return (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, width: 'fit-content',
                background: b.bg, border: `1px solid ${b.border}`, borderRadius: 100,
                padding: '4px 11px 4px 8px',
              }}>
                <span style={{ display: 'flex', color: b.fg }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1z"/>
                  </svg>
                </span>
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                  fontSize: 11.5, color: b.fg,
                }}>{b.label}</span>
              </div>
            );
          })()}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ paddingTop: 6 }}>
              <VegDot foodType={product.food_type} />
            </div>
            <h2 style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 700,
              fontSize: 22, lineHeight: '30px', color: '#1A1A1A', margin: 0, flex: 1,
            }}>{product.name}</h2>
          </div>

          {/* Price row — unified for single & combo */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 700,
              fontSize: 20, lineHeight: '28px', color: '#1A1A1A',
            }}>{CURR}{product.selling_price}</span>
            {discountOn && (
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                fontSize: 13, lineHeight: '18px',
                textDecoration: 'line-through', color: '#9CA3AF',
              }}>{CURR}{numMeta(meta.original_price)}</span>
            )}
            {discountOn && discountPct > 0 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
                background: '#DCFCE7', borderRadius: 4,
              }}>
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                  fontSize: 11, color: '#15803D', letterSpacing: '0.02em',
                }}>{discountPct}% OFF</span>
              </div>
            )}
          </div>

          {/* Offer banner — prioritized when discount is active (works for single & combo) */}
          {discountOn && discountPct > 0 && (() => {
            const orig = numMeta(meta.original_price);
            const savings = Math.max(0, orig - Number(product.selling_price));
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'linear-gradient(90deg, #ECFDF5 0%, #F7FEE7 100%)',
                border: '1px dashed #16A34A', borderRadius: 8,
                padding: '10px 12px',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#16A34A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="7" cy="7" r="1.2" fill="#FFFFFF"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                    fontSize: 13, lineHeight: '18px', color: '#15803D',
                  }}>Flat {discountPct}% OFF applied</p>
                  {savings > 0 && (
                    <p style={{
                      margin: '1px 0 0', fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                      fontSize: 11, lineHeight: '15px', color: '#166534',
                    }}>You save {CURR}{savings} on this {productType === 'combo' ? 'combo' : 'item'}</p>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Description paragraph — muted when an offer is taking priority */}
          {product.description && (() => {
            const paragraph = toParagraph(product.description);
            const offerActive = discountOn && discountPct > 0;
            return (
              <p style={{
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 400,
                fontSize: offerActive ? 12 : 13,
                lineHeight: offerActive ? '18px' : '20px',
                color: offerActive ? '#6B7280' : '#4B5563',
                margin: 0,
              }}>{paragraph}</p>
            );
          })()}

          {/* Combo items — "What's included" list */}
          {productType === 'combo' && comboItems && (
            <>
              <div style={{ height: 1, background: '#F1F1F1', margin: '4px 0 2px' }} />
              <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 13, color: '#1A1A1A', margin: '0 0 4px', letterSpacing: '0.02em' }}>What&apos;s included</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {comboItems.map((item) => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.pink, flexShrink: 0 }} />
                      <span style={{ fontFamily: "'Manrope',sans-serif", fontWeight: 500, fontSize: 14, lineHeight: '19px', color: '#333333' }}>{item.name}</span>
                    </div>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 12, color: T.descColor, background: '#F4F4F5', borderRadius: 6, padding: '2px 8px' }}>×{item.qty}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </div>

        {(tier === 'order' || tier === 'order_no_pay') && (
          <div style={{
            width: '100%', flexShrink: 0,
            background: T.white, borderTop: `1px solid ${T.border}`,
            boxShadow: '0 -4px 14px rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center',
            padding: '12px 16px 20px', gap: 12,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: 112, height: 48, border: `1.5px solid ${T.pink}`, borderRadius: 10,
              padding: '0 10px', flexShrink: 0, background: T.white,
            }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))} aria-label="Decrease quantity"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14" stroke={T.pink} strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 17, color: T.pink, minWidth: 16, textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty(q => Math.min(99, q + 1))} aria-label="Increase quantity"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke={T.pink} strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <button
              onClick={() => {
                if (submittingRef.current) return;
                submittingRef.current = true;
                if (isEditing) {
                  onReplaceCartItem!(editingCartItem!, product, qty, undefined, undefined);
                } else {
                  onAddToCart?.(product, qty);
                }
                onClose();
              }}
              style={{
                flex: 1, height: 48, background: T.pink, border: 'none',
                borderRadius: 10, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(239,89,161,0.35)',
                padding: '0 12px',
              }}
            >
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 700,
                fontSize: 15, lineHeight: '20px', color: '#FFFFFF',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{isEditing ? 'Update' : 'Add Item'} · {CURR}{totalPrice}</span>
            </button>
          </div>
        )}
    </MenuSheet>
  );
}

// ── BROWSE OVERLAY ────────────────────────────────────────────────────────────
function SearchOverlay({
  products, categories, onClose, onSelectProduct, tier, currencyCode = 'INR',
}: {
  products: MenuProduct[];
  categories: string[];
  onClose: () => void;
  onSelectProduct: (p: MenuProduct) => void;
  tier: Tier;
  currencyCode?: 'INR' | 'AED';
}) {
  useScrollLock();

  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => inputRef.current?.focus(), 80);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Escape key closes overlay
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const results = (q || activeChip)
    ? products.filter(p => {
        const textMatch = !q || (
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q)
        );
        const chipMatch = !activeChip || (p.category ?? '').toLowerCase() === activeChip.toLowerCase();
        return textMatch && chipMatch;
      })
    : [];

  const handleSelect = (p: MenuProduct) => {
    onSelectProduct(p);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Browse menu"
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: T.white,
        display: 'flex', flexDirection: 'column',
        animation: 'qrFadeIn 0.15s ease',
        maxWidth: 560, margin: '0 auto',
      }}
    >
      {/* ── PILL INPUT BAR ── */}
      <div style={{ padding: '20px 16px 0', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          background: '#F9F9F9', border: '1px solid #EBEBEB',
          borderRadius: 100, padding: '0 16px',
          height: 43,
        }}>
          {/* Back arrow */}
          <button
            onClick={onClose}
            aria-label="Go back"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, display: 'flex', alignItems: 'center',
              marginRight: 8,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#000000" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Text input — 15px prevents iOS auto-zoom on focus */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for dishes, cuisines…"
            style={{
              flex: 1, border: 'none', background: 'transparent', outline: 'none',
              fontFamily: "'Poppins',sans-serif", fontWeight: 500,
              fontSize: 15, lineHeight: '20px', color: '#191919',
            }}
          />

          {/* Close X */}
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 0, display: 'flex', alignItems: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="#000000" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY CHIP ROW ── */}
      <div style={{
        padding: '16px 16px 0', flexShrink: 0,
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center',
          gap: 12, width: 'max-content',
        }}>
          {/* "All" chip — clears category filter; honest about its behavior (no fake dropdown) */}
          <button
            onClick={() => setActiveChip(null)}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '8px 16px', height: 36,
              border: `0.65px solid ${!activeChip ? TV.accent : '#D1D5DC'}`,
              borderRadius: 40, background: !activeChip ? TV.accent : T.white,
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: !activeChip ? 600 : 400,
              fontSize: 14, lineHeight: '20px', letterSpacing: '-0.15px',
              color: !activeChip ? T.white : '#0A0A0A', whiteSpace: 'nowrap',
            }}>All</span>
          </button>

          {/* Category chips */}
          {categories.map(cat => {
            const isActive = activeChip === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveChip(isActive ? null : cat)}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '8px 12px', height: 36,
                  border: `0.65px solid ${isActive ? TV.accent : '#D1D5DC'}`,
                  borderRadius: 40,
                  background: isActive ? TV.accent : T.white,
                  cursor: 'pointer', flexShrink: 0,
                }}
              >
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                  fontSize: 14, lineHeight: '20px', letterSpacing: '-0.15px',
                  color: isActive ? T.white : '#0A0A0A', whiteSpace: 'nowrap',
                }}>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── RESULTS LIST ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 80px' }}>
        {(q || activeChip) ? (
          results.length === 0 ? (
            <div style={{ paddingTop: 48, textAlign: 'center' }}>
              <p style={{
                fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.lightGray,
              }}>No items found</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {results.map(p => (
                <BrowseResultCard key={p.id} product={p} tier={tier} onSelect={handleSelect} currencyCode={currencyCode} />
              ))}
            </div>
          )
        ) : (
          <div style={{ paddingTop: 48, textAlign: 'center' }}>
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.lightGray,
            }}>Type to find dishes or tap a category above</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BROWSE RESULT CARD ────────────────────────────────────────────────────────
/**
 * Search results. Now the same card as the main list.
 *
 * It used to be a second implementation with no discount branch at all, so a
 * customer who searched for the dish you had discounted saw the full price and
 * no sign an offer existed. One component means that cannot recur.
 */
function BrowseResultCard({
  product: p, tier, onSelect, currencyCode = 'INR',
}: {
  product: MenuProduct;
  tier: Tier;
  onSelect: (p: MenuProduct) => void;
  currencyCode?: 'INR' | 'AED';
}) {
  const desc = hasRealVariants(p.metadata) ? getVariantDishDesc(p.description) : p.description;
  const canAdd = tier === 'order' || tier === 'order_no_pay';

  return (
    <MenuItemCard
      product={p}
      description={desc}
      currencyCode={currencyCode}
      onSelect={() => onSelect(p)}
      action={canAdd ? (
        <button
          onClick={e => { e.stopPropagation(); onSelect(p); }}
          aria-label={`Add ${p.name} to cart`}
          style={{
            width: 72, height: 28, borderRadius: 14,
            border: `1px solid ${T.pink}`, background: T.white, color: T.pink,
            fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0px 2px 6px rgba(0,0,0,0.12)',
          }}
        >ADD</button>
      ) : null}
    />
  );
}

// ── BANNER CAROUSEL ───────────────────────────────────────────────────────────
/**
 * Row 9. It changed every 3s and kept moving under a reader who was trying to
 * read the menu. Now:
 *
 *   - every 5s, sliding over 500ms on cubic-bezier(.65,0,.35,1);
 *   - paused while a finger is on it, and for 8s after a swipe or a dot tap;
 *   - stopped while scrolled off screen, or while a sheet or search is open;
 *   - never autoplaying under reduced motion, where a swap fades instead.
 *
 * The active dot widens 6 → 16px using transforms only: two round caps and a
 * bar between them that scales from its left edge, while the dots after it
 * shift right. Animating `width` relaid the row out every frame.
 */
function BannerCarousel({ banners, paused, reduceMotion }: {
  banners: ShopBanner[];
  paused: boolean;
  reduceMotion: boolean;
}) {
  const n = banners.length;
  const [active, setActive] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const [touching, setTouching] = useState(false);
  const [holdUntil, setHoldUntil] = useState(0);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const touchFrom = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => { if (active >= n) setActive(0); }, [n, active]);

  useEffect(() => {
    const el = regionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // One timeout per slide, re-armed on every change, so a manual change
  // always gets its full interval instead of racing a running setInterval.
  useEffect(() => {
    if (n <= 1 || reduceMotion || paused || !onScreen || touching) return;
    const wait = Math.max(BANNER_EVERY_MS, holdUntil - Date.now());
    const id = window.setTimeout(() => setActive(i => (i + 1) % n), wait);
    return () => window.clearTimeout(id);
  }, [n, reduceMotion, paused, onScreen, touching, holdUntil, active]);

  const goTo = (i: number) => {
    setActive(((i % n) + n) % n);
    setHoldUntil(Date.now() + BANNER_HOLD_MS);
  };

  const dotMove = reduceMotion ? 'none' : `transform ${DOT_MS}ms ${EASE_OUT}, opacity ${DOT_MS}ms ${EASE_OUT}`;

  return (
    <div style={{ padding: '10px 12px 0' }}>
      <div
        ref={regionRef}
        role="region"
        aria-label="Promotional banners"
        onTouchStart={e => {
          const t = e.touches[0];
          touchFrom.current = { x: t.clientX, y: t.clientY };
          setTouching(true);
        }}
        onTouchEnd={e => {
          const from = touchFrom.current;
          touchFrom.current = null;
          setTouching(false);
          const t = e.changedTouches[0];
          if (!from || !t || n <= 1) return;
          const dx = t.clientX - from.x;
          if (Math.abs(dx) > BANNER_SWIPE_PX && Math.abs(dx) > Math.abs(t.clientY - from.y)) {
            goTo(active + (dx < 0 ? 1 : -1));
          }
        }}
        onTouchCancel={() => { touchFrom.current = null; setTouching(false); }}
        style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', touchAction: 'pan-y' }}
      >
        <div
          key={reduceMotion ? `still-${active}` : 'strip'}
          className={reduceMotion ? 'qr-fade-in' : undefined}
          style={{
            display: 'flex',
            transform: `translateX(-${active * 100}%)`,
            transition: reduceMotion ? 'none' : `transform ${BANNER_SLIDE_MS}ms ${BANNER_EASE}`,
            willChange: 'transform',
          }}
        >
          {banners.map((b, i) => (
            <img
              key={b.id}
              src={b.image_url!}
              alt={b.name}
              loading={i === 0 ? 'eager' : 'lazy'}
              decoding={i === 0 ? 'sync' : 'async'}
              style={{
                width: '100%', flexShrink: 0,
                aspectRatio: '351/134', objectFit: 'cover', display: 'block',
              }}
            />
          ))}
        </div>
        {n > 1 && (
          <div
            role="tablist"
            aria-label="Banner navigation"
            style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              width: (n - 1) * (DOT_W + DOT_GAP) + DOT_ACTIVE_W, height: DOT_W,
            }}
          >
            {banners.map((_, i) => {
              const on = i === active;
              const x = i * (DOT_W + DOT_GAP) + (i > active ? DOT_ACTIVE_W - DOT_W : 0);
              const stretch = DOT_ACTIVE_W - DOT_W;
              return (
                <button
                  key={i}
                  role="tab"
                  aria-label={`Banner ${i + 1} of ${n}`}
                  aria-selected={on}
                  onClick={() => goTo(i)}
                  style={{
                    position: 'absolute', left: 0, top: 0, width: DOT_W, height: DOT_W,
                    border: 'none', padding: 0, background: 'transparent', cursor: 'pointer',
                    transform: `translateX(${x}px)`, opacity: on ? 1 : 0.55, transition: dotMove,
                  }}
                >
                  <span style={{ position: 'absolute', left: 0, top: 0, width: DOT_W, height: DOT_W, borderRadius: '50%', background: T.white }} />
                  <span style={{
                    position: 'absolute', left: DOT_W / 2, top: 0, width: stretch, height: DOT_W, background: T.white,
                    transformOrigin: 'left center', transform: `scaleX(${on ? 1 : 0})`, transition: dotMove,
                  }} />
                  <span style={{
                    position: 'absolute', left: 0, top: 0, width: DOT_W, height: DOT_W, borderRadius: '50%', background: T.white,
                    transform: `translateX(${on ? stretch : 0}px)`, transition: dotMove,
                  }} />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN TEMPLATE ─────────────────────────────────────────────────────────────
export default function QRMenuTemplate({
  shopName, shopTagline, menuProducts, banners, tier, shopId, shopSlug, tableNumber, gstRatePct = 0, whatsappOrderTaking = false, currencyCode = 'INR',
  menuTheme, menuFont, brandColor,
}: QRMenuTemplateProps) {
  const CURR = currencyCode === 'AED' ? 'AED ' : '₹';

  /**
   * The design, as CSS custom properties on the shell.
   *
   * Resolved once per render and handed to `.qr-shell`, so no component below
   * ever learns a theme name — shop/CLAUDE.md: "Never branch on template name
   * inside a component." An unknown or missing value falls back to Classic
   * rather than throwing, because a menu that renders slightly wrong is a bug
   * and a menu that does not render is a lost customer.
   */
  const theme = useMemo(() => resolveTheme(menuTheme), [menuTheme]);
  const themeVars = useMemo(
    () => themeCssVars(theme, resolveAccent(brandColor, theme.id), resolveFontPair(menuFont, theme)),
    [theme, brandColor, menuFont],
  ) as React.CSSProperties;
  const canOrder = tier === 'order' || tier === 'order_no_pay';
  /**
   * Category is TWO pieces of state. `activeCategory` is the chip, and it
   * changes on the tap itself; `listCategory` is the list, and it changes
   * LIST_OUT_MS later, once the old list has faded out. One shared value
   * meant the chip waited on the whole list re-rendering — the ~35ms lag in
   * the recording.
   */
  const [activeCategory, setActiveCategory] = useState('All');
  const [listCategory, setListCategory] = useState('All');
  const [listPhase, setListPhase] = useState<'idle' | 'out'>('idle');
  /** Bumped per switch: remounts the list so its first screenful rises in. */
  const [listEpoch, setListEpoch] = useState(0);
  /**
   * How many cards the list renders. All of them — except in the first commit
   * after a switch, which renders only the first screenful (ENTER_COUNT, the
   * cards that animate in). The rest follow straight after as a transition
   * React can interrupt. Mounting a whole "All" list in the swap was a 166ms
   * main-thread task on a desktop: on a phone, a blank list between the fade
   * out and the fade in. Now the swap costs the same however long the menu.
   */
  const [listLimit, setListLimit] = useState(Number.POSITIVE_INFINITY);
  /** The old list's height, held while the rest renders, so scroll cannot jump. */
  const [heldListHeight, setHeldListHeight] = useState<number | null>(null);
  const listSwapTimer = useRef<number | null>(null);
  /** The category the list will switch to once the old list has faded out. */
  const pendingCategory = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const chipRowRef = useRef<HTMLDivElement | null>(null);
  /** The product the sheet shows. Kept through the close slide. */
  const [activeProduct, setActiveProduct] = useState<MenuProduct | null>(null);
  /** False while the sheet slides away; `activeProduct` clears when it has gone. */
  const [productOpen, setProductOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [myOrdersOpen, setMyOrdersOpen] = useState(false);
  // Whether the restaurant has connected a Razorpay account. Default to true so
  // the option doesn't flicker off on slow networks; we hide it once we know.
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  useEffect(() => {
    if (!canOrder || tier === 'order_no_pay') return;
    let cancelled = false;
    fetch(`/api/shop/payment-options?siteId=${encodeURIComponent(shopId)}`)
      .then(r => r.ok ? r.json() : { onlineEnabled: false })
      .then(d => { if (!cancelled) setOnlineEnabled(!!d.onlineEnabled); })
      .catch(() => { if (!cancelled) setOnlineEnabled(false); });
    return () => { cancelled = true; };
  }, [shopId, canOrder, tier]);

  // ── MY ORDERS (localStorage-backed, today only, this shop only) ───────────
  const LS_ORDERS = `bys_orders_${shopId}`;
  interface SavedOrder { orderId: string; orderNumber: string; tokenNumber?: string; counterNumber?: string; paymentMethod?: string; tableNumber?: number; ts: number; }

  const saveOrder = useCallback((o: SavedOrder) => {
    try {
      const today = new Date().toDateString();
      const existing: SavedOrder[] = JSON.parse(localStorage.getItem(LS_ORDERS) ?? '[]');
      const todayOnly = existing.filter(x => new Date(x.ts).toDateString() === today);
      const deduped = todayOnly.filter(x => x.orderId !== o.orderId);
      localStorage.setItem(LS_ORDERS, JSON.stringify([o, ...deduped].slice(0, 20)));
    } catch { /* quota */ }
  }, [LS_ORDERS]);

  const getTodayOrders = useCallback((): SavedOrder[] => {
    try {
      const today = new Date().toDateString();
      const all: SavedOrder[] = JSON.parse(localStorage.getItem(LS_ORDERS) ?? '[]');
      return all.filter(x => new Date(x.ts).toDateString() === today);
    } catch { return []; }
  }, [LS_ORDERS]);

  const [todayOrders, setTodayOrders] = useState<SavedOrder[]>([]);
  useEffect(() => { setTodayOrders(getTodayOrders()); }, [getTodayOrders]);

  // ── CART STATE (sessionStorage-backed so refreshes don't lose the flow) ──
  // Start with empty defaults so SSR and initial client render match (no hydration mismatch).
  // sessionStorage is restored in useEffect after mount.
  const SS_CART      = `bys_cart_${shopId}`;
  const SS_WAITING   = `bys_waiting_${shopId}`;
  const SS_CONFIRMED = `bys_confirmed_${shopId}`;

  const [cart, setCartRaw] = useState<CartItem[]>([]);
  const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try { sessionStorage.setItem(SS_CART, JSON.stringify(next)); } catch { /* quota */ }
      return next;
    });
  }, [SS_CART]);

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // ── Category bar: quick return ──────────────────────────────────────────
  // The chip row used to scroll away with the content, so changing category on
  // a long menu meant scrolling back to the very top. It now sticks under the
  // header, hides while the reader scrolls down into the food, and returns the
  // moment they scroll up. See @/hooks/useQuickReturn for why this measures
  // distance rather than counting scroll events.
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerH, setHeaderH] = useState(64);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setHeaderH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // While a sheet owns the screen — including the 220ms it takes to slide
  // away, which is why this reads `activeProduct` and not `productOpen` — the
  // bar is frozen exactly as it was. It used to be forced back in, so it
  // jumped every time a sheet closed.
  const overlayOpen = !!activeProduct || searchOpen || cartOpen || checkoutOpen || myOrdersOpen;
  const chipsPinned = useQuickReturn({ disabled: overlayOpen });
  const reduceMotion = useReducedMotion();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'online' | 'counter'>('online');
  const effectivePaymentMethod = tier === 'order_no_pay' ? 'no_payment' : selectedPaymentMethod;
  const [billReqState, setBillReqState] = useState<'idle' | 'confirming' | 'sending' | 'sent' | 'cooldown'>('idle');
  const [confirmedOrder, setConfirmedOrderRaw] = useState<{
    id: string; number: string; paymentMethod: 'online' | 'counter' | 'no_payment'; tokenNumber?: string;
  } | null>(null);
  // Snapshot of cart items at confirm time — survives refresh so the bill still renders correctly
  const [confirmedCart, setConfirmedCart] = useState<CartItem[]>([]);
  const [confirmedSubtotal, setConfirmedSubtotal] = useState(0);

  const setConfirmedOrder = useCallback((
    val: { id: string; number: string; paymentMethod: 'online' | 'counter' | 'no_payment'; tokenNumber?: string } | null,
    cartSnapshot?: CartItem[],
    subtotalSnapshot?: number,
  ) => {
    setConfirmedOrderRaw(val);
    if (cartSnapshot !== undefined) setConfirmedCart(cartSnapshot);
    if (subtotalSnapshot !== undefined) setConfirmedSubtotal(subtotalSnapshot);
    try {
      if (val) {
        sessionStorage.setItem(SS_CONFIRMED, JSON.stringify({
          order: val,
          cart: cartSnapshot ?? [],
          subtotal: subtotalSnapshot ?? 0,
        }));
      } else {
        sessionStorage.removeItem(SS_CONFIRMED);
      }
    } catch { /* quota */ }
  }, [SS_CONFIRMED]);
  const [counterWaiting, setCounterWaitingRaw] = useState<{
    id: string; counterNumber: string;
  } | null>(null);
  const setCounterWaiting = useCallback((val: { id: string; counterNumber: string } | null) => {
    setCounterWaitingRaw(val);
    try {
      if (val) sessionStorage.setItem(SS_WAITING, JSON.stringify(val));
      else sessionStorage.removeItem(SS_WAITING);
    } catch { /* quota */ }
  }, [SS_WAITING]);

  // Restore persisted state from sessionStorage after hydration
  useEffect(() => {
    try {
      const cartRaw = sessionStorage.getItem(SS_CART);
      if (cartRaw) setCartRaw(JSON.parse(cartRaw) as CartItem[]);
    } catch { /* ignore */ }
    try {
      const waitingRaw = sessionStorage.getItem(SS_WAITING);
      if (waitingRaw) setCounterWaitingRaw(JSON.parse(waitingRaw));
    } catch { /* ignore */ }
    try {
      const confirmedRaw = sessionStorage.getItem(SS_CONFIRMED);
      if (confirmedRaw) {
        const parsed = JSON.parse(confirmedRaw) as {
          order: { id: string; number: string; paymentMethod: 'online' | 'counter' | 'no_payment'; tokenNumber?: string };
          cart: CartItem[];
          subtotal: number;
        };
        setConfirmedOrderRaw(parsed.order);
        setConfirmedCart(parsed.cart);
        setConfirmedSubtotal(parsed.subtotal);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cartItemCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartSubtotal  = Math.round(cart.reduce((sum, i) => sum + i.price * i.qty, 0) * 100) / 100;

  const addToCart = useCallback((product: MenuProduct, qty: number, variantSize?: string, priceOverride?: number) => {
    const variants = Array.isArray(product.metadata?.variants)
      ? (product.metadata!.variants as { size: string; price: number | string }[])
      : [];
    const basePrice = variantSize
      ? Number(variants.find(v => v.size === variantSize)?.price ?? product.selling_price)
      : product.selling_price;
    const price = priceOverride ?? basePrice;

    setCart(prev => {
      const key = `${product.id}-${variantSize ?? ''}`;
      const existing = prev.find(i => `${i.id}-${i.variantSize ?? ''}` === key);
      if (existing) {
        return prev.map(i =>
          `${i.id}-${i.variantSize ?? ''}` === key
            ? { ...i, price, qty: Math.min(99, i.qty + qty) } : i,
        );
      }
      return [...prev, { id: product.id, name: product.name, price, qty, image_url: product.image_url, variantSize, food_type: product.food_type }];
    });
  }, []);

  const updateQty = useCallback((id: string, variantSize: string | undefined, delta: number) => {
    setCart(prev => prev.map(i =>
      i.id === id && i.variantSize === variantSize
        ? { ...i, qty: Math.min(99, Math.max(1, i.qty + delta)) } : i,
    ));
  }, []);

  const removeFromCart = useCallback((id: string, variantSize: string | undefined) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.variantSize === variantSize)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    try { sessionStorage.removeItem(SS_CART); } catch { /* quota */ }
  }, [setCart, SS_CART]);

  // ── EDIT MODE ─────────────────────────────────────────────────────────────
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const editingCartItemRef = useRef<CartItem | null>(null);

  const replaceInCart = useCallback((
    oldItem: CartItem,
    product: MenuProduct,
    qty: number,
    variantSize?: string,
    priceOverride?: number,
  ) => {
    const variants = Array.isArray(product.metadata?.variants)
      ? (product.metadata!.variants as { size: string; price: number | string }[]) : [];
    const basePrice = variantSize
      ? Number(variants.find(v => v.size === variantSize)?.price ?? product.selling_price)
      : product.selling_price;
    const price = priceOverride ?? basePrice;
    setCart(prev => {
      const oldKey = `${oldItem.id}-${oldItem.variantSize ?? ''}`;
      const newKey = `${product.id}-${variantSize ?? ''}`;
      const filtered = prev.filter(i => `${i.id}-${i.variantSize ?? ''}` !== oldKey);
      const existing = filtered.find(i => `${i.id}-${i.variantSize ?? ''}` === newKey);
      if (existing) {
        return filtered.map(i =>
          `${i.id}-${i.variantSize ?? ''}` === newKey
            ? { ...i, price, qty: Math.min(99, i.qty + qty) } : i,
        );
      }
      return [...filtered, { id: product.id, name: product.name, price, qty, image_url: product.image_url, variantSize, food_type: product.food_type }];
    });
  }, []);

  // Memoized derived data
  const categories = useMemo(
    () => Array.from(new Set(menuProducts.map(p => p.category).filter(Boolean) as string[])),
    [menuProducts],
  );

  const visibleBanners = useMemo(
    () => banners.filter(b => b.image_url),
    [banners],
  );

  /**
   * Sold-out items sink to the bottom of their own category.
   *
   * They stay on the menu — a diner who came in for ghee roast needs to know
   * it is finished today rather than gone from the menu — but they must not
   * interrupt the scan of what can actually be ordered. Stable within each
   * group, so the owner's display_order still decides everything else.
   */
  const sinkSoldOut = (list: MenuProduct[]) => {
    const available: MenuProduct[] = [];
    const soldOut: MenuProduct[] = [];
    for (const p of list) (p.is_live === false ? soldOut : available).push(p);
    return [...available, ...soldOut];
  };

  const sections = useMemo(() => {
    if (listCategory !== 'All') {
      return [{
        category: listCategory,
        products: sinkSoldOut(menuProducts.filter(p => p.category === listCategory)),
      }];
    }
    const map = new Map<string, MenuProduct[]>();
    for (const p of menuProducts) {
      const cat = p.category ?? 'Other';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries()).map(([category, products]) => ({
      category,
      products: sinkSoldOut(products),
    }));
  }, [menuProducts, listCategory]);

  /**
   * Ids of the cards filling the first screen.
   *
   * Their photos load eagerly; everything below stays lazy. `loading="lazy"`
   * was previously on every thumb, which deferred exactly the images the
   * reader opens the menu looking at — on a phone that reads as "the pictures
   * never loaded". Counted across categories because the first section can be
   * shorter than one screen.
   */
  const eagerImageIds = useMemo(() => {
    const ids = new Set<string>();
    let seen = 0;
    for (const section of sections) {
      for (const p of section.products) {
        if (seen >= 5) return ids;
        ids.add(p.id);
        seen += 1;
      }
    }
    return ids;
  }, [sections]);

  // Back-navigation: push a history entry for each overlay
  const openProduct = useCallback((p: MenuProduct) => {
    window.history.pushState({ qrSheet: 'product' }, '');
    setActiveProduct(p);
    setProductOpen(true);
  }, []);
  const openProductForEdit = (p: MenuProduct, item: CartItem) => {
    editingCartItemRef.current = item;
    setEditingCartItem(item);
    setCartOpen(false);
    setActiveProduct(p); // no history push — edit mode manages its own close
    setProductOpen(true);
  };
  const openSearch = () => {
    window.history.pushState({ qrSheet: 'search' }, '');
    setSearchOpen(true);
  };
  const closeProduct = () => {
    if (editingCartItemRef.current) {
      // Edit mode: return to cart regardless
      editingCartItemRef.current = null;
      setEditingCartItem(null);
      setActiveProduct(null);
      setProductOpen(false);
      setCartOpen(true);
      return;
    }
    // Start the slide. The sheet stays mounted — and the page scroll-locked —
    // until it has gone (onProductExited). It used to unmount here, which is
    // why it vanished in a single frame. A rapid second tap cannot re-trigger
    // anything: the sliding sheet stops taking pointer events at once.
    // history.back() cleans up the entry we pushed on open.
    setProductOpen(false);
    if (window.history.state?.qrSheet === 'product') window.history.back();
  };
  const onProductExited = useCallback(() => setActiveProduct(null), []);
  const closeSearch = () => {
    if (window.history.state?.qrSheet === 'search') window.history.back();
    else setSearchOpen(false);
  };

  useEffect(() => {
    const onPop = () => {
      // Back (Android's button included) slides the sheet away like × does.
      const sheet = window.history.state?.qrSheet;
      if (sheet === 'product') setProductOpen(false);
      else if (sheet === 'search') setSearchOpen(false);
      else { setProductOpen(false); setSearchOpen(false); }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  /**
   * Row 5 — switch category.
   *
   *   1. The chip changes on the tap: `activeCategory` alone, a cheap render
   *      (the list below is memoised on `listCategory`).
   *   2. The old list fades out over LIST_OUT_MS.
   *   3. Then the list swaps and remounts, and its first screenful rises in.
   *
   * A reader scrolled down into the old list is smooth-scrolled back to the
   * top of the new one, by the browser — no scroll library. Under reduced
   * motion the list swaps at once and only fades.
   */
  const swapList = useCallback(() => {
    if (listSwapTimer.current !== null) window.clearTimeout(listSwapTimer.current);
    listSwapTimer.current = null;
    const cat = pendingCategory.current;
    if (cat === null) return;
    pendingCategory.current = null;
    setHeldListHeight(listRef.current?.offsetHeight ?? null);
    setListLimit(ENTER_COUNT);
    setListCategory(cat);
    setListEpoch(e => e + 1);
    setListPhase('idle');
  }, []);

  const selectCategory = (cat: string) => {
    if (cat === activeCategory) return;
    setActiveCategory(cat);

    const list = listRef.current;
    if (list) {
      const stuck = (headerRef.current?.getBoundingClientRect().height ?? 0)
        + (barRef.current?.getBoundingClientRect().height ?? 0);
      const top = Math.max(0, Math.round(list.getBoundingClientRect().top + window.scrollY - stuck));
      if (window.scrollY > top + 1) window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }

    pendingCategory.current = cat;
    if (listSwapTimer.current !== null) window.clearTimeout(listSwapTimer.current);
    if (reduceMotion) { swapList(); return; }
    setListPhase('out');
    // The swap waits for the fade-out to actually finish (onTransitionEnd on
    // the list). Timing it from the tap cut the fade short whenever the phone
    // was busy for the first frame. This timer is only a backstop for a
    // transition that never runs.
    listSwapTimer.current = window.setTimeout(swapList, LIST_OUT_MS + 150);
  };
  useEffect(() => () => {
    if (listSwapTimer.current !== null) window.clearTimeout(listSwapTimer.current);
  }, []);

  // Once the first screenful of a switched list has painted, render the rest.
  useEffect(() => {
    if (listLimit === Number.POSITIVE_INFINITY) return;
    const frame = window.requestAnimationFrame(() => startTransition(() => {
      setListLimit(Number.POSITIVE_INFINITY);
      setHeldListHeight(null);
    }));
    return () => window.cancelAnimationFrame(frame);
  }, [listLimit, listEpoch]);

  // Row 6 — the selected chip slides to the middle of the row. Not on first
  // render: "All" is already where it belongs.
  const chipsCentred = useRef(false);
  useEffect(() => {
    if (!chipsCentred.current) { chipsCentred.current = true; return; }
    const row = chipRowRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-chip-index="${['All', ...categories].indexOf(activeCategory)}"]`);
    if (!row || !chip) return;
    const rowBox = row.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    const left = centeredScrollLeft({
      chipLeft: chipBox.left - rowBox.left + row.scrollLeft,
      chipWidth: chipBox.width,
      rowWidth: row.clientWidth,
      scrollWidth: row.scrollWidth,
    });
    row.scrollTo({ left, behavior: reduceMotion ? 'auto' : 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  /**
   * The list, memoised on what it shows. A chip tap re-renders the template
   * to recolour one chip; without this it re-rendered every card too, and the
   * chip waited on that.
   */
  const listBody = useMemo(() => {
    const firstIndex: number[] = [];
    let running = 0;
    for (const s of sections) { firstIndex.push(running); running += s.products.length; }
    // Only after the reader switches, and only the first screenful (ENTER_COUNT).
    const entering = (g: number) => listEpoch > 0 && g < ENTER_COUNT;
    const enterDelay = (g: number) => (entering(g)
      ? ({ '--qr-enter-delay': `${listEnterDelayMs(g)}ms` } as React.CSSProperties)
      : undefined);
    return sections.map(({ category, products: all }, sectionIndex) => {
      const first = firstIndex[sectionIndex];
      if (first >= listLimit) return null;
      const products = all.slice(0, listLimit - first);
      return (
      <div key={category} className="qr-section" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: 0, gap: 10, width: '100%',
      }}>
        <div
          className={entering(first) ? 'qr-section-hdr qr-enter' : 'qr-section-hdr'}
          style={enterDelay(first)}
        >
          <span style={{
            fontFamily: TV.fontDisplay,
            fontWeight: TV.sectionWeight as unknown as number,
            fontSize: TV.sectionSize,
            letterSpacing: TV.sectionTracking,
            textTransform: TV.sectionTransform as React.CSSProperties['textTransform'],
            lineHeight: '24px', color: T.dark,
          }}>{category}</span>
        </div>

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
          gap: TV.listGap,
          width: '100%', padding: '0 16px',
        }}>
          {products.map((p, pos) => {
            const desc = hasRealVariants(p.metadata) ? getVariantDishDesc(p.description) : p.description;
            const cartQty = cart.filter(i => i.id === p.id).reduce((s, i) => s + i.qty, 0);
            const hasVariants = Array.isArray(p.metadata?.variants) && (p.metadata!.variants as unknown[]).length > 0;

            // The ADD control is passed in as a slot so MenuItemCard can
            // stay presentational and shared with the search results,
            // which have no cart at all.
            const action = !canOrder ? null : (cartQty > 0 ? (
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: 84, height: 28, borderRadius: 14,
                  background: T.pink, boxShadow: '0px 4px 10px rgba(239,89,161,0.45)',
                }}
              >
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (hasVariants) { openProduct(p); return; }
                    if (cartQty > 1) { updateQty(p.id, undefined, -1); } else { removeFromCart(p.id, undefined); }
                  }}
                  aria-label={`Remove one ${p.name}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </button>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 13, color: '#FFFFFF' }}>{cartQty}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    if (hasVariants) { openProduct(p); } else { addToCart(p, 1); }
                  }}
                  aria-label={`Add another ${p.name}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 8px', display: 'flex', alignItems: 'center' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            ) : (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (hasVariants) { openProduct(p); } else { addToCart(p, 1); }
                }}
                aria-label={`Add ${p.name} to cart`}
                style={{
                  width: 72, height: 28, borderRadius: 14,
                  border: `1px solid ${T.pink}`, background: T.white, color: T.pink,
                  fontFamily: "'Manrope',sans-serif", fontWeight: 700, fontSize: 12, lineHeight: '12px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0px 2px 6px rgba(0,0,0,0.12)',
                }}
              >ADD</button>
            ));

            return (
              <MenuItemCard
                key={p.id}
                product={p}
                description={desc}
                currencyCode={currencyCode}
                onSelect={() => openProduct(p)}
                soldOut={p.is_live === false}
                priority={eagerImageIds.has(p.id)}
                enterIndex={entering(first + pos) ? first + pos : undefined}
                action={p.is_live === false ? null : action}
              />
            );
          })}
        </div>
      </div>
      );
    });
  }, [sections, listEpoch, listLimit, cart, canOrder, currencyCode, eagerImageIds, openProduct, addToCart, updateQty, removeFromCart]);

  // The theme's custom properties are applied on the OUTERMOST element, not
  // on .qr-wrap alone. Every overlay — search, the detail sheet, and the
  // frozen ordering screens — is a SIBLING of the shell, and custom
  // properties inherit through the DOM, so vars set on the shell never
  // reached them: every TV.* silently fell back to its Classic default. That
  // is how a black-branded store rendered a pink search overlay from the very
  // same MenuItemCard as its black main list.
  //
  // themeCssVars returns ONLY custom properties, so this wrapper paints
  // nothing of its own. The shell keeps its copy: brandColorInjection.test.ts
  // asserts that exact attribute, and a second application is harmless.
  return (
    <div style={themeVars}>
      {/* Injected via dangerouslySetInnerHTML rather than as a JSX child.
          React escapes quotes and apostrophes inside a text child differently
          on the server than on the client, so attribute selectors like
          [data-offer="true"] produced a hydration mismatch warning. CSS is not
          user input here, so this is the standard way to ship it. */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes qrFadeIn  { from{opacity:0} to{opacity:1} }
        /* Detail sheet open (MenuSheet). translateY(100%) over 320ms on the
           settle curve — fast departure, long settle, no overshoot: a panel
           carrying a food photo should not bounce. The fill is BACKWARDS
           only, so once it lands a drag or the close slide owns transform. */
        @keyframes qrSheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .qr-sheet { animation:qrSheetUp 320ms cubic-bezier(0.32, 0.72, 0, 1) backwards; }
        /* The overlay is its own layer so only its opacity moves: 0 → 50%
           black over 200ms. */
        .qr-backdrop {
          position:absolute; inset:0; background:rgba(0,0,0,0.5);
          animation:qrFadeIn 200ms cubic-bezier(0, 0, 0.2, 1) backwards;
        }
        /* The photo sheet's ×, riding up with the sheet, fades in over 120ms. */
        .qr-sheet-x { animation:qrFadeIn 120ms cubic-bezier(0, 0, 0.2, 1) backwards; }
        /* Reduced motion: the sheet fades in over 120ms instead of sliding. */
        @media (prefers-reduced-motion: reduce) {
          .qr-sheet { animation:qrFadeIn 120ms linear backwards; }
          .qr-backdrop { animation-duration:120ms; }
        }
        @keyframes qrCartIn  { from{transform:translate(-50%,80px);opacity:0} to{transform:translate(-50%,0);opacity:1} }
        /* No blue tap flash on Android — on the shell AND on the sheets and
           overlays, which render as its siblings. */
        .qr-wrap, .qr-wrap *, .qr-wrap ~ *, .qr-wrap ~ * * { -webkit-tap-highlight-color:transparent; }
        .qr-shell { background: var(--qr-surface, #FAFAFA); }
        .qr-wrap * { box-sizing:border-box; }
        .qr-wrap *::-webkit-scrollbar { display:none; }
        .qr-wrap * { scrollbar-width:none; }
        .qr-shell { width:100%; min-height:100dvh; background:${T.white}; display:flex; flex-direction:column; }
        /* Cards. Press feedback (98% + a darker overlay) lives in
           MENU_MOTION_CSS and is driven by pressFeedback, not :active. */
        .qr-card-press { cursor:pointer; }
        .qr-card:focus-visible { outline:2px solid ${T.pink}; outline-offset:2px; }
        /* A sold-out row is inert: no pointer, no lift, no press. The card
           carries data-soldout so this cannot drift from the component. */
        .qr-card[data-soldout="true"] { cursor:default; }
        .qr-section-hdr { display:flex; flex-direction:row; justify-content:space-between; align-items:center; padding:0px 10px 0px 16px; width:100%; height:24px; }
        ${MENU_MOTION_CSS}
      ` }} />

      <div className="qr-wrap qr-shell" style={themeVars}>

        {/* ── STICKY HEADER ── */}
        <header ref={headerRef} style={{
          background: T.white, borderBottom: `1px solid ${T.border}`,
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          {/* My Orders — only meaningful when the plan allows ordering. On the
              view-only QR menu plan there are no orders, so we render a 36×36
              spacer instead to keep the brand centred under space-between. */}
          {canOrder ? (
            <button
              aria-label="My orders"
              onClick={() => { setTodayOrders(getTodayOrders()); setMyOrdersOpen(true); }}
              style={{ position: 'relative', width: 36, height: 36, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.dark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="M9 12h6M9 16h4"/>
              </svg>
              {todayOrders.length > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: '50%', background: T.pink, border: `2px solid ${T.white}` }} />
              )}
            </button>
          ) : (
            <div aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0 }} />
          )}

          {/* flex: 1 + minWidth: 0 let the name take the space between the two
              36px buttons and wrap inside it, instead of pushing them out. */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flex: 1, minWidth: 0, padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
              {/* The shop name stands alone. 052 already conceded that most
                  stores have no logo and that the header must read as finished
                  without one — 054 makes that the only case. */}
              {/* The shop name is this page's <h1>. It was a <span>, which left
                  every customer-facing menu — the most-visited page in the
                  product — with no top-level heading at all: screen readers had
                  no page title to announce, and search engines no primary
                  heading. `margin: 0` keeps the browser's default h1 margin from
                  shifting the header.
                  Size steps down with the name's length (see shopNameStyle.ts);
                  a long name wraps into two centred, balanced lines and is
                  clamped there, so it never grows into a ragged block. */}
              <h1 title={shopName} style={{
                fontFamily: TV.fontDisplay, fontWeight: 700,
                fontSize: shopNameFontSize(shopName), lineHeight: 1.15,
                color: TV.accent, letterSpacing: '0.02em', textTransform: 'uppercase',
                textAlign: 'center', textWrap: 'balance', overflowWrap: 'anywhere',
                display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
                overflow: 'hidden',
                margin: 0,
              }}>{shopName}</h1>
            </div>
            {shopTagline && (
              <span style={{
                fontFamily: "'Manrope',sans-serif", fontWeight: 400, fontSize: 11,
                color: T.descColor, letterSpacing: '0.01em',
              }}>{shopTagline}</span>
            )}
          </div>

          <button
            aria-label="Search menu"
            onClick={openSearch}
            style={{
              width: 36, height: 36, border: 'none', background: 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={T.dark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </header>

        {/* ── BANNER ── */}
        {visibleBanners.length > 0 && (
          <BannerCarousel
            banners={visibleBanners}
            paused={!!activeProduct || searchOpen}
            reduceMotion={reduceMotion}
          />
        )}

        {/* ── CATEGORY CHIPS + REQUEST BILL ── */}
        {(categories.length > 0 || (tier === 'order_no_pay' && tableNumber)) && (
          <div
            ref={barRef}
            data-testid="category-bar"
            data-pinned={chipsPinned ? 'true' : 'false'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 16px', background: T.white, minHeight: 60,
              // Sticky UNDER the header, which stays put at z-index 50. On the
              // way out the bar translates up by its own height and disappears
              // behind the header rather than over it.
              position: 'sticky', top: headerH, zIndex: 40,
              transform: chipsPinned ? 'translateY(0)' : 'translateY(-100%)',
              // Transform only: animating height would relayout the whole list
              // every frame on the cheap Androids most of our readers use.
              // In over 200ms ease-out, out over 180ms ease-in. Under reduced
              // motion it fades over 120ms and the move itself is instant
              // (after the fade on the way out, before it on the way in).
              opacity: reduceMotion && !chipsPinned ? 0 : 1,
              transition: reduceMotion
                ? (chipsPinned
                  ? `opacity ${REDUCED_FADE_MS}ms linear`
                  : `opacity ${REDUCED_FADE_MS}ms linear, transform 0ms linear ${REDUCED_FADE_MS}ms`)
                : (chipsPinned
                  ? `transform ${BAR_SHOW_MS}ms ${EASE_OUT}`
                  : `transform ${BAR_HIDE_MS}ms ${EASE_IN}`),
              willChange: 'transform',
            }}
          >
            {/* Category chips — scrollable */}
            <div ref={chipRowRef} style={{ flex: 1, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {['All', ...categories].map((cat, chipIndex) => {
                const on = cat === activeCategory;
                return (
                  <button key={cat} onClick={() => selectCategory(cat)} {...pressHandlers}
                    data-chip-index={chipIndex} className="qr-chip" style={{
                    flexShrink: 0,
                    display: 'flex', flexDirection: 'row', alignItems: 'center',
                    padding: '8px 12px', gap: 8,
                    height: 36, borderRadius: TV.chipRadius,
                    border: `0.65px solid ${on ? TV.accent : T.chipBorder}`,
                    background: on ? TV.accent : T.white,
                    color: on ? T.white : T.chipText,
                    fontFamily: TV.fontDisplay, fontWeight: 400, fontSize: 14,
                    lineHeight: '20px', letterSpacing: '-0.15px',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}>{cat}</button>
                );
              })}
            </div>

            {/* Request Bill — inline, right side of chip row */}
            {tier === 'order_no_pay' && tableNumber && (
              <button
                onClick={() => billReqState === 'idle' && setBillReqState('confirming')}
                disabled={billReqState === 'cooldown' || billReqState === 'sending' || billReqState === 'sent'}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 6,
                  height: 36, padding: '0 14px', borderRadius: 40,
                  border: billReqState === 'sent' || billReqState === 'cooldown'
                    ? '0.65px solid #86EFAC' : '0.65px solid #191919',
                  background: billReqState === 'sent' || billReqState === 'cooldown'
                    ? '#F0FDF4' : '#191919',
                  color: billReqState === 'sent' || billReqState === 'cooldown'
                    ? '#166534' : '#FFFFFF',
                  fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 13,
                  cursor: billReqState === 'idle' ? 'pointer' : 'default',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 14 }}>🧾</span>
                {billReqState === 'sent' || billReqState === 'cooldown' ? 'Bill Sent' : 'Request Bill'}
              </button>
            )}
          </div>
        )}

        {/* ── PRODUCT SECTIONS ── keyed by switch, so a new list mounts fresh
            and its first screenful rises in. */}
        <div
          key={listEpoch}
          ref={listRef}
          data-testid="menu-list"
          className="qr-list"
          data-phase={listPhase}
          onTransitionEnd={e => {
            if (e.target === e.currentTarget && e.propertyName === 'opacity') swapList();
          }}
          style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: 20,
          minHeight: heldListHeight ?? undefined,
          // Reserve space for the floating cart bar (64px) + 14px float margin + safe-area, plus a touch of breathing room
          paddingBottom: canOrder && cartItemCount > 0 ? 'calc(110px + env(safe-area-inset-bottom, 0px))' : 24,
        }}>
          {listBody}

          {sections.length === 0 && (
            <div style={{ padding: '56px 16px', textAlign: 'center' }}>
              <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.lightGray }}>
                No items available right now.
              </p>
            </div>
          )}
        </div>

        {/* ── FOOTER ── */}
        <div style={{
          padding: '32px 16px 48px', background: T.white,
          borderTop: `1px solid ${T.border}`,
          position: 'relative', overflow: 'hidden',
        }}>
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 26,
            lineHeight: '37px', color: T.lightGray, margin: '0 0 8px', maxWidth: 256,
          }}>Fresh menu, always up to date</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 13.5S1.5 9.5 1.5 5.5A3.5 3.5 0 0 1 8 3.2 3.5 3.5 0 0 1 14.5 5.5C14.5 9.5 8 13.5 8 13.5Z" fill="#F9595F" />
            </svg>
            <span style={{
              fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 12,
              lineHeight: '16px', color: T.footerSub,
            }}>Crafted in தமிழ்நாடு</span>
          </div>
        </div>

      </div>

      {/* ── FLOATING CART BAR (original design — floats with edge margin) ── */}
      {canOrder && cartItemCount > 0 && !cartOpen && !checkoutOpen && !confirmedOrder && !counterWaiting && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 100,
          width: 'calc(100% - 28px)', maxWidth: 532, height: 70,
          background: 'linear-gradient(271.56deg, #FFFFFF 1.98%, #FFF6EB 99.55%)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px',
          boxShadow: '0 10px 26px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
          animation: 'qrCartIn 0.34s cubic-bezier(0.34,1.32,0.64,1)',
        }}>
          {/* Left: dish thumbnails + text */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Overlapping dish image circles */}
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: Math.min(cart.length, 3) * 20 + 12, height: 32, flexShrink: 0 }}>
              {cart.slice(0, 3).map((item, i) => (
                <div key={`${item.id}-${item.variantSize ?? ''}`} style={{
                  position: 'absolute', left: i * 20, top: 0,
                  width: 32, height: 32, borderRadius: 20,
                  background: T.white, border: '1px solid #EEEAFF',
                  overflow: 'hidden', zIndex: 3 - i,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i < 2 && item.image_url ? (
                    <img src={item.image_url} alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : i === 2 && cart.length > 3 ? (
                    <div style={{
                      width: '100%', height: '100%',
                      background: item.image_url
                        ? `linear-gradient(0deg, rgba(0,0,0,0.34), rgba(0,0,0,0.34)), url(${item.image_url}) center/cover`
                        : 'rgba(0,0,0,0.34)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                        fontSize: 12, lineHeight: '16px', color: '#FFFFFF',
                      }}>+{cart.length - 2}</span>
                    </div>
                  ) : item.image_url ? (
                    <img src={item.image_url} alt={item.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#F0F0F0' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Text: "X Dishes Added" */}
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 500,
              fontSize: 14, lineHeight: '21px', color: '#333333',
            }}>{cartItemCount} Dish{cartItemCount !== 1 ? 'es' : ''} Added</span>
          </div>

          {/* Right: View Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex', alignItems: 'center',
              height: 46, background: '#00A63E',
              border: 'none', borderRadius: 8, cursor: 'pointer',
              boxShadow: '0px 2px 6px rgba(0,166,62,0.30)',
              padding: '0 16px', gap: 12, flexShrink: 0,
            }}
          >
            {/* Price + Total label */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                fontSize: 14, lineHeight: '21px', color: '#FFFFFF',
              }}>{CURR}{cartSubtotal}</span>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                fontSize: 12, lineHeight: '18px', color: '#FFFFFF',
              }}>Total</span>
            </div>

            {/* Vertical divider */}
            <div style={{ width: 1, height: 34, background: '#FFFFFF', opacity: 0.5 }} />

            {/* View Cart text */}
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 400,
              fontSize: 14, lineHeight: '21px', color: '#FFFFFF',
              whiteSpace: 'nowrap',
            }}>View Cart</span>
          </button>
        </div>
      )}

      {/* ── SEARCH OVERLAY ── */}
      {searchOpen && (
        <SearchOverlay
          products={menuProducts}
          categories={categories}
          tier={tier}
          onClose={closeSearch}
          onSelectProduct={p => { openProduct(p); setSearchOpen(false); }}
          currencyCode={currencyCode}
        />
      )}

      {/* ── DETAIL SHEET ── */}
      {activeProduct && (
        <ProductDetailSheet
          key={activeProduct.id}
          product={activeProduct}
          open={productOpen}
          tier={tier}
          onClose={closeProduct}
          onExited={onProductExited}
          onAddToCart={addToCart}
          editingCartItem={editingCartItem}
          onReplaceCartItem={replaceInCart}
          currencyCode={currencyCode}
        />
      )}

      {/* ── CART SHEET ── */}
      {cartOpen && (
        <CartSheet
          items={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onAddMore={() => setCartOpen(false)}
          paymentMode={tier === 'order_no_pay' ? 'no_payment' : undefined}
          onlineEnabled={onlineEnabled}
          gstRatePct={gstRatePct}
          currencyCode={currencyCode}
          whatsappMode={!ORDERING_FROZEN && whatsappOrderTaking && tier === 'order_no_pay'}
          onCheckout={(pm) => { if (pm !== 'no_payment') setSelectedPaymentMethod(pm); setCartOpen(false); setCheckoutOpen(true); }}
          onEditItem={(item) => {
            const product = menuProducts.find(p => p.id === item.id);
            if (product) openProductForEdit(product, item);
          }}
        />
      )}

      {/* ── CHECKOUT SCREEN ── */}
      {checkoutOpen && (
        <CheckoutScreen
          items={cart}
          siteId={shopId}
          paymentMethod={effectivePaymentMethod}
          tableNumber={tableNumber}
          gstRatePct={gstRatePct}
          currencyCode={currencyCode}
          whatsappMode={!ORDERING_FROZEN && whatsappOrderTaking && tier === 'order_no_pay'}
          onClose={() => setCheckoutOpen(false)}
          onOrderPlaced={(id, number, pm, counterNumber, tokenNumber) => {
            setCheckoutOpen(false);
            if (pm === 'counter' && counterNumber) {
              setCounterWaiting({ id, counterNumber });
              saveOrder({ orderId: id, orderNumber: number, counterNumber, ts: Date.now() });
            } else {
              setConfirmedOrder({ id, number, paymentMethod: pm, tokenNumber }, cart, cartSubtotal);
              saveOrder({ orderId: id, orderNumber: number, tokenNumber, paymentMethod: pm, tableNumber, ts: Date.now() });
              setTodayOrders(getTodayOrders());
            }
          }}
        />
      )}

      {/* ── COUNTER WAITING SCREEN ── */}
      {counterWaiting && (
        <CounterWaitingScreen
          orderId={counterWaiting.id}
          counterNumber={counterWaiting.counterNumber}
          items={cart}
          subtotal={cartSubtotal}
          onTokenReceived={(tokenNumber) => {
            const waitingId = counterWaiting!.id;
            setCounterWaiting(null);
            setConfirmedOrder({ id: waitingId, number: tokenNumber, paymentMethod: 'counter', tokenNumber }, cart, cartSubtotal);
            saveOrder({ orderId: waitingId, orderNumber: tokenNumber, tokenNumber, ts: Date.now() });
            setTodayOrders(getTodayOrders());
          }}
          onCancel={() => { setCounterWaiting(null); clearCart(); }}
        />
      )}

      {/* ── ORDER CONFIRMED ── */}
      {confirmedOrder && (
        <OrderConfirmedScreen
          orderId={confirmedOrder.id}
          orderNumber={confirmedOrder.number}
          shopName={shopName}
          items={confirmedCart.length > 0 ? confirmedCart : cart}
          subtotal={confirmedSubtotal > 0 ? confirmedSubtotal : cartSubtotal}
          paymentMethod={confirmedOrder.paymentMethod}
          tokenNumber={confirmedOrder.tokenNumber}
          tableNumber={tableNumber}
          gstRatePct={gstRatePct}
          currencyCode={currencyCode}
          onDone={() => { clearCart(); setConfirmedOrder(null); }}
        />
      )}

      {/* ── MY ORDERS PANEL ── */}
      {myOrdersOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column' }}>
          {/* Backdrop */}
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} onClick={() => setMyOrdersOpen(false)} />
          {/* Sheet */}
          <div style={{ background: T.white, borderRadius: '20px 20px 0 0', padding: '0 0 32px', maxHeight: '75vh', overflowY: 'auto' }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
            </div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px' }}>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 17, color: T.dark }}>My Orders Today</span>
              <button onClick={() => setMyOrdersOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.lightGray} strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {todayOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={T.border} strokeWidth="1.8" strokeLinecap="round" style={{ marginBottom: 12 }}>
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                  <rect x="9" y="3" width="6" height="4" rx="1"/>
                  <path d="M9 12h6M9 16h4"/>
                </svg>
                <p style={{ margin: 0, fontSize: 14, color: T.descColor }}>No orders placed today</p>
              </div>
            ) : (
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todayOrders.map(o => {
                  const isNoPayment = o.paymentMethod === 'no_payment';
                  const displayId = isNoPayment
                    ? (o.tableNumber ? `Table ${o.tableNumber}` : (o.tokenNumber ?? `#${o.orderNumber}`))
                    : (o.tokenNumber ?? o.counterNumber ?? `#${o.orderNumber}`);
                  const isToken = !!o.tokenNumber && !isNoPayment;
                  const isCounter = !!o.counterNumber && !o.tokenNumber && !isNoPayment;
                  const timeStr = new Date(o.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                  return (
                    <a
                      key={o.orderId}
                      href={`/shop/${shopSlug}/order/${o.orderId}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: T.cardBg, borderRadius: 12, textDecoration: 'none' }}
                    >
                      <div>
                        <p style={{ margin: '0 0 3px', fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 20, color: T.pink, lineHeight: 1 }}>{displayId}</p>
                        <p style={{ margin: 0, fontSize: 12, color: T.descColor }}>
                          {isNoPayment ? 'Order placed · ' : isToken ? 'Token ready · ' : isCounter ? 'Awaiting payment · ' : 'Online · '}{timeStr}
                        </p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.descColor} strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── REQUEST BILL CONFIRMATION DIALOG ── */}
      {(billReqState === 'confirming' || billReqState === 'sending') && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setBillReqState('idle')}
        >
          <div
            style={{ background: '#FFFFFF', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: '28px 24px 40px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🧾</div>
              <p style={{ margin: '0 0 6px', fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 18, color: '#191919' }}>Request Bill?</p>
              <p style={{ margin: 0, fontSize: 14, color: '#808080' }}>Notify staff to bring the bill for Table {tableNumber}.</p>
            </div>
            <button
              onClick={async () => {
                setBillReqState('sending');
                try {
                  const res = await fetch('/api/bill-request', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ siteId: shopId, tableNumber }),
                  });
                  if (res.ok || res.status === 429) {
                    setBillReqState('sent');
                    setTimeout(() => setBillReqState('cooldown'), 8000);
                  } else {
                    setBillReqState('idle');
                  }
                } catch {
                  setBillReqState('idle');
                }
              }}
              disabled={billReqState === 'sending'}
              style={{
                width: '100%', height: 52, borderRadius: 12, border: 'none',
                background: '#191919', color: '#FFFFFF',
                fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
                cursor: 'pointer', marginBottom: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {billReqState === 'sending' ? (
                <Spinner size="md" tone="onBrand" />
              ) : 'Yes, call staff'}
            </button>
            <button
              onClick={() => setBillReqState('idle')}
              style={{ width: '100%', height: 44, borderRadius: 12, border: '1.5px solid #E6E6E6', background: '#FFFFFF', color: '#555555', fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 15, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
