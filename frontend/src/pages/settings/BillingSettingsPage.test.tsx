import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import BillingSettingsPage from './BillingSettingsPage';

vi.mock('@/lib/entitlements', () => ({
  useEntitlements: () => ({
    entitlements: { planName: 'Professional', planSlug: 'professional', isCustom: false, maxUsers: 25, maxActiveProjects: 10 },
    isLoading: false,
  }),
}));
vi.mock('@/lib/usage', () => ({
  useUsage: () => ({ usage: { activeUsers: 6, activeProjects: 3, aiReportsThisMonth: 2 }, isLoading: false }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn(), user: { id: 'u1' }, userRole: 'GM', userName: 'Gita' }),
}));
// The page reads the current company for its period/freeze queries, and
// useCompany throws outside a CompanyProvider. Mocked rather than wrapped so
// the test keeps asserting this page's own rendering and not the provider's
// host-resolution behaviour.
vi.mock('@/contexts/CompanyContext', () => ({
  useCompany: () => ({
    company: { id: 'c1', name: 'Acme Power', slug: 'acme' },
    loading: false,
  }),
}));
// BillingSettingsPage imports the Supabase client directly (for the
// downgrade-options query) — createClient() throws at import time without
// a real VITE_SUPABASE_URL, so mock the client module itself (same pattern
// as UpgradeModal.test.tsx / ReportsList.test.tsx) rather than relying on env vars.
vi.mock('@/integrations/supabase/client', () => {
  // Recursive so any number of chained .eq() calls resolves the same way. The
  // page's own queries end in three different ways — .order() for the plan
  // lists, .maybeSingle() for the current period, and a top-level .rpc() for
  // the freeze check — and a mock missing any one of them leaves that query
  // pending forever, which renders the page's Skeleton branch instead of its
  // content and fails every assertion below for the wrong reason.
  type Query = {
    eq: () => Query;
    order: () => Promise<{ data: never[]; error: null }>;
    maybeSingle: () => Promise<{ data: null; error: null }>;
    single: () => Promise<{ data: null; error: null }>;
  };
  const query = (): Query => ({
    eq: () => query(),
    order: () => Promise.resolve({ data: [] as never[], error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    single: () => Promise.resolve({ data: null, error: null }),
  });
  return {
    supabase: {
      from: () => ({
        select: () => query(),
      }),
      rpc: () => Promise.resolve({ data: false, error: null }),
      functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
    },
  };
});
// DashboardLayout pulls in NotificationBell, ThemeToggle, TrialBanner, etc.
// (auth/theme/router context this test doesn't set up) — mocked to a plain
// passthrough, matching ReportsList.test.tsx / ReportProjectDetail.test.tsx
// in this same plan, since this page's test only cares about its own content.
vi.mock('@/components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function setup() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <BillingSettingsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('BillingSettingsPage', () => {
  it('renders a MetricCard-based usage summary alongside the ProgressBar rows', async () => {
    setup();
    // findByText, not getByText: the page holds a Skeleton until its
    // subscription-period query settles, so a synchronous assertion always
    // sees the loading branch.
    expect(await screen.findByText('Professional')).toBeInTheDocument();
    expect(screen.getByText('AI reports this month')).toBeInTheDocument();
    // ProgressBar renders "N%" per row — Users at 6/25 -> 24%
    expect(screen.getByText('24%')).toBeInTheDocument();
  });
});
