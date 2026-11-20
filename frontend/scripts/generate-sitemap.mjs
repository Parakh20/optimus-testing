#!/usr/bin/env node
// Generates frontend/public/sitemap.xml from the routes the marketing surface
// actually serves, plus every blog post.
//
// Why generated rather than hand-maintained: the previous sitemap listed
// fragment URLs ("https://optimustesting.com/#features"). Search engines treat
// a fragment as the same document as the page it hangs off, so those entries
// were five duplicates of "/" and every real route — the legal pages Razorpay's
// review checks, and the blog, which is the only content surface — was absent.
// Blog posts are the part that drifts, so the slug list is read from the source
// of truth rather than copied.
//
// Run via the `prebuild` npm script; `npm run sitemap` regenerates it on demand.
// sitemap.test.ts asserts the committed file matches this output, so a new post
// without a regenerated sitemap fails CI instead of silently going unindexed.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ORIGIN = 'https://optimustesting.com';

const POSTS_FILE = join(ROOT, 'src/pages/blog/posts/index.ts');
const OUT_FILE = join(ROOT, 'public/sitemap.xml');

/**
 * Blog posts are plain object literals in a .ts module, which a bare node script
 * cannot import. Rather than add a TypeScript loader to the build just for this,
 * pull the two fields that matter out of the source text. The test that compares
 * the committed sitemap against this output is what keeps the parse honest — if
 * the literal shape ever changes, the count mismatch fails there.
 */
export function readPosts(source) {
  const posts = [];
  const slugRe = /slug:\s*'([^']+)'/g;
  const dateRe = /date:\s*'(\d{4}-\d{2}-\d{2})'/g;
  let slugMatch;
  let dateMatch;
  while ((slugMatch = slugRe.exec(source)) && (dateMatch = dateRe.exec(source))) {
    posts.push({ slug: slugMatch[1], date: dateMatch[1] });
  }
  return posts;
}

// Routes MarketingApp registers in src/apps/MarketingApp.tsx. /start-trial and
// /auth are deliberately absent: they live on the app host, which serves
// noindex (see public/noindex.js and the vercel.json rule).
const STATIC_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/contact', changefreq: 'yearly', priority: '0.5' },
  { path: '/cookies', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/refund-policy', changefreq: 'yearly', priority: '0.3' },
];

export function buildSitemap(posts) {
  const entries = [
    ...STATIC_ROUTES.map((r) => ({ ...r, lastmod: null })),
    ...posts.map((p) => ({
      path: `/blog/${p.slug}`,
      changefreq: 'yearly',
      priority: '0.6',
      lastmod: p.date,
    })),
  ];

  const urls = entries
    .map((e) => {
      const lines = [
        `    <loc>${ORIGIN}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
      ].filter(Boolean);
      return `  <url>\n${lines.join('\n')}\n  </url>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function generate() {
  const posts = readPosts(readFileSync(POSTS_FILE, 'utf8'));
  return buildSitemap(posts);
}

// Only write when run directly, so the test can import the builders.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const xml = generate();
  writeFileSync(OUT_FILE, xml, 'utf8');
  const count = (xml.match(/<url>/g) ?? []).length;
  console.log(`sitemap.xml written with ${count} URLs`);
}
