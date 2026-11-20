import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2 } from "lucide-react";
import { appUrl } from "@/lib/appOrigin";
import { featureLabel } from "@testflow/shared";

interface PlanRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthly_price_inr: number | null;
  annual_price_inr: number | null;
  max_users: number | null;
  max_active_projects: number | null;
  is_custom: boolean;
}

interface FeatureRow {
  plan_id: string;
  feature_key: string;
  enabled: boolean;
}

const CTA_LABEL: Record<string, string> = {
  starter: "Start free trial",
  professional: "Start free trial",
  business: "Start free trial",
  enterprise: "Contact sales",
};

function formatPrice(monthlyInr: number | null, isCustom: boolean): string {
  if (isCustom || monthlyInr === null) return "Custom";
  return `₹${monthlyInr.toLocaleString("en-IN")}`;
}

export function PricingSection() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [plansRes, featuresRes] = await Promise.all([
        supabase
          .from("plans")
          .select("id, slug, name, description, monthly_price_inr, annual_price_inr, max_users, max_active_projects, is_custom")
          .order("monthly_price_inr", { ascending: true, nullsFirst: false }),
        supabase.from("plan_features").select("plan_id, feature_key, enabled"),
      ]);

      if (cancelled) return;
      if (plansRes.error) {
        console.error("[PricingSection] failed to load plans:", plansRes.error);
      } else {
        setPlans(plansRes.data ?? []);
      }
      if (!featuresRes.error) {
        setFeatures(featuresRes.data ?? []);
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Never return null: #pricing is linked from the nav, the footer, the blog
  // CTA and the sitemap, and an unrendered section makes all of those scroll
  // nowhere. A failed plans query used to make the entire pricing section
  // vanish silently — the worst possible failure mode for the page whose job is
  // to sell.
  if (loading || plans.length === 0) {
    return (
      <section id="pricing" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/55 mb-3">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Plans built around your commissioning operation
          </h2>
          <p className="mt-6 text-white/60 text-[15px]">
            {loading ? 'Loading current plans…' : (
              <>
                Plan details are temporarily unavailable.{' '}
                <a href="#cta" className="text-[#60a5fa] underline">Ask us for pricing</a> and we will send it over.
              </>
            )}
          </p>
        </div>
      </section>
    );
  }

  // Real Offer markup, built from the live plan rows. The static
  // SoftwareApplication node in index.html deliberately carries no offers: it
  // used to claim price 0 INR, which is false for every paid plan, and a static
  // file cannot know prices that are edited from the admin panel.
  const offerJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'TestFlow by TestFlow',
    description: 'Substation commissioning management platform.',
    brand: { '@type': 'Brand', name: 'TestFlow' },
    offers: plans
      .filter(p => !p.is_custom && p.monthly_price_inr !== null)
      .map(p => ({
        '@type': 'Offer',
        name: p.name,
        description: p.description ?? undefined,
        price: String(p.monthly_price_inr),
        priceCurrency: 'INR',
        url: `https://optimustesting.com/#pricing`,
        availability: 'https://schema.org/InStock',
      })),
  };

  const featureKeys = Array.from(new Set(features.map((f) => f.feature_key)));
  const isEnabled = (planId: string, key: string) =>
    features.find((f) => f.plan_id === planId && f.feature_key === key)?.enabled ?? false;

  return (
    <section id="pricing" className="relative py-24 md:py-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offerJsonLd) }} />
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="font-mono text-[11px] uppercase tracking-widest text-white/55 mb-3">Pricing</div>
          <h2 className="text-3xl md:text-4xl font-semibold text-white tracking-tight">
            Plans built around your commissioning operation
          </h2>
        </div>

        {/* sm: step added — four plan cards jumping straight from one column to
            four at 768px left each card about 117px of content width. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const isPopular = plan.slug === "professional";
            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 flex flex-col ${
                  isPopular
                    ? "border-[#3b82f6]/50 bg-[#3b82f6]/[.06] relative"
                    : "border-white/12 bg-white/[.03]"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest bg-[#3b82f6] text-white px-3 py-1 rounded-full">
                    Most popular
                  </div>
                )}
                <div className="text-white font-semibold text-lg">{plan.name}</div>
                <div className="mt-2 text-2xl font-semibold text-white">
                  {formatPrice(plan.monthly_price_inr, plan.is_custom)}
                  {!plan.is_custom && <span className="text-sm font-normal text-white/55">/mo</span>}
                </div>
                <p className="mt-2 text-[13px] text-white/55 flex-1">{plan.description}</p>
                <div className="mt-4 text-[13px] text-white/70 space-y-1">
                  <div>{plan.max_users ?? "Unlimited"} users</div>
                  <div>{plan.max_active_projects ?? "Unlimited"} active projects</div>
                </div>
                <a
                  href={plan.is_custom ? "#cta" : appUrl(`/start-trial?plan=${plan.slug}`)}
                  className={`mt-5 text-center text-[13.5px] font-medium px-4 py-2.5 rounded-lg transition ${
                    isPopular
                      ? "btn-primary text-white"
                      : "border border-white/15 text-white/85 hover:border-white/30"
                  }`}
                >
                  {plan.is_custom ? "Contact sales" : (CTA_LABEL[plan.slug] ?? "Start free trial")}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <button
            type="button"
            aria-expanded={compareOpen}
            aria-controls="plan-feature-comparison"
            onClick={() => setCompareOpen((v) => !v)}
            className="text-[13px] font-mono uppercase tracking-widest text-white/55 hover:text-white underline underline-offset-4"
          >
            {compareOpen ? "Hide feature comparison" : "Compare all features"}
          </button>
        </div>

        {compareOpen && (
          <div id="plan-feature-comparison" className="mt-8 overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <caption className="sr-only">Feature comparison across all plans</caption>
              <thead>
                <tr className="border-b border-white/12">
                  <th scope="col" className="text-left py-3 text-white/60 font-normal">Feature</th>
                  {plans.map((p) => (
                    <th scope="col" key={p.id} className="text-center py-3 text-white/85 font-medium">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((key) => (
                  <tr key={key} className="border-b border-white/[.06]">
                    <th scope="row" className="py-3 text-white/70 font-normal text-left">{featureLabel(key)}</th>
                    {plans.map((p) => (
                      <td key={p.id} className="text-center py-3">
                        {/* The icon and the dash carry the entire meaning of the
                            cell, so each needs a text equivalent — a screen
                            reader otherwise reads a grid of empty cells. */}
                        {isEnabled(p.id, key) ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-[#3b82f6] inline" aria-hidden="true" />
                            <span className="sr-only">Included in {p.name}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-white/30" aria-hidden="true">—</span>
                            <span className="sr-only">Not included in {p.name}</span>
                          </>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
