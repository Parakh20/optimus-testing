import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

// Public marketing site at optimustesting.com / www.
//
// Deliberately its own root, separate from TenantApp: neither CompanyProvider
// nor AuthProvider is mounted here, so nothing on this host pulls the auth
// stack into the chunk graph. That separation is the whole point — when all
// three hosts shared one root, the eager entry chunk contained the auth
// context, and through it the Supabase client, for a visitor who was only ever
// going to read a landing page.
const Marketing = lazy(() => import('@/pages/Marketing'));
const TermsOfService = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.PrivacyPolicy })));
const RefundPolicy = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.RefundPolicy })));
const CookiePolicy = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.CookiePolicy })));
const ContactUs = lazy(() => import('@/pages/legal/LegalPages').then(m => ({ default: m.ContactUs })));
const BlogIndex = lazy(() => import('@/pages/blog/BlogIndex'));
const BlogPost = lazy(() => import('@/pages/blog/BlogPost'));

export default function MarketingApp() {
  return (
    <Routes>
      <Route path="/" element={<Marketing />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/refund-policy" element={<RefundPolicy />} />
      <Route path="/cookies" element={<CookiePolicy />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/blog" element={<BlogIndex />} />
      <Route path="/blog/:slug" element={<BlogPost />} />
      {/* A silent redirect to "/" made every wrong URL look like a second copy
          of the home page to a crawler. NotFound carries a noindex tag and
          gives a human somewhere to go. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
