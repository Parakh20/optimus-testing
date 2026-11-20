import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { isAdminHost, isMarketingHost } from "@/lib/appOrigin";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { redactUrl } from "@/lib/analytics";

const queryClient = new QueryClient();

// Host modes. The company a user operates as always comes from their own
// profile (see CompanyContext) — the host never selects the tenant, it only
// brands the page. See lib/appOrigin for the host taxonomy.
//   - `admin.optimustesting.com`   → platform admin
//   - `optimustesting.com` / www   → public marketing site
//   - everything else              → the tenant app. That covers the canonical
//     `app.` host, a company subdomain alias (`acme.optimustesting.com`, which
//     shares the session cookie with `app.`), and a customer's own domain on
//     the premium custom_domain feature.
//
// localhost defaults to the app (that's what you're normally developing);
// `?marketing` forces the marketing site, `?admin` the admin panel.
const FORCE_MARKETING = new URLSearchParams(window.location.search).has('marketing');
const FORCE_ADMIN = new URLSearchParams(window.location.search).has('admin');

const IS_ADMIN_HOST = FORCE_ADMIN || isAdminHost();
const IS_MARKETING_HOST = !IS_ADMIN_HOST && (FORCE_MARKETING || isMarketingHost());

// One lazy root per host, and every page inside them lazy too.
//
// All three used to be inlined here with static imports of all 22 pages, which
// produced a single 2.8 MB entry chunk (~880 kB gzipped, ~1.1 MB once the
// eagerly-modulepreloaded manual chunks were counted). A visitor to the
// marketing site downloaded and parsed the platform admin panel, the engineer
// test form and the PDF renderer before React could mount — and because the SPA
// renders into an empty #root, LCP could not fire until that finished.
//
// Splitting by host is what makes it work: the branch is decided at module
// scope from the hostname, so only one of the three is ever fetched, and the
// auth stack (and through it the Supabase client) no longer reaches the entry
// chunk on the marketing host at all.
const AdminApp = lazy(() => import("./apps/AdminApp"));
const MarketingApp = lazy(() => import("./apps/MarketingApp"));
const TenantApp = lazy(() => import("./apps/TenantApp"));

// Chunk-load fallback. Deliberately a bare tinted surface rather than a spinner:
// on a warm cache the chunk resolves in a few milliseconds and a spinner would
// only flash. It paints the theme background so there is no white flash before
// the dark marketing and auth pages arrive.
const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite" />
);

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          {/* Cookieless, first-party. beforeSend strips record ids and query
              strings so the app host reports coarse routes, never which
              customer opened which project. The platform admin is excluded
              outright — it has no product analytics value and its URLs are
              operator-internal. */}
          {!IS_ADMIN_HOST && (
            <>
              <Analytics beforeSend={(event) => ({ ...event, url: redactUrl(event.url) })} />
              <SpeedInsights beforeSend={(event) => ({ ...event, url: redactUrl(event.url) })} />
            </>
          )}
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              {IS_ADMIN_HOST ? <AdminApp /> : IS_MARKETING_HOST ? <MarketingApp /> : <TenantApp />}
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
