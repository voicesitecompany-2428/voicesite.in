import type { Metadata } from 'next';
import Navbar from '@/components/home/Navbar';
import FooterCTA from '@/components/home/FooterCTA';

export const metadata: Metadata = {
    title: 'vsite Blog — Restaurant Tips & Digital Menu Guides',
    description:
        'Practical guides, tips, and insights for restaurant owners in Tamil Nadu. Learn how to grow your restaurant with digital tools.',
    alternates: {
        canonical: 'https://vsite.in/blog',
    },
};

const upcomingPosts = [
    {
        category: 'Guide',
        categoryClass: 'bg-blue-50 text-blue-700',
        title: 'What is a Digital Menu for Restaurants? Complete Guide 2026',
        teaser:
            'Everything a restaurant owner needs to know about going digital — cost, setup, and real benefits.',
    },
    {
        category: 'Comparison',
        categoryClass: 'bg-amber-50 text-amber-700',
        title: 'Paper Menu vs Digital Menu: Full Cost Comparison for Indian Restaurants',
        teaser:
            'We do the math: printing costs vs ₹399/month. The numbers might surprise you.',
    },
    {
        category: 'How-To',
        categoryClass: 'bg-green-50 text-green-700',
        title: 'How to Create a QR Code Menu for Your Restaurant in 3 Minutes',
        teaser:
            'Step-by-step with screenshots. From paper menu photo to live QR code.',
    },
    {
        category: 'Comparison',
        categoryClass: 'bg-purple-50 text-purple-700',
        title: 'vsite vs Petpooja: Which Is Right for Your Restaurant?',
        teaser:
            'Honest comparison. Different tools for different needs — we explain who should use what.',
    },
];

export default function BlogPage() {
    return (
        <>
            <Navbar />

            {/* Hero */}
            <section className="bg-background-light pt-16">
                <div className="max-w-3xl mx-auto px-4 py-16 text-center">
                    <p className="text-primary text-xs font-bold uppercase tracking-widest">
                        From the vsite Team
                    </p>
                    <h1 className="text-4xl sm:text-5xl font-extrabold font-display text-slate-900 mt-4">
                        Restaurant Tips &amp; Digital Menu Guides
                    </h1>
                    <p className="text-slate-600 mt-5 text-lg leading-relaxed max-w-2xl mx-auto">
                        Practical advice for restaurant owners in South India. We write about digital menus,
                        customer experience, and growing your business.
                    </p>
                </div>
            </section>

            {/* Coming Soon */}
            <section className="bg-white py-16">
                <div className="max-w-2xl mx-auto text-center px-4">
                    {/* Icon placeholder */}
                    <div className="bg-primary/10 w-20 h-20 mx-auto rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-5xl">edit_note</span>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mt-6">
                        First Post Dropping This Week
                    </h2>
                    <p className="text-slate-600 mt-3 leading-relaxed">
                        We&apos;re publishing our complete guide: &lsquo;What is a Digital Menu for Restaurants?&rsquo; —
                        the definitive answer for Indian restaurant owners.
                    </p>

                    {/* Email capture form */}
                    <form
                        action="#"
                        method="post"
                        className="flex flex-col sm:flex-row gap-3 mt-8 justify-center"
                    >
                        <input
                            type="email"
                            name="email"
                            placeholder="Your email address"
                            className="border border-slate-300 rounded-[10px] px-4 py-2.5 text-sm flex-1 sm:max-w-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                        <button
                            type="submit"
                            className="bg-primary text-white rounded-[10px] px-6 py-2.5 text-sm font-bold hover:bg-primary-dark transition-colors"
                        >
                            Notify Me
                        </button>
                    </form>
                    <p className="text-xs text-slate-400 mt-3">No spam. Just one email when we publish.</p>
                </div>
            </section>

            {/* Upcoming posts */}
            <section className="bg-background-light py-16">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
                        What We&apos;re Writing
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {upcomingPosts.map((post) => (
                            <article
                                key={post.title}
                                className="bg-white rounded-2xl border border-slate-200 p-6"
                            >
                                <span
                                    className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${post.categoryClass}`}
                                >
                                    {post.category}
                                </span>
                                <h3 className="font-bold text-slate-900 mt-3 leading-snug">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 mt-2">{post.teaser}</p>
                                <span className="inline-block text-xs text-slate-400 mt-4">
                                    Coming soon
                                </span>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <FooterCTA />
        </>
    );
}
