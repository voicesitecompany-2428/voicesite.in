'use client';

import React, { useState } from 'react';
import type { CartItem } from './QRMenuTemplate';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  pink: '#EF59A1',
  dark: '#191919',
  border: '#E6E6E6',
  headerBorder: '#CCCCCC',
  white: '#FFFFFF',
  gray400: '#999999',
  gray600: '#666666',
  gray800: '#333333',
  gray900: '#191919',
  cardBg: '#FFFFFF',
  sectionBg: '#F8F9FD',
  vegGreen: '#00A63E',
  amber: '#B77320',
  clearRed: '#BE3F45',
  editRed: '#FB2C36',
  discountGreen: '#13801C',
  walletGreen: '#00A63E',
  black: '#000000',
};

// ── VEG DOT ───────────────────────────────────────────────────────────────────
function VegDot({ isVeg = true }: { isVeg?: boolean }) {
  const color = isVeg ? C.vegGreen : C.editRed;
  return (
    <div style={{
      width: 16, height: 16, flexShrink: 0,
      border: `0.65px solid ${color}`, borderRadius: 4,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 8, height: 8, borderRadius: 6, background: color }} />
    </div>
  );
}

// ── QUANTITY STEPPER ──────────────────────────────────────────────────────────
function QtyStepper({
  qty, onMinus, onPlus,
}: {
  qty: number;
  onMinus: () => void;
  onPlus: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      width: 89, height: 29,
      border: `1px solid ${C.amber}`, borderRadius: 4,
      background: C.white, flexShrink: 0,
    }}>
      <button
        onClick={onMinus}
        aria-label="Decrease"
        style={{
          flex: 1, height: '100%', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
          <path d="M1 1h10" stroke={C.amber} strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
      <span style={{
        fontFamily: "'Manrope',sans-serif", fontWeight: 800,
        fontSize: 15, lineHeight: '20px', textAlign: 'center',
        color: C.amber, minWidth: 20,
      }}>{qty}</span>
      <button
        onClick={onPlus}
        aria-label="Increase"
        style={{
          flex: 1, height: '100%', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke={C.amber} strokeWidth="1.25" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

// ── MAIN CART SHEET ──────────────────────────────────────────────────────────
interface CartSheetProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (id: string, variantSize: string | undefined, delta: number) => void;
  onRemove: (id: string, variantSize: string | undefined) => void;
  onCheckout: (paymentMethod: 'online' | 'counter') => void;
  onEditItem?: (item: CartItem) => void;
}

export default function CartSheet({ items, onClose, onUpdateQty, onRemove, onCheckout, onEditItem }: CartSheetProps) {
  const [couponExpanded, setCouponExpanded] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'counter'>('counter');
  const [payPickerOpen, setPayPickerOpen] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const serviceCharge = 0; // Can be dynamic later
  const orderTotal = subtotal + serviceCharge;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your cart"
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: C.white,
        display: 'flex', flexDirection: 'column',
        animation: 'qrFadeIn 0.15s ease',
        maxWidth: 560, margin: '0 auto',
      }}
    >

      {/* ── HEADER ── */}
      <div style={{
        width: '100%', height: 54, flexShrink: 0,
        background: C.white, borderBottom: `1px solid ${C.headerBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onClose}
            aria-label="Go back"
            style={{
              width: 24, height: 24, background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={C.gray900} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span style={{
            fontFamily: "'Manrope',sans-serif", fontWeight: 700,
            fontSize: 18, lineHeight: '25px', color: C.gray800,
          }}>My Cart</span>
        </div>
        <button
          onClick={() => {
            items.forEach(item => onRemove(item.id, item.variantSize));
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontFamily: "'Manrope',sans-serif", fontWeight: 600,
            fontSize: 14, lineHeight: '19px', color: C.clearRed,
          }}
        >Clear All</button>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {items.length === 0 ? (
          <div style={{ paddingTop: 80, textAlign: 'center' }}>
            <p style={{
              fontFamily: "'Manrope',sans-serif", fontSize: 16,
              color: '#C5C5C5', fontWeight: 500,
            }}>Your cart is empty</p>
          </div>
        ) : (
          <>
            {/* ── BASKET HEADER ── */}
            <div style={{ padding: '20px 16px 12px' }}>
              <span style={{
                fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                fontSize: 16, lineHeight: '22px', color: C.black,
              }}>On your Basket ({items.length} item{items.length !== 1 ? 's' : ''})</span>
            </div>

            {/* ── CART ITEMS ── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {items.map(item => (
                <div
                  key={`${item.id}-${item.variantSize ?? ''}`}
                  style={{
                    padding: '14px 16px',
                    borderBottom: `1px solid ${C.border}`,
                    background: C.white,
                  }}
                >
                  {/* Row: Veg dot + content + stepper */}
                  <div style={{
                    display: 'flex', flexDirection: 'row',
                    alignItems: 'flex-start', gap: 8,
                  }}>
                    <VegDot />

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* Name row + Stepper */}
                      <div style={{
                        display: 'flex', flexDirection: 'row',
                        justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      }}>
                        <span style={{
                          fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                          fontSize: 12, lineHeight: '16px', color: C.gray800,
                          flex: 1, minWidth: 0,
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        } as React.CSSProperties}>
                          {item.name}
                          {item.variantSize && (
                            <><br />{item.variantSize}</>
                          )}
                        </span>
                        <QtyStepper
                          qty={item.qty}
                          onMinus={() =>
                            item.qty === 1
                              ? onRemove(item.id, item.variantSize)
                              : onUpdateQty(item.id, item.variantSize, -1)
                          }
                          onPlus={() => onUpdateQty(item.id, item.variantSize, 1)}
                        />
                      </div>

                      {/* Variant label + Price row */}
                      <div style={{
                        display: 'flex', flexDirection: 'row',
                        justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                          {item.variantSize && (
                            <span style={{
                              fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                              fontSize: 12, lineHeight: '16px', letterSpacing: '-0.15px',
                              color: C.gray400,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{item.variantSize}</span>
                          )}
                        </div>
                        <div style={{
                          display: 'flex', alignItems: 'center',
                          justifyContent: 'flex-end', gap: 6,
                        }}>
                          <span style={{
                            fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                            fontSize: 16, lineHeight: '22px', color: C.gray800,
                            textAlign: 'right',
                          }}>₹{item.price * item.qty}</span>
                        </div>
                      </div>

                      {/* Edit link — only for variant items */}
                      {item.variantSize && onEditItem && (
                        <button
                          onClick={() => { onEditItem(item); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0, display: 'flex', alignItems: 'center', gap: 2,
                          }}
                        >
                          <span style={{
                            fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                            fontSize: 12, lineHeight: '16px', color: C.editRed,
                          }}>Edit</span>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke={C.editRed} strokeWidth="1"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── COUPONS SECTION ── */}
            <div style={{ padding: '24px 16px 0' }}>
              <button
                onClick={() => setCouponExpanded(!couponExpanded)}
                style={{
                  width: '100%', padding: 12,
                  background: C.sectionBg, borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: 2,
                }}
              >
                <div style={{
                  display: 'flex', flexDirection: 'row',
                  justifyContent: 'space-between', alignItems: 'center',
                  width: '100%',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Coupon icon */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58s1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" fill={C.black} />
                    </svg>
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                      fontSize: 14, lineHeight: '19px', color: C.gray900,
                    }}>View all coupons</span>
                  </div>
                  <svg
                    width="24" height="24" viewBox="0 0 24 24" fill="none"
                    style={{
                      transform: couponExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    <path d="M6 9l6 6 6-6" stroke="#4C4C4C" strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                  fontSize: 10, lineHeight: '14px', color: '#0066FF',
                  textAlign: 'left',
                }}>You saved ₹45 on Total Bill</span>
              </button>
            </div>

            {/* ── ORDER DETAILS ── */}
            <div style={{ padding: '24px 16px 0' }}>
              <div style={{
                background: C.sectionBg, borderRadius: '8px 8px 0 0',
                overflow: 'hidden',
              }}>
                {/* Title + divider */}
                <div style={{ padding: '16px 16px 0' }}>
                  <span style={{
                    fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                    fontSize: 16, lineHeight: '22px', color: C.gray900,
                  }}>Order Details</span>
                  <div style={{
                    width: '100%', height: 1,
                    background: C.border, marginTop: 16,
                  }} />
                </div>

                {/* Line items */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Item total */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                      fontSize: 14, lineHeight: '24px', letterSpacing: '-0.31px',
                      color: C.black,
                    }}>Item total</span>
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                      fontSize: 14, lineHeight: '24px', letterSpacing: '-0.31px',
                      color: C.black,
                    }}>₹ {subtotal}</span>
                  </div>

                  {/* Service Charge */}
                  {serviceCharge > 0 && (
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <span style={{
                        fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                        fontSize: 14, lineHeight: '24px', letterSpacing: '-0.31px',
                        color: C.black,
                      }}>Service Charge</span>
                      <span style={{
                        fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                        fontSize: 14, lineHeight: '24px', letterSpacing: '-0.31px',
                        color: C.black,
                      }}>₹ {serviceCharge}</span>
                    </div>
                  )}

                  {/* Order total */}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                      fontSize: 14, lineHeight: '24px', letterSpacing: '-0.31px',
                      color: C.black,
                    }}>Order total</span>
                    <span style={{
                      fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                      fontSize: 14, lineHeight: '24px', letterSpacing: '-0.31px',
                      color: C.black,
                    }}>₹ {orderTotal}</span>
                  </div>
                </div>

                {/* Amount Payable bar */}
                <div style={{
                  padding: '16px 12px',
                  background: C.pink, borderRadius: '0 0 8px 8px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <span style={{
                    fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                    fontSize: 16, lineHeight: '22px', color: C.white,
                  }}>Amount Payable</span>
                  <span style={{
                    fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                    fontSize: 16, lineHeight: '22px', letterSpacing: '0.016em',
                    color: C.white, textAlign: 'right',
                  }}>₹{orderTotal}</span>
                </div>
              </div>
            </div>

            {/* Spacer for bottom bar */}
            <div style={{ height: 100 }} />
          </>
        )}
      </div>

      {/* ── PAYMENT PICKER OVERLAY ── */}
      {payPickerOpen && (
        <div
          onClick={() => setPayPickerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 250,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 560,
              background: C.white, borderRadius: '16px 16px 0 0',
              padding: '20px 16px 32px',
              animation: 'qrSlideUp 0.25s cubic-bezier(0.34,1.2,0.64,1)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 100, background: C.border }} />
            </div>
            <p style={{
              fontFamily: "'Manrope',sans-serif", fontWeight: 700,
              fontSize: 16, lineHeight: '22px', color: C.gray900,
              margin: '0 0 16px',
            }}>Choose Payment Method</p>

            {/* Option: Pay Online */}
            <button
              onClick={() => { setPaymentMethod('online'); setPayPickerOpen(false); }}
              style={{
                width: '100%', padding: '14px 12px',
                border: `1.5px solid ${paymentMethod === 'online' ? C.pink : C.border}`,
                borderRadius: 8, background: paymentMethod === 'online' ? '#FFF0F7' : C.white,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                marginBottom: 10,
              }}
            >
              {/* Radio circle */}
              <div style={{
                width: 20, height: 20, borderRadius: 20,
                border: `2px solid ${paymentMethod === 'online' ? C.pink : '#CCCCCC'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {paymentMethod === 'online' && (
                  <div style={{ width: 10, height: 10, borderRadius: 10, background: C.pink }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                  fontSize: 14, lineHeight: '19px', color: C.gray800,
                }}>Pay Online</span>
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 400,
                  fontSize: 11, lineHeight: '15px', color: C.gray400,
                }}>Google Pay, PhonePe, UPI & more</span>
              </div>
            </button>

            {/* Option: Pay on Counter */}
            <button
              onClick={() => { setPaymentMethod('counter'); setPayPickerOpen(false); }}
              style={{
                width: '100%', padding: '14px 12px',
                border: `1.5px solid ${paymentMethod === 'counter' ? C.pink : C.border}`,
                borderRadius: 8, background: paymentMethod === 'counter' ? '#FFF0F7' : C.white,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
              }}
            >
              {/* Radio circle */}
              <div style={{
                width: 20, height: 20, borderRadius: 20,
                border: `2px solid ${paymentMethod === 'counter' ? C.pink : '#CCCCCC'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {paymentMethod === 'counter' && (
                  <div style={{ width: 10, height: 10, borderRadius: 10, background: C.pink }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                  fontSize: 14, lineHeight: '19px', color: C.gray800,
                }}>Pay on Counter</span>
                <span style={{
                  fontFamily: "'Manrope',sans-serif", fontWeight: 400,
                  fontSize: 11, lineHeight: '15px', color: C.gray400,
                }}>Pay cash or card at the counter after ordering</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM CHECKOUT BAR ── */}
      {items.length > 0 && (
        <div style={{
          width: '100%', flexShrink: 0,
          background: C.white, border: `1px solid ${C.border}`,
          boxShadow: '0px -3px 3px 1px rgba(223,223,224,0.22)',
          borderRadius: '16px 16px 0 0',
          padding: '16px 13px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Payment method selector (left) — tappable */}
          <button
            onClick={() => setPayPickerOpen(true)}
            style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {paymentMethod === 'online' ? (
                <>
                  <span style={{
                    fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                    fontSize: 10, lineHeight: '14px', color: C.gray600,
                  }}>PAY USING</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    style={{ transform: 'rotate(180deg)' }}>
                    <path d="M6 9l6 6 6-6" stroke={C.gray600} strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              ) : (
                <>
                  <span style={{
                    fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                    fontSize: 10, lineHeight: '14px', color: C.gray600,
                  }}>After Pay</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M10 21V17a2 2 0 012-2h0a2 2 0 012 2v4"
                      stroke={C.gray600} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M1 7l11-4 11 4" stroke={C.gray600} strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </div>
            <span style={{
              fontFamily: "'Manrope',sans-serif", fontWeight: 600,
              fontSize: 12, lineHeight: '16px', color: C.gray800,
            }}>{paymentMethod === 'online' ? 'Google Pay UPI' : 'Pay on Counter'}</span>
          </button>

          {/* Checkout button (right) */}
          <button
            onClick={() => onCheckout(paymentMethod)}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '9px 12px', gap: 0,
              background: C.pink, borderRadius: 6,
              border: 'none', cursor: 'pointer',
              height: 53, width: 195,
            }}
          >
            {/* Price + Total */}
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              marginRight: 'auto',
            }}>
              <span style={{
                fontFamily: "'Manrope',sans-serif", fontWeight: 700,
                fontSize: 14, lineHeight: '19px', color: C.white,
              }}>₹{orderTotal}</span>
              <span style={{
                fontFamily: "'Manrope',sans-serif", fontWeight: 400,
                fontSize: 12, lineHeight: '16px', color: C.white,
              }}>Total</span>
            </div>

            {/* CTA text + icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: "'Manrope',sans-serif", fontWeight: 500,
                fontSize: 14, lineHeight: '19px', color: C.white,
                whiteSpace: 'nowrap',
              }}>{paymentMethod === 'online' ? 'Place Order' : 'Check out'}</span>
              {paymentMethod === 'online' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke={C.white} strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 1.5l9 5.5-9 5.5V1.5z" fill={C.white} />
                </svg>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
