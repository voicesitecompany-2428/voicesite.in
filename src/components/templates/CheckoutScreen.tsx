'use client';

import React, { useState } from 'react';
import type { CartItem } from './QRMenuTemplate';

// ── DESIGN TOKENS ─────────────────────────────────────────────────────────────
const C = {
  pink: '#EF59A1',
  dark: '#191919',
  headerBorder: '#CCCCCC',
  border: '#E6E6E6',
  white: '#FFFFFF',
  gray800: '#333333',
  gray500: '#555555',
  gray400: '#8F8F8F',
  inputBg: '#F3F3F3',
  black: '#000000',
};

interface CheckoutScreenProps {
  items: CartItem[];
  siteId: string;
  onClose: () => void;
  onOrderPlaced: (orderId: string, orderNumber: string, paymentMethod: 'online' | 'counter') => void;
}

function generateOrderNumber(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

export default function CheckoutScreen({ items, siteId, onClose, onOrderPlaced }: CheckoutScreenProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGateway, setShowGateway] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Step 1: Validate inputs, then show gateway screen
  function handlePlaceOrder() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!mobile.trim() || mobile.trim().length < 10) { setError('Please enter a valid mobile number.'); return; }
    setError('');
    setShowGateway(true);
  }

  // Step 2: Simulate payment and trigger order placed (UI only, no backend)
  async function handleClickToPay() {
    setLoading(true);
    // Simulate payment processing delay
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);

    const orderNumber = generateOrderNumber();
    const mockOrderId = `mock-${Date.now()}`;
    onOrderPlaced(mockOrderId, orderNumber, 'counter');
  }

  // ── PAYMENT GATEWAY SCREEN ──
  if (showGateway) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 250,
          background: C.white,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          maxWidth: 560, margin: '0 auto',
          animation: 'qrFadeIn 0.18s ease',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 0,
        }}>
          {/* Title */}
          <h1 style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 500,
            fontSize: 24, lineHeight: '36px', color: '#000000',
            margin: '0 0 2px', textAlign: 'center',
          }}>Payment Gateway</h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: "'Poppins',sans-serif", fontWeight: 400,
            fontSize: 14, lineHeight: '21px', color: '#676767',
            margin: '0 0 40px', textAlign: 'center',
          }}>Based on your Tech</p>

          {/* Click to Pay button */}
          <button
            onClick={handleClickToPay}
            disabled={loading}
            style={{
              width: 157, height: 46,
              background: loading ? '#F9B8D9' : C.pink,
              border: 'none', borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8,
            }}
          >
            {loading ? (
              <div style={{
                width: 20, height: 20,
                border: '2.5px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <span style={{
                fontFamily: "'Poppins',sans-serif", fontWeight: 600,
                fontSize: 18, lineHeight: '27px', textAlign: 'center',
                color: '#272727',
              }}>Click to Pay</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: C.white,
        display: 'flex', flexDirection: 'column',
        animation: 'qrFadeIn 0.18s ease',
        maxWidth: 560, margin: '0 auto',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{
        width: '100%', height: 54, flexShrink: 0,
        background: C.white, borderBottom: `1px solid ${C.headerBorder}`,
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 16px',
      }}>
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
            stroke={C.dark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 500,
          fontSize: 18, lineHeight: '27px', color: C.gray800,
        }}>Check Out</span>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 16px' }}>

        {/* Heading */}
        <h2 style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 600,
          fontSize: 20, lineHeight: '30px', color: C.gray800,
          margin: '0 0 12px',
        }}>You&apos;re almost done !</h2>

        {/* Subtitle */}
        <p style={{
          fontFamily: "'Manrope',sans-serif", fontWeight: 500,
          fontSize: 12, lineHeight: '18px', color: C.gray400,
          margin: '0 0 32px', maxWidth: 337,
        }}>
          Please provide your name and mobile number to complete your order. This helps us identify your order at pickup.
        </p>

        {/* ── Name Field ── */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontFamily: "'Manrope',sans-serif", fontWeight: 500,
            fontSize: 14, lineHeight: '19px', color: C.gray500,
            display: 'block', marginBottom: 8,
          }}>Name</label>
          <div style={{
            width: '100%', height: 45,
            background: C.inputBg, border: `1px solid ${C.border}`,
            borderRadius: 6, display: 'flex', alignItems: 'center',
            padding: '0 12px',
          }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%', height: '100%', border: 'none',
                background: 'transparent', outline: 'none',
                fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                fontSize: 14, lineHeight: '19px', color: C.black,
              }}
            />
          </div>
        </div>

        {/* ── Mobile Number Field ── */}
        <div style={{ marginBottom: 32 }}>
          <label style={{
            fontFamily: "'Manrope',sans-serif", fontWeight: 500,
            fontSize: 14, lineHeight: '19px', color: C.gray500,
            display: 'block', marginBottom: 8,
          }}>Mobile Number</label>
          <div style={{
            width: '100%', height: 45,
            background: C.inputBg, border: `1px solid ${C.border}`,
            borderRadius: 6, display: 'flex', alignItems: 'center',
            padding: '0 12px',
          }}>
            <input
              value={mobile}
              onChange={e => {
                // Only allow digits
                const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                setMobile(v);
              }}
              placeholder="Enter mobile number"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              style={{
                width: '100%', height: '100%', border: 'none',
                background: 'transparent', outline: 'none',
                fontFamily: "'Manrope',sans-serif", fontWeight: 600,
                fontSize: 14, lineHeight: '19px', color: C.black,
              }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p style={{
            fontFamily: "'Manrope',sans-serif", fontSize: 13,
            color: '#FB2C36', marginBottom: 16, textAlign: 'center',
          }}>{error}</p>
        )}

        {/* ── Place Order Button ── */}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          style={{
            width: '100%', height: 43,
            background: loading ? '#F9B8D9' : C.pink,
            border: 'none', borderRadius: 0, color: C.white,
            fontFamily: "'Poppins',sans-serif", fontWeight: 500,
            fontSize: 16, lineHeight: '24px', textAlign: 'center',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: 18, height: 18,
                border: '2.5px solid rgba(255,255,255,0.4)',
                borderTopColor: '#fff', borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
              Placing order…
            </>
          ) : (
            'Place Order'
          )}
        </button>
      </div>
    </div>
  );
}
