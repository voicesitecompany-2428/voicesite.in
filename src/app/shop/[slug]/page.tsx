import { notFound } from 'next/navigation';
import { supabaseServer, Shop } from '@/lib/supabase';
import ShopPageClient from './ShopPageClient';

// Force dynamic rendering to ensure live status and deletion are reflected immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
    params: Promise<{ slug: string }>;
}

async function getShop(slug: string): Promise<Shop | null> {
    // 1. Fetch Site
    const { data: site, error: siteError } = await supabaseServer
        .from('sites')
        .select('*')
        .eq('slug', slug)
        .single();

    if (siteError || !site) {
        return null;
    }

    // 2. Fetch Products
    const { data: products, error: prodError } = await supabaseServer
        .from('products')
        .select('*')
        .eq('site_id', site.id);

    if (prodError) {
        console.error('Error fetching products:', prodError);
    }

    // 3. Map to Shop Interface
    const shopData: Shop = {
        id: site.id,
        slug: site.slug,
        name: site.name,
        description: site.description || `Established in ${site.established_year}. ${site.address}, ${site.location}, ${site.state} - ${site.pincode}`,
        products: (products || []).map((p: any) => ({
            name: p.name,
            price: p.price,
            description: p.description,
            image_url: p.image_url,
            is_live: p.is_live
        })),
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
        is_live: site.is_live
    };

    return shopData;
}

export default async function ShopPage({ params }: PageProps) {
    const { slug } = await params;
    const shop = await getShop(slug);

    if (!shop) {
        notFound();
    }

    // Check if shop is live
    if (shop.is_live === false) {
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

    return <ShopPageClient shop={shop} />;
}
