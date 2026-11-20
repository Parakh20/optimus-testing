// Marks every non-marketing host as noindex.
//
// Extracted from an inline <script> in index.html so that script-src does not
// have to allow 'unsafe-inline' for it. Files in public/ are copied to the site
// root verbatim, so this is same-origin and satisfies script-src 'self'.
//
// This is the belt to the braces of the `X-Robots-Tag: noindex, nofollow`
// response header set in vercel.json for every host that is not the apex or
// www. The header is the stronger control (it does not need the crawler to run
// JavaScript); this covers a preview or local context where those headers are
// not applied.
//
// It REPLACES the existing robots meta rather than appending a second one — two
// conflicting robots tags in one head is undefined behaviour, and the more
// restrictive one is not guaranteed to win.
(function () {
  var h = window.location.hostname;
  var isMarketing =
    h === 'optimustesting.com' ||
    h === 'www.optimustesting.com' ||
    h === 'localhost' ||
    h === '127.0.0.1';
  if (isMarketing) return;

  var existing = document.querySelector('meta[name="robots"]');
  if (existing) {
    existing.setAttribute('content', 'noindex, nofollow');
    return;
  }
  var m = document.createElement('meta');
  m.name = 'robots';
  m.content = 'noindex, nofollow';
  document.head.appendChild(m);
})();
