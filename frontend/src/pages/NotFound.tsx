import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { captureException } from "@/lib/monitoring";

/**
 * Shown for any unmatched route on both the marketing and the app host.
 *
 * The SPA rewrite in vercel.json serves index.html with HTTP 200 for every
 * path, so a wrong URL cannot return a real 404 status. `noindex` is the part
 * that matters instead: without it a crawler that stumbles onto a typo'd or
 * expired link records a 200-OK page and keeps it in the index. It is set here
 * rather than in seo.ts because this is the one route that must NOT be
 * indexable, and it must not leave the tag behind when the user navigates on.
 */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = "Page not found | TestFlow";
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    // Routed through monitoring rather than console so a burst of 404s on a
    // real (mistyped or stale) link surfaces somewhere someone looks.
    captureException(new Error(`404: ${location.pathname}`), { pathname: location.pathname });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#07070c] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-[11px] uppercase tracking-widest text-white/40">Error 404</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">This page doesn't exist.</h1>
        <p className="mt-4 text-white/55 text-[15px] leading-relaxed">
          The link may be out of date, or the address mistyped. Nothing was lost — pick a
          destination below.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="/"
            className="rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] px-5 py-2.5 text-[14px] font-semibold text-white transition"
          >
            Back to home
          </a>
          <a
            href="/contact"
            className="rounded-lg border border-white/15 hover:border-white/30 px-5 py-2.5 text-[14px] font-medium text-white/85 transition"
          >
            Contact support
          </a>
        </div>
        <div className="mt-10 pt-6 border-t border-white/5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/45">
          <a href="/#pricing" className="hover:text-white">Pricing</a>
          <a href="/blog" className="hover:text-white">Resources</a>
          <a href="/privacy" className="hover:text-white">Privacy</a>
          <a href="/terms" className="hover:text-white">Terms</a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
