'use client';

import React, { useEffect, useState, useMemo } from 'react';
import type { CartItem } from './QRMenuTemplate';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  white: '#FFFFFF',
  dark: '#171717',
  gray500: '#525252',
  gray400: '#737373',
  border: '#E5E5E5',
  green: '#00A63E',
  greenBg: '#F0FDF4',
  tokenBorder: '#FFE2BD',
  pink: '#EF59A1',
  barcodeBg: '#FAFAFA',
  stepBg: '#171717',
  cardBg: '#F5F5F5',
};

interface OrderConfirmedScreenProps {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  paymentMethod: 'online' | 'counter';
  onDone: () => void;
}

// Generate a short token from order number
function generateToken(orderNumber: string): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${letter}${orderNumber.slice(-4)}`;
}

export default function OrderConfirmedScreen({
  orderNumber, items, subtotal, onDone,
}: OrderConfirmedScreenProps) {
  const [phase, setPhase] = useState<'success' | 'details'>('success');

  const token = useMemo(() => generateToken(orderNumber), [orderNumber]);
  const orderTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  }, []);

  // Phase 1: show success for 2.5 seconds, then switch to details
  useEffect(() => {
    if (phase === 'success') {
      const timer = setTimeout(() => setPhase('details'), 2500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ── PHASE 1: SUCCESS ANIMATION ──
  if (phase === 'success') {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: C.white,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          maxWidth: 560, margin: '0 auto',
        }}
      >
        <style>{`
          @keyframes checkPop {
            0%   { transform: scale(0.5); opacity: 0; }
            60%  { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes ringDraw {
            0%   { stroke-dashoffset: 440; }
            100% { stroke-dashoffset: 0; }
          }
        `}</style>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div style={{
            position: 'relative', width: 154, height: 154,
            animation: 'checkPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}>
            <svg width="154" height="154" viewBox="0 0 154 154" fill="none"
              style={{ position: 'absolute', inset: 0 }}>
              <circle cx="77" cy="77" r="72" stroke="#EF59A1" strokeWidth="1.5"
                strokeDasharray="440" strokeDashoffset="440" strokeLinecap="round"
                style={{ animation: 'ringDraw 1s 0.3s ease forwards' }} />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 120, height: 120, borderRadius: '50%',
              background: 'linear-gradient(180deg, #E8E8E8 0%, #D9D9D9 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M12 24l10 10 14-16" stroke="#FFFFFF" strokeWidth="4"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 500,
            fontSize: 20, lineHeight: '30px', color: '#000000',
            margin: 0, textAlign: 'center',
          }}>Order Placed Successfully</h1>
        </div>
      </div>
    );
  }

  // ── PHASE 2: BARCODE / ORDER DETAILS SCREEN ──
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: C.white,
        display: 'flex', flexDirection: 'column',
        animation: 'qrFadeIn 0.3s ease',
        maxWidth: 560, margin: '0 auto',
        overflowY: 'auto',
      }}
    >
      {/* ── TOP: GREEN CHECKMARK + CONFIRMED ── */}
      <div style={{
        width: '100%', padding: '24px 16px 20px',
        borderBottom: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        {/* Green circle checkmark */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: C.greenBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 8,
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="14" stroke={C.green} strokeWidth="2.67" fill="none" />
            <path d="M10 16.5l4 4 8-9" stroke={C.green} strokeWidth="2.67"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 600,
          fontSize: 20, lineHeight: '28px', color: C.dark,
          margin: 0, textAlign: 'center',
        }}>Order Confirmed</h2>
        <p style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 400,
          fontSize: 14, lineHeight: '20px', color: C.gray400,
          margin: 0, textAlign: 'center',
        }}>Thank you, Visit Again</p>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={{ flex: 1, padding: '20px 16px 0' }}>

        {/* ── TOKEN NUMBER CARD ── */}
        <div style={{
          width: '100%', padding: '20px 34px',
          border: `2px solid ${C.tokenBorder}`, borderRadius: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 8, marginBottom: 18,
        }}>
          <span style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 500,
            fontSize: 12, lineHeight: '16px', textAlign: 'center',
            letterSpacing: '0.6px', textTransform: 'uppercase',
            color: C.gray400,
          }}>Token Number</span>
          <span style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 700,
            fontSize: 40, lineHeight: '72px', textAlign: 'center',
            letterSpacing: '-1.8px', color: C.dark,
          }}>{token}</span>
          <span style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 400,
            fontSize: 12, lineHeight: '16px', textAlign: 'center',
            color: C.gray500,
          }}>Show this when collecting your order</span>
        </div>

        {/* ── BARCODE CARD ── */}
        <div style={{
          width: '100%', padding: '25px 25px 1px',
          border: `1px solid ${C.border}`, borderRadius: 16,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          marginBottom: 18,
        }}>
          {/* Barcode area */}
          <div style={{
            width: '100%', height: 95,
            background: C.barcodeBg, borderRadius: 12,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            marginBottom: 16,
          }}>
            {/* SVG Barcode representation */}
            <svg width="267" height="50" viewBox="0 0 267 50" fill="none" style={{ marginBottom: 8 }}>
              {[0,4.5,9,16.5,21,28.5,33,40.5,46.5,49.5,52.5,60,66,73.5,78,82.5,90,93,99,105,109.5,115.5,121.5,124.5,132,136.5,144,148.5,153,157.5,165,171,177,181.5,184.5,190.5,198,201,210,214.5,220.5,225,231,235.5,241.5,247.5,255,261,264].map((x, i) => (
                <rect key={i} x={x} y="0" width={i % 3 === 0 ? 3 : 1.5} height="40" fill="#000000" />
              ))}
              <text x="133.5" y="49" textAnchor="middle" style={{
                fontFamily: "'Inter',sans-serif", fontWeight: 400,
                fontSize: 11, fill: '#000000',
              }}>1774361140055-{token}</text>
            </svg>
          </div>
          <span style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 400,
            fontSize: 12, lineHeight: '16px', textAlign: 'center',
            color: C.gray400, marginBottom: 16,
          }}>Scan for quick pickup</span>
        </div>

        {/* ── ORDER DETAILS CARD ── */}
        <div style={{
          width: '100%', padding: 25,
          border: `1px solid ${C.border}`, borderRadius: 16,
          marginBottom: 18,
        }}>
          {/* Order ID + Time row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                fontSize: 12, lineHeight: '16px', color: C.gray400,
              }}>Order ID</span>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                fontSize: 14, lineHeight: '20px', color: C.dark,
              }}>#{orderNumber.slice(-6)}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                fontSize: 12, lineHeight: '16px', color: C.gray400,
              }}>Time</span>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                fontSize: 14, lineHeight: '20px', color: C.dark,
              }}>{orderTime}</span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: C.border, marginBottom: 20 }} />

          {/* Items list */}
          {items.map(item => (
            <div key={`${item.id}-${item.variantSize ?? ''}`}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 16,
              }}>
              <div>
                <p style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                  fontSize: 14, lineHeight: '20px', color: C.dark,
                  margin: '0 0 2px',
                }}>{item.name}{item.variantSize ? ` (${item.variantSize})` : ''}</p>
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                  fontSize: 12, lineHeight: '16px', color: C.gray400,
                }}>Qty: {item.qty}</span>
              </div>
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 500,
                fontSize: 14, lineHeight: '20px', color: C.dark,
                textAlign: 'right',
              }}>₹{item.price * item.qty}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ width: '100%', height: 1, background: C.border, marginBottom: 16 }} />

          {/* Total */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 600,
              fontSize: 16, lineHeight: '24px', color: C.dark,
            }}>Total</span>
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 700,
              fontSize: 20, lineHeight: '28px', color: C.dark,
            }}>₹{subtotal}</span>
          </div>
        </div>

        {/* ── ESTIMATED WAIT TIME CARD ── */}
        <div style={{
          width: '100%', padding: '21px',
          border: `1px solid ${C.border}`, borderRadius: 16,
          display: 'flex', alignItems: 'center', gap: 12,
          marginBottom: 18,
        }}>
          {/* Clock icon */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: C.cardBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8.33" stroke={C.gray500} strokeWidth="1.67" fill="none" />
              <path d="M10 5v5l3.33 1.67" stroke={C.gray500} strokeWidth="1.67"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 500,
              fontSize: 14, lineHeight: '20px', color: C.dark, margin: 0,
            }}>Estimated Wait Time</p>
            <span style={{
              fontFamily: "'Poppins',sans-serif", fontWeight: 400,
              fontSize: 12, lineHeight: '16px', color: C.gray400,
            }}>5-10 minutes</span>
          </div>
        </div>

        {/* ── NEXT STEPS CARD ── */}
        <div style={{
          width: '100%', padding: '21px',
          border: `1px solid ${C.border}`, borderRadius: 16,
          marginBottom: 24,
        }}>
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 600,
            fontSize: 14, lineHeight: '20px', color: C.dark,
            margin: '0 0 12px',
          }}>Next Steps</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Wait for your token to be called',
              'Show token or scan barcode at counter',
              'Complete payment and enjoy!',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: C.stepBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                    fontSize: 12, lineHeight: '16px', color: '#FFFFFF',
                  }}>{i + 1}</span>
                </div>
                <span style={{
                  fontFamily: "'Poppins',sans-serif", fontWeight: 400,
                  fontSize: 12, lineHeight: '16px', color: C.gray500,
                }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM: RETURN TO HOME ── */}
      <div style={{
        width: '100%', padding: '13px 16px 24px',
        background: C.white, flexShrink: 0,
      }}>
        <button
          onClick={onDone}
          style={{
            width: '100%', height: 43,
            background: C.pink, border: 'none',
            borderRadius: 0, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 500,
            fontSize: 16, lineHeight: '24px', textAlign: 'center',
            color: '#FFFFFF',
          }}>Return to Home</span>
        </button>
      </div>
    </div>
  );
}
