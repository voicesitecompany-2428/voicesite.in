'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CartItem } from './QRMenuTemplate';

const T = {
  pink: '#EF59A1',
  dark: '#191919',
  border: '#E6E6E6',
  white: '#FFFFFF',
  gray: '#808080',
  green: '#13801C',
  cardBg: '#FAFAFA',
};

type LiveStatus = 'preparing' | 'ready' | 'completed';

const STATUS_LABEL: Record<LiveStatus, string> = {
  preparing: '👨‍🍳 Preparing your order…',
  ready: '✅ Your order is ready!',
  completed: '🎉 Order completed. Enjoy!',
};

const STATUS_COLOR: Record<LiveStatus, string> = {
  preparing: '#F97316',
  ready: T.green,
  completed: '#5137EF',
};

interface OrderConfirmedScreenProps {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  paymentMethod: 'online' | 'counter';
  onDone: () => void;
}

export default function OrderConfirmedScreen({
  orderId, orderNumber, items, subtotal, paymentMethod, onDone,
}: OrderConfirmedScreenProps) {
  const [status, setStatus] = useState<LiveStatus>('preparing');

  useEffect(() => {
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        payload => {
          const next = (payload.new as { status?: string }).status as LiveStatus | undefined;
          if (next) setStatus(next);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: T.white,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        animation: 'qrFadeIn 0.18s ease',
        overflowY: 'auto',
        maxWidth: 560, margin: '0 auto',
      }}
    >
      {/* Top confirmation block */}
      <div style={{ width: '100%', padding: '48px 16px 32px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#EDFBF0', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path d="M8 18l7 7 13-14" stroke={T.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 22, color: T.dark, margin: '0 0 6px' }}>
          Order Confirmed!
        </h2>
        <p style={{ fontFamily: "'Manrope',sans-serif", fontSize: 14, color: T.gray, margin: 0 }}>
          Order #{orderNumber}
        </p>
      </div>

      {/* Live status chip */}
      <div style={{
        margin: '0 16px 24px',
        padding: '12px 20px',
        border: `1.5px solid ${STATUS_COLOR[status]}`,
        borderRadius: 12,
        background: `${STATUS_COLOR[status]}18`,
        textAlign: 'center', width: 'calc(100% - 32px)',
      }}>
        <p style={{
          fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 15,
          color: STATUS_COLOR[status], margin: 0,
        }}>
          {STATUS_LABEL[status]}
        </p>
      </div>

      {/* Order details card */}
      <div style={{
        width: 'calc(100% - 32px)', margin: '0 16px',
        background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 14,
        padding: '16px',
      }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 14, color: T.dark, margin: '0 0 12px' }}>
          Order Items ({itemCount})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={`${item.id}-${item.variantSize ?? ''}`} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: T.gray }}>
                {item.qty}× {item.name}{item.variantSize ? ` (${item.variantSize})` : ''}
              </span>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 13, color: T.dark }}>₹{item.price * item.qty}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 1, background: T.border, margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 14, color: T.dark }}>Total</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 16, color: T.pink }}>₹{subtotal}</span>
        </div>
        <div style={{ height: 1, background: T.border, margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Manrope',sans-serif", fontSize: 13, color: T.gray }}>Payment</span>
          <span style={{
            fontFamily: "'Manrope',sans-serif", fontWeight: 600, fontSize: 13,
            color: paymentMethod === 'online' ? T.green : '#F97316',
          }}>
            {paymentMethod === 'online' ? '✓ Paid Online' : 'Pay at Counter'}
          </span>
        </div>
      </div>

      {/* Done button */}
      <div style={{ padding: '24px 16px 48px', width: '100%' }}>
        <button
          onClick={onDone}
          style={{
            width: '100%', height: 52, background: T.pink,
            border: 'none', borderRadius: 100, color: T.white,
            fontFamily: "'Poppins',sans-serif", fontWeight: 600, fontSize: 16,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(239,89,161,0.35)',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
