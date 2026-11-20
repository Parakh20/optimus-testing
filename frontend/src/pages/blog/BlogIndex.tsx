import { Link } from 'react-router-dom';
import { posts } from './posts';
import { formatDate } from '@/lib/format';
import { Seo } from '@/components/Seo';

const ORIGIN = 'https://optimustesting.com';

// Blog listing schema. Lets a crawler see the post list without executing the
// route, and gives the index page a reason to rank for the topic rather than
// competing with its own posts.
const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${ORIGIN}/blog`,
    name: 'TestFlow Resources',
    description: 'Commissioning guides, test procedures, and industry insights for substation testing teams.',
    url: `${ORIGIN}/blog`,
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      url: `${ORIGIN}/blog/${post.slug}`,
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Resources', item: `${ORIGIN}/blog` },
    ],
  },
];

export default function BlogIndex() {
  return (
    <div className="min-h-screen bg-[#07070c] text-white px-6 py-16">
      <Seo
        title="Substation commissioning guides & test procedures"
        description="Practical commissioning guides for substation teams: pre-commissioning checks, equipment test procedures, protection verification and energisation sign-off."
        path="/blog"
        jsonLd={JSON_LD}
      />
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="text-[#60a5fa] text-sm font-mono hover:underline">← optimustesting.com</Link>
        <main>
          <h1 className="mt-8 text-4xl font-bold tracking-tight">Resources</h1>
          <p className="mt-3 text-white/60 text-lg">Commissioning guides, test procedures, and industry insights.</p>
          <div className="mt-10 space-y-4">
            {posts.map(post => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="block rounded-2xl border border-white/10 hover:border-white/25 bg-white/[.02] hover:bg-white/[.04] p-6 transition"
              >
                <div className="font-mono text-[11px] text-white/50 uppercase tracking-widest mb-2">
                  {formatDate(post.date)}
                </div>
                <h2 className="text-xl font-semibold text-white leading-snug">{post.title}</h2>
                <p className="mt-2 text-white/60 text-sm leading-relaxed">{post.description}</p>
                {/* The link text is the whole card, so the arrow is decoration —
                    naming it "Read" on every card would give a screen reader a
                    list of identical links (WCAG 2.4.4). */}
                <div className="mt-4 text-[#60a5fa] text-sm font-mono" aria-hidden="true">Read →</div>
              </Link>
            ))}
          </div>
        </main>
        <footer className="mt-16 pt-6 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/55">
          <Link to="/" className="hover:text-white">Home</Link>
          <a href="/#pricing" className="hover:text-white">Pricing</a>
          <a href="/contact" className="hover:text-white">Contact</a>
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <a href="/terms" className="hover:text-white">Terms</a>
        </footer>
      </div>
    </div>
  );
}
