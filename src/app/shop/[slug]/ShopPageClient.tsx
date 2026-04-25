'use client';

import { Suspense, useCallback, useState } from 'react';
import { Shop } from '@/lib/supabase';
import { TEMPLATE_MAP, DEFAULT_TEMPLATE, type TemplateName } from '@/components/templates/index';
import type { MenuProduct, ShopBanner } from '@/components/templates/QRMenuTemplate';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';

export type { MenuProduct, ShopBanner };

// Helper: merges a realtime row payload into a list keyed by `id`.
// Handles INSERT, UPDATE, and DELETE in one place so the subscription
// callbacks below stay tiny.
function applyRowChange<T extends { id?: string }>(
  list: T[],
  payload: { eventType: string; new?: T; old?: { id?: string } },
): T[] {
  if (payload.eventType === 'DELETE') {
    const id = payload.old?.id;
    return id ? list.filter(r => r.id !== id) : list;
  }
  const next = payload.new;
  if (!next?.id) return list;
  const idx = list.findIndex(r => r.id === next.id);
  if (idx === -1) return [...list, next];
  const copy = list.slice();
  copy[idx] = { ...copy[idx], ...next };
  return copy;
}

// Banners that are flagged inactive should disappear from the customer view.
function shouldExcludeBanner(b: ShopBanner & { is_active?: boolean }): boolean {
  return b.is_active === false;
}

// Products flagged not-live should disappear too.
function shouldExcludeProduct(p: MenuProduct & { is_live?: boolean }): boolean {
  return p.is_live === false;
}

export default function ShopPageClient({
  shop: initialShop,
  menuProducts: initialProducts,
  banners: initialBanners,
}: {
  shop: Shop;
  menuProducts: MenuProduct[];
  banners: ShopBanner[];
}) {
  // Hydrated from server — kept in state so realtime updates can mutate the
  // customer's view without a full page reload (the bedrock UX requirement
  // for live ordering: customers must see out-of-stock and store-closed
  // changes within seconds, not on next refresh).
  const [shop, setShop] = useState<Shop>(initialShop);
  const [products, setProducts] = useState<MenuProduct[]>(initialProducts);
  const [banners, setBanners] = useState<ShopBanner[]>(initialBanners);

  // ── Realtime: site row (name, image_url, is_live, tagline, etc.) ───────
  useRealtimeTable<Shop>({
    table: 'sites',
    filter: `id=eq.${initialShop.id}`,
    event: 'UPDATE',
    onChange: useCallback((payload) => {
      const next = payload.new as Shop | undefined;
      if (!next) return;
      // If the owner just took the store offline, force a full reload so the
      // server-rendered "Shop Currently Unavailable" page is shown — the
      // customer sees a clear closed-state instead of a half-broken UI.
      if (next.is_live === false) {
        if (typeof window !== 'undefined') window.location.reload();
        return;
      }
      setShop(prev => ({ ...prev, ...next }));
    }, []),
  });

  // ── Realtime: products for this site (price, name, photo, in-stock) ────
  useRealtimeTable<MenuProduct & { is_live?: boolean; site_id?: string }>({
    table: 'products',
    filter: `site_id=eq.${initialShop.id}`,
    onChange: useCallback((payload) => {
      setProducts(prev => {
        const merged = applyRowChange(
          prev as Array<MenuProduct & { id?: string }>,
          payload as never,
        ) as Array<MenuProduct & { is_live?: boolean }>;
        return merged.filter(p => !shouldExcludeProduct(p));
      });
    }, []),
  });

  // ── Realtime: banners for this site ────────────────────────────────────
  useRealtimeTable<ShopBanner & { is_active?: boolean; site_id?: string }>({
    table: 'banners',
    filter: `site_id=eq.${initialShop.id}`,
    onChange: useCallback((payload) => {
      setBanners(prev => {
        const merged = applyRowChange(
          prev as Array<ShopBanner & { id?: string }>,
          payload as never,
        ) as Array<ShopBanner & { is_active?: boolean }>;
        return merged.filter(b => !shouldExcludeBanner(b));
      });
    }, []),
  });

  const templateKey: TemplateName = DEFAULT_TEMPLATE;
  const Template = TEMPLATE_MAP[templateKey];

  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100dvh', background: '#fafafa',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e6e6e6',
          borderTopColor: '#ef59a1',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <Template
        shopName={shop.name}
        shopTagline={shop.tagline ?? undefined}
        logoUrl={shop.image_url}
        menuProducts={products}
        banners={banners}
        tier="view"
      />
    </Suspense>
  );
}
