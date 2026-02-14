'use client';

import { Shop } from '@/lib/supabase';
import ShopTemplate from '@/components/ShopTemplate';
import MenuTemplate from '@/components/MenuTemplate';

export default function ShopPageClient({ shop }: { shop: Shop }) {
    if (shop.type === 'Menu') {
        return <MenuTemplate shop={shop} />;
    }
    return <ShopTemplate shop={shop} />;
}
