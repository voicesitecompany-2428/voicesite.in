'use client';

import { Suspense } from 'react';
import { Shop } from '@/lib/supabase';
import { TEMPLATE_MAP, DEFAULT_TEMPLATE, type TemplateName } from '@/components/templates/index';
import type { MenuProduct, ShopBanner } from '@/components/templates/QRMenuTemplate';

export type { MenuProduct, ShopBanner };

export default function ShopPageClient({
  shop,
  menuProducts,
  banners,
}: {
  shop: Shop;
  menuProducts: MenuProduct[];
  banners: ShopBanner[];
}) {
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
        menuProducts={menuProducts}
        banners={banners}
        tier="view"
      />
    </Suspense>
  );
}
