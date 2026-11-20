import { useParams, Link } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';
import { getPost } from './posts';
import { formatDate } from '@/lib/format';
import { Seo } from '@/components/Seo';
import NotFound from '@/pages/NotFound';

const ORIGIN = 'https://optimustesting.com';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getPost(slug) : undefined;

  // safeHtml is sanitized via DOMPurify before use in dangerouslySetInnerHTML — XSS safe.
  const safeHtml = useMemo(() => {
    if (!post) return '';
    const raw = marked.parse(post.content, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [post]);

  const jsonLd = useMemo(() => {
    if (!post) return undefined;
    return [
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        dateModified: post.date,
        mainEntityOfPage: { '@type': 'WebPage', '@id': `${ORIGIN}/blog/${post.slug}` },
        author: { '@type': 'Organization', name: 'TestFlow', url: ORIGIN },
        publisher: { '@id': `${ORIGIN}/#org` },
        image: `${ORIGIN}/og-image.png`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: 'Resources', item: `${ORIGIN}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: `${ORIGIN}/blog/${post.slug}` },
        ],
      },
    ];
  }, [post]);

  // An unknown slug used to redirect to /blog, which returns HTTP 200 and reads
  // to a crawler as a second copy of the index. NotFound carries noindex.
  if (!post) return <NotFound />;

  return (
    <div className="min-h-screen bg-[#07070c] text-white px-6 py-16">
      <Seo
        title={`${post.title} | TestFlow`}
        description={post.description}
        path={`/blog/${post.slug}`}
        type="article"
        publishedTime={post.date}
        jsonLd={jsonLd}
      />
      <div className="max-w-3xl mx-auto">
        <Link to="/blog" className="text-[#60a5fa] text-sm font-mono hover:underline">← All resources</Link>
        <main>
          <div className="mt-8 font-mono text-[11px] text-white/50 uppercase tracking-widest">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight leading-tight">{post.title}</h1>
          {/* Content is DOMPurify-sanitized markdown HTML — safe for rendering */}
          <div
            className="mt-10 prose prose-invert prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        </main>
        <aside className="mt-16 rounded-2xl border border-[#3b82f6]/30 bg-[#3b82f6]/10 p-6">
          <div className="font-semibold text-white text-lg">Stop doing this in Excel.</div>
          <p className="mt-2 text-white/65 text-sm">
            TestFlow has 46 ready-to-use test templates, a mobile app for field engineers,
            and AI-generated handover reports.
          </p>
          <Link
            to="/#cta"
            className="mt-4 inline-block rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition"
          >
            Book a demo →
          </Link>
        </aside>
        <footer className="mt-12 pt-6 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-white/55">
          <Link to="/" className="hover:text-white">Home</Link>
          <Link to="/blog" className="hover:text-white">Resources</Link>
          <a href="/contact" className="hover:text-white">Contact</a>
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <a href="/terms" className="hover:text-white">Terms</a>
        </footer>
      </div>
    </div>
  );
}
