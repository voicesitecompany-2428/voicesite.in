'use client';

import React, { useState } from 'react';
import type { CartItem } from './QRMenuTemplate';
import { supabase } from '@/lib/supabase';

const T = {
  pink: '#EF59A1',
  dark: '#191919',
  border: '#E6E6E6',
  white: '#FFFFFF',
  gray: '#808080',
  cardBg: '#FAFAFA',
  green: '#13801C',
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
  const [tableNo, setTableNo] = useState('');
  const [payMethod, setPayMethod] = useState<'online' | 'counter' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  async function handlePlaceOrder() {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!payMethod) { setError('Please choose a payment method.'); return; }
    setError('');
    setLoading(true);

    // Mock Razorpay: simulate 1.5s processing for online payment
    if (payMethod === 'online') {
      await new Promise(r => setTimeout(r, 1500));
    }

    const orderNumber = generateOrderNumber();
    const { data, error: dbErr } = await supabase
      .from('orders')
      .insert({
        site_id: siteId,
        order_number: orderNumber,
        customer_name: name.trim(),
        table_number: tableNo.trim() || null,
        items: items as unknown as Record<string, unknown>[],
        subtotal,
        payment_method: payMethod,
        payment_status: payMethod === 'online' ? 'paid' : 'pending',
        status: 'preparing',
      })
      .select('id')
      .single();

    setLoading(false);

    if (dbErr || !data) {
      setError('Failed to place order. Please try again.');
      return;
    }

    onOrderPlaced(data.id, orderNumber, payMethod);
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 250,
        background: T.white,
        display: 'flex', flexDirection: 'column',
        animation: 'qrFadeIn 0.18s ease',
        maxWidth: 560, margin: '0 auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', borderBottom: `1px solid ${T.border}`, flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          aria-label="Go back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={T.dark} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 18, color: T.dark }}>
          Checkout
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>

        {/* Name */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 13, color: T.dark, display: 'block', marginBottom: 8 }}>
            Your Name <span style={{ color: T.pink }}>*</span>
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Gowtham"
            style={{
              width: '100%', height: 48, padding: '0 14px',
              border: `1.5px solid ${T.border}`, borderRadius: 10,
              fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.dark,
              outline: 'none', boxSizing: 'border-box', background: T.white,
            }}
          />
        </div>

        {/* Table number */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 13, color: T.dark, display: 'block', marginBottom: 8 }}>
            Table Number <span style={{ color: T.gray, fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            value={tableNo}
            onChange={e => setTableNo(e.target.value)}
            placeholder="e.g. T-5"
            style={{
              width: '100%', height: 48, padding: '0 14px',
              border: `1.5px solid ${T.border}`, borderRadius: 10,
              fontFamily: "'Poppins',sans-serif", fontSize: 14, color: T.dark,
              outline: 'none', boxSizing: 'border-box', background: T.white,
            }}
          />
        </div>

        {/* Payment method */}
        <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 500, fontSize: 13, color: T.dark, marginBottom: 12 }}>
          Payment Method <span style={{ color: T.pink }}>*</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {([
            { value: 'online' as const, label: 'Pay Now', sub: 'UPI / Card — instant confirmation', icon: '⚡' },
            { value: 'counter' as const, label: 'Pay at Counter', sub: 'Pay when your order is ready', icon: '🏪' },
          ]).map(opt => {
            const selected = payMethod === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setPayMethod(opt.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                  border: `2px solid ${selected ? T.pink : T.border}`,
                  background: selected ? '#FFF0F8' : T.cardBg,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <span style={{ fontSize: 22 }}>{opt.icon}</span>
                <div>
                  <p style={{ margin: 0, fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 14, color: T.dark }}>{opt.label}</p>
                  <p style={{ margin: 0, fontFamily: "'Manrope',sans-serif", fontSize: 12, color: T.gray }}>{opt.sub}</p>
                </div>
                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: `2px solid ${selected ? T.pink : T.border}`,
                    background: selected ? T.pink : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.white }} />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Order Summary */}
        <div style={{ background: T.cardBg, borderRadius: 12, padding: '14px 16px', border: `1px solid ${T.border}` }}>
          <p style={{ margin: '0 0 10px', fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 13, color: T.dark }}>
            Order Summary
          </p>
          {items.map(item => (
            <div key={`${item.id}-${item.variantSize ?? ''}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: T.gray }}>
                {item.qty}× {item.name}{item.variantSize ? ` (${item.variantSize})` : ''}
              </span>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 13, color: T.dark }}>₹{item.price * item.qty}</span>
            </div>
          ))}
          <div style={{ height: 1, background: T.border, margin: '10px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 14, color: T.dark }}>Total</span>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 16, color: T.pink }}>₹{subtotal}</span>
          </div>
        </div>

        {error && (
          <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: '#FB2C36', marginTop: 12, textAlign: 'center' }}>
            {error}
          </p>
        )}
      </div>

      {/* Footer CTA */}
      <div style={{ padding: '16px 16px 36px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          style={{
            width: '100%', height: 54, background: loading ? '#F9B8D9' : T.pink,
            border: 'none', borderRadius: 100, color: T.white,
            fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(239,89,161,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              {payMethod === 'online' ? 'Processing payment…' : 'Placing order…'}
            </>
          ) : (
            `Place Order · ${itemCount} item${itemCount !== 1 ? 's' : ''} · ₹${subtotal}`
          )}
        </button>
      </div>
    </div>
  );
}
