import { MetadataRoute } from 'next';
import { supabaseServer } from '@/lib/supabase';
import { blogPosts } from '@/content/blog/posts';

const BASE_URL = 'https://vsite.in';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Static public pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/pricing`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.9,
        },
        {
            url: `${BASE_URL}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/support`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/blog`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];

    // Blog posts
    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
        url: `${BASE_URL}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
    }));

    // Dynamic: all live shop/menu pages
    const { data: sites } = await supabaseServer
        .from('sites')
        .select('slug, updated_at')
        .eq('is_live', true);

    const shopPages: MetadataRoute.Sitemap = (sites ?? []).map((site) => ({
        url: `${BASE_URL}/shop/${site.slug}`,
        lastModified: site.updated_at ? new Date(site.updated_at) : new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
    }));

    return [...staticPages, ...blogPages, ...shopPages];
}
