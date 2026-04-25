import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Shop } from '@/lib/supabase';
import { supabaseServer } from '@/lib/supabase-server';
import ShopPageClient from './ShopPageClient';
import type { MenuProduct, ShopBanner } from './ShopPageClient';

// ISR: Cache pages for 10 seconds so toggle/live changes reflect quickly.
export const revalidate = 10;

const BASE_URL = 'https://vsite.in';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const { data: site } = await supabaseServer
        .from('sites')
        .select('name, description, image_url, slug')
        .eq('slug', slug)
        .single();

    if (!site) return {};

    const title = `${site.name} Menu — Order Online`;
    const description = site.description
        ? `${site.description} Browse the full menu and order directly from your phone. No app needed.`
        : `Browse ${site.name}'s full menu and place your order directly from your phone. No app needed.`;
    const url = `${BASE_URL}/shop/${site.slug}`;

    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type: 'website',
            images: site.image_url ? [{ url: site.image_url, width: 1200, height: 630, alt: `${site.name} menu` }] : [],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: site.image_url ? [site.image_url] : [],
        },
    };
}

async function getShop(slug: string): Promise<{ shop: Shop; menuProducts: MenuProduct[]; banners: ShopBanner[]; canGoLive: boolean } | null> {
    // 1. Fetch Site
    const { data: site, error: siteError } = await supabaseServer
        .from('sites')
        .select('id, slug, name, description, established_year, address, location, state, pincode, timing, contact_number, email, whatsapp_number, image_url, tagline, social_links, type, is_live, created_at, user_id')
        .eq('slug', slug)
        .single();

    if (siteError || !site) {
        return null;
    }

    // 2. Check owner's trial/subscription status
    let canGoLive = false;
    if (site.user_id) {
        const { data: sub } = await supabaseServer
            .from('user_subscriptions')
            .select('trial_ends_at, store_expires_at')
            .eq('user_id', site.user_id)
            .single();

        if (sub) {
            const now = Date.now();
            const trialEndsMs = sub.trial_ends_at ? new Date(sub.trial_ends_at).getTime() : 0;
            const subEndsMs = sub.store_expires_at ? new Date(sub.store_expires_at).getTime() : 0;
            canGoLive = trialEndsMs > now || subEndsMs > now;
        }
    }

    // 4. Fetch products + banners in parallel
    const [{ data: products, error: prodError }, { data: bannersData }] = await Promise.all([
        supabaseServer
            .from('products')
            .select('id, name, selling_price, description, image_url, is_live, category, food_type, metadata')
            .eq('site_id', site.id)
            .neq('is_live', false),
        supabaseServer
            .from('banners')
            .select('id, name, image_url, description')
            .eq('site_id', site.id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
    ]);

    if (prodError) {
        console.error('Error fetching products:', prodError);
    }

    // 5. Map to Shop Interface (kept minimal — display is handled by template)
    const shopData: Shop = {
        id: site.id,
        slug: site.slug,
        name: site.name,
        description: site.description || '',
        products: [],
        timings: site.timing,
        location: site.location,
        contact: {
            phone: site.contact_number,
            email: site.email,
            whatsapp: site.whatsapp_number,
        },
        audio_url: null,
        transcription: null,
        raw_json: null,
        created_at: site.created_at,
        updated_at: site.created_at,
        image_url: site.image_url,
        tagline: site.tagline,
        social_links: site.social_links,
        type: site.type,
        is_live: site.is_live,
    };

    return { shop: shopData, menuProducts: (products || []) as MenuProduct[], banners: (bannersData || []) as ShopBanner[], canGoLive };
}

export default async function ShopPage({ params }: PageProps) {
    const { slug } = await params;
    const result = await getShop(slug);

    if (!result) {
        notFound();
    }

    const { shop, menuProducts, banners, canGoLive } = result;

    // Check if shop is live (also gates on trial/subscription)
    if (shop.is_live === false || !canGoLive) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-4xl text-gray-400">storefront_off</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Shop Currently Unavailable</h1>
                    <p className="text-gray-600 mb-8">
                        The shop you are looking for is currently offline or under maintenance. Please check back later.
                    </p>
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center gap-3 text-left">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                            <span className="material-symbols-outlined">store</span>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900 text-sm">{shop.name}</p>
                            <p className="text-xs text-gray-500">Will be back soon</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <ShopPageClient shop={shop} menuProducts={menuProducts} banners={banners} />;
}
