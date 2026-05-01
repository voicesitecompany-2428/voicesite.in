'use client';

import React from 'react';
import type { CartItem } from './QRMenuTemplate';

const T = {
  pink: '#EF59A1',
  dark: '#191919',
  border: '#E6E6E6',
  white: '#FFFFFF',
  gray: '#808080',
  cardBg: '#FAFAFA',
};

interface CartSheetProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (id: string, variantSize: string | undefined, delta: number) => void;
  onRemove: (id: string, variantSize: string | undefined) => void;
  onCheckout: () => void;
}

export default function CartSheet({ items, onClose, onUpdateQty, onRemove, onCheckout }: CartSheetProps) {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your cart"
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
        maxHeight: '85dvh', display: 'flex', flexDirection: 'column',
        animation: 'qrSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 18, color: T.dark }}>
            Your Cart
          </span>
          <button
            onClick={onClose}
            aria-label="Close cart"
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke={T.dark} strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {items.length === 0 ? (
            <div style={{ paddingTop: 48, textAlign: 'center' }}>
              <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, color: '#C5C5C5' }}>
                Your cart is empty
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map(item => (
                <div
                  key={`${item.id}-${item.variantSize ?? ''}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 12, background: T.cardBg,
                    border: `1px solid ${T.border}`, borderRadius: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontFamily: "'Poppins',sans-serif",
                      fontWeight: 600, fontSize: 14, color: T.dark,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{item.name}</p>
                    {item.variantSize && (
                      <p style={{ margin: '2px 0 0', fontFamily: "'Manrope',sans-serif", fontSize: 11, color: T.gray }}>
                        {item.variantSize}
                      </p>
                    )}
                    <p style={{ margin: '4px 0 0', fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 14, color: T.pink }}>
                      ₹{item.price * item.qty}
                    </p>
                  </div>

                  {/* Qty stepper */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    border: `1.5px solid ${T.border}`, borderRadius: 100, padding: '4px 12px',
                  }}>
                    <button
                      onClick={() => item.qty === 1
                        ? onRemove(item.id, item.variantSize)
                        : onUpdateQty(item.id, item.variantSize, -1)}
                      aria-label="Decrease"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.dark, lineHeight: 1, padding: 0 }}
                    >–</button>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 15, color: T.dark, minWidth: 18, textAlign: 'center' }}>
                      {item.qty}
                    </span>
                    <button
                      onClick={() => onUpdateQty(item.id, item.variantSize, 1)}
                      aria-label="Increase"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: T.pink, lineHeight: 1, padding: 0 }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div style={{ padding: '16px 20px 32px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 15, color: T.dark }}>Subtotal</span>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 16, color: T.dark }}>₹{subtotal}</span>
            </div>
            <button
              onClick={onCheckout}
              style={{
                width: '100%', height: 52, background: T.pink,
                border: 'none', borderRadius: 100, color: T.white,
                fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,89,161,0.35)',
              }}
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
