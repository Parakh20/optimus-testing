// Policy pages required for Razorpay's website review (and generally for
// selling a subscription online in India). Razorpay's reviewer checklist
// explicitly requires that the business name used here matches the name the
// Razorpay account is registered under — see LEGAL_ENTITY below.
//
// These are plain content pages with no auth and no data access, served on
// the marketing host.
import { type ReactNode } from 'react';
import { Seo } from '@/components/Seo';
import { SUPPORT_EMAIL } from '@/lib/contact';

// ─────────────────────────────────────────────────────────────────────────
// Sole proprietorship: the proprietor is the legal entity, so LEGAL_ENTITY is
// the proprietor's name and must match the Razorpay account registration
// exactly — Razorpay rejects submissions where the two differ.
// ─────────────────────────────────────────────────────────────────────────
const LEGAL_ENTITY = 'Parakh Sharma';
const CONTACT_EMAIL = SUPPORT_EMAIL;
const CONTACT_PHONE = '+91 94135 52887';
const CONTACT_ADDRESS = 'Hostel 4, IIT Bombay, Powai, Mumbai 400076, Maharashtra, India';
const LAST_UPDATED = '23 August 2026';
const GOVERNING_STATE = 'Maharashtra';

const PRODUCT = 'TestFlow';

function LegalLayout({
  title,
  path,
  description,
  children,
}: {
  title: string;
  /** Route this page is served at — drives its canonical URL. */
  path: string;
  /** Meta description; without one every policy page inherits the home page's. */
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white px-6 py-16">
      <Seo title={`${title} | ${PRODUCT} by TestFlow`} description={description} path={path} />
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-white/50 text-sm hover:text-white">← Back to {PRODUCT}</a>
        <main>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-white/60 text-sm">Last updated: {LAST_UPDATED}</p>
          <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-white/70 [&_h2]:text-white [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-8 [&_h2]:mb-2 [&_a]:text-[#60a5fa] [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
            {children}
          </div>
        </main>
        <footer className="mt-12 border-t border-white/10 pt-6 text-sm text-white/55">
          <p>{PRODUCT} is operated by {LEGAL_ENTITY}.</p>
          <p className="mt-1">Questions? <a href="/contact" className="text-[#60a5fa]">Contact us</a>.</p>
          <nav aria-label="Policies" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            <a href="/terms" className="hover:text-white">Terms</a>
            <a href="/privacy" className="hover:text-white">Privacy</a>
            <a href="/cookies" className="hover:text-white">Cookies</a>
            <a href="/refund-policy" className="hover:text-white">Refund &amp; Cancellation</a>
            <a href="/contact" className="hover:text-white">Contact</a>
          </nav>
        </footer>
      </div>
    </div>
  );
}

export function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      path="/terms"
      description="The terms governing use of TestFlow: workspaces and roles, the 14-day trial, prepaid plan periods with no auto-renewal, data ownership, acceptable use and liability."
    >
      <p>
        These terms govern your use of {PRODUCT}, a commissioning management platform for
        electrical substation testing, operated by {LEGAL_ENTITY} ("we", "us"). By creating a
        workspace or using the service, you agree to them.
      </p>

      <h2>1. Accounts and workspaces</h2>
      <p>
        Each customer organisation gets a workspace. The person who creates it becomes its
        administrator and is responsible for who they invite and what those users do. You must
        provide accurate information and keep credentials secure. You are responsible for all
        activity under your workspace.
      </p>

      <h2>2. Trial</h2>
      <p>
        New workspaces include a 14-day trial. No payment details are required to start a trial.
        When the trial ends without a purchase, the workspace becomes <strong>read-only</strong>:
        you and your team keep full access to view, search and export everything already recorded,
        but new test records cannot be written until you buy a plan period.
      </p>

      <h2>3. Payment and plan periods</h2>
      <ul>
        <li>
          You buy a plan period — one month or one year — <strong>up front, as a single
          payment</strong>, in Indian Rupees (INR).
        </li>
        <li>
          <strong>There is no auto-renewal and no auto-debit mandate.</strong> Nothing is ever
          charged to you automatically. When a period is approaching its end we email your
          workspace administrators; buying the next period is always a deliberate action you take.
        </li>
        <li>Current prices are shown on our pricing page and are inclusive of applicable taxes unless stated otherwise.</li>
        <li>Payments are processed by Razorpay. We do not receive or store your card details.</li>
        <li>Plan limits (users, active projects) are enforced by the platform. Exceeding them requires a larger plan or an add-on.</li>
        <li>Add-ons (for example extra user seats) are separate one-time purchases that apply to your workspace once payment is confirmed.</li>
      </ul>

      <h2>4. Renewing and changing plan</h2>
      <p>
        Because each period is bought outright, there is no ongoing subscription to upgrade,
        downgrade or cancel. Renewing simply means buying the next period, and you may buy it on a
        different plan than the one you are on. Renewing before your current period ends extends
        from your existing end date rather than from the day you pay, so you never lose days by
        paying early; if a workspace has already lapsed, the new period starts on the day of
        purchase. See our <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
      </p>

      <h2>5. Your data</h2>
      <p>
        You retain ownership of the test records, project data and documents you put into
        {' '}{PRODUCT}. We process it to provide the service, as described in our{' '}
        <a href="/privacy">Privacy Policy</a>. You can export project data at any time in Excel or
        PDF format.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Attempt to access another organisation's workspace or data.</li>
        <li>Probe, scan or test the vulnerability of the service without written permission.</li>
        <li>Resell or white-label the service without a written agreement.</li>
        <li>Upload unlawful content, or content you lack the right to store.</li>
      </ul>

      <h2>7. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service. Planned
        maintenance will be communicated where practical. The service is provided "as is" without
        warranties beyond those that cannot be excluded under applicable law.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        {PRODUCT} is a record-keeping and workflow tool. It does not certify equipment, replace
        professional engineering judgement, or assume responsibility for commissioning decisions.
        To the extent permitted by law, our total liability in any 12-month period is limited to
        the fees you paid us in that period.
      </p>

      <h2>9. Lapse, suspension and termination</h2>
      <p>
        When a paid period ends and is not renewed, the workspace becomes <strong>read-only</strong>:
        existing projects, test records and reports stay visible and exportable, and only the
        creation of new records is blocked. We may fully suspend a workspace for breach of these
        terms. You may stop using the service at any time simply by not buying another period —
        there is nothing to cancel. On termination we retain your data for a limited period to
        allow export, after which it may be deleted in line with our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update these terms. Material changes will be notified to workspace administrators
        by email. Continued use after the change takes effect constitutes acceptance.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of India, with exclusive jurisdiction in the courts
        of {GOVERNING_STATE}.
      </p>
    </LegalLayout>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      path="/privacy"
      description="What TestFlow collects, why, who processes it, how long it is kept, and how to exercise your data rights under GDPR and India's DPDP Act."
    >
      <p>
        This policy explains what {LEGAL_ENTITY} collects when you use {PRODUCT}, why, and what
        control you have over it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> name, work email, company name, and (optionally) phone, company size, industry and country provided at signup.</li>
        <li><strong>Workspace content:</strong> projects, equipment records, test measurements, and reports you create.</li>
        <li><strong>Usage data:</strong> log entries, audit records of significant actions, and error diagnostics.</li>
        <li><strong>Payment data:</strong> handled by Razorpay. We receive subscription status and invoice metadata, never full card details.</li>
      </ul>

      <h2>Why we process it</h2>
      <ul>
        <li>To provide the service and keep each organisation's data isolated.</li>
        <li>To bill you and maintain records required by law.</li>
        <li>To provide support and investigate faults.</li>
        <li>To send service messages such as email confirmation and rework notifications.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>
        We do not sell personal data and we do not share it for advertising. We use the following
        sub-processors, each only for the purpose stated:
      </p>
      <ul>
        <li><strong>Supabase</strong> — application database, authentication and file storage.</li>
        <li><strong>Vercel</strong> — application hosting, and privacy-friendly aggregate traffic analytics that use no cookies and build no cross-site profile.</li>
        <li><strong>Razorpay</strong> — payment processing.</li>
        <li><strong>Resend</strong> — transactional email delivery (sign-up confirmation, rework notices, renewal reminders).</li>
        <li>
          <strong>Anthropic</strong> — AI report drafting. This runs only when a manager explicitly
          asks for a report, and it sends the project's test data to Anthropic for that purpose. If
          you would rather no workspace content ever leave for AI processing, do not use the report
          generator; every other part of the platform works without it.
        </li>
        <li><strong>Sentry</strong> — error diagnostics. Sentry receives error reports that may include the signed-in user's id and email, the page in use, and IP address; when an error occurs it may also record a masked replay of the preceding interaction, in which text content is obscured by default.</li>
        <li><strong>Google Fonts</strong> — web fonts are fetched from Google's servers when a page loads, which makes your IP address and browser details visible to Google.</li>
      </ul>

      <h2>Where your data is processed</h2>
      <p>
        Our infrastructure providers operate globally, so your data may be processed on servers
        outside India, including in the European Union and the United States. Where that happens we
        rely on the provider's contractual data-protection commitments, including standard
        contractual clauses where applicable.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. Access is enforced at the database level so users can only
        reach their own organisation's records. Significant actions are recorded in an audit
        trail. Sessions time out after 30 minutes of inactivity.
      </p>

      <h2>Retention</h2>
      <p>
        Workspace content is retained while your account is active. Deleted projects and records
        are retained for 90 days before permanent removal. Audit records are archived after 180
        days. Records we must keep for tax or accounting purposes are retained as required by law.
      </p>

      <h2>Your rights</h2>
      <p>
        You may request a copy of the personal data associated with your account, or ask for it to
        be erased. Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on
        the account, or ask your workspace administrator to raise it on your behalf; we action it
        within 30 days. You may also correct inaccurate details, and object to or restrict specific
        processing.
      </p>
      <p>
        Two limits worth stating plainly. Erasure anonymises your personal details but{' '}
        <strong>preserves the test records themselves</strong>, which form a commissioning and audit
        trail your organisation — and often its client or the utility — is required to keep. And an
        export or erasure covers your personal data, not your employer's workspace content: the
        organisation is the controller of that, and requests about it come from its administrators.
      </p>

      <h2>Cookies</h2>
      <p>
        We use cookies strictly to keep you signed in across our application subdomains. We set no
        advertising cookies and no cross-site tracking cookies. Full detail, including the names
        and lifetimes of every cookie we set, is in our <a href="/cookies">Cookie Policy</a>.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        If a security incident affects your personal data, we will notify affected workspace
        administrators and the relevant authority without undue delay once we have established the
        scope, and tell you what happened and what to do about it.
      </p>

      <h2>Children</h2>
      <p>
        {PRODUCT} is a workplace tool sold to organisations. It is not directed at children and we
        do not knowingly collect personal data from anyone under 18.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy. Material changes will be notified to workspace administrators by
        email, and the "last updated" date above always reflects the current version.
      </p>

      <h2>Contact and grievances</h2>
      <p>
        Questions about this policy, or to exercise any of the rights above:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
      <p>
        Under India's Digital Personal Data Protection Act, the Grievance Officer for {PRODUCT} is{' '}
        <strong>{LEGAL_ENTITY}</strong>, reachable at{' '}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or {CONTACT_PHONE}, at the address
        published on our <a href="/contact">Contact page</a>. We acknowledge grievances within 3
        business days and aim to resolve them within 30 days.
      </p>
    </LegalLayout>
  );
}

export function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund &amp; Cancellation Policy"
      path="/refund-policy"
      description="How cancellation and refunds work for TestFlow: periods are prepaid with no auto-renewal, so there is nothing to cancel. When we do issue a refund, and how to ask."
    >
      <p>
        This policy explains how cancellation and refunds work for {PRODUCT} plan periods sold by
        {' '}{LEGAL_ENTITY}.
      </p>

      <h2>Free trial</h2>
      <p>
        Every new workspace starts with a 14-day trial. No payment details are required, and no
        charge is made during the trial. We encourage you to evaluate the platform fully before
        you buy a period.
      </p>

      <h2>Cancellation</h2>
      <p>
        {PRODUCT} is sold as <strong>prepaid periods, not a recurring subscription</strong>. You
        buy one month or one year up front as a single payment. There is no auto-debit mandate and
        nothing is ever charged automatically, so <strong>there is nothing to cancel</strong>.
      </p>
      <ul>
        <li>To stop, simply do not buy another period. No notice or action is required.</li>
        <li>You keep full access until the end of the period you paid for.</li>
        <li>
          After that the workspace becomes <strong>read-only</strong> — your projects, test records
          and reports stay visible and can still be exported to Excel and PDF. Only the creation of
          new records is blocked.
        </li>
        <li>Buying a period again at any later date restores full access.</li>
      </ul>

      <h2>Refunds</h2>
      <p>
        Because access continues for the full period you have paid for, and because that period is
        purchased outright rather than billed in arrears, we do <strong>not</strong> provide
        pro-rata refunds for its unused portion.
      </p>
      <p>We will issue a refund in these circumstances:</p>
      <ul>
        <li><strong>Duplicate charge</strong> — billed more than once for the same period.</li>
        <li><strong>Billing error</strong> — charged an incorrect amount, or charged after a confirmed cancellation.</li>
        <li><strong>Failed access</strong> — a sustained platform fault prevented you from using the service for a significant part of a billing period, and we could not resolve it.</li>
      </ul>

      <h2>How to request a refund</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with your workspace name and
        the invoice in question. We respond within 3 business days. Approved refunds are returned
        to the original payment method via Razorpay, typically within 5–7 business days depending
        on your bank or card issuer.
      </p>

      <h2>Changing plan</h2>
      <p>
        Each period is a separate purchase, so there is no proration to calculate and no upgrade or
        downgrade fee. When you buy your next period you simply choose whichever plan you want, and
        it applies from the start of that period. Buying early extends from your current end date
        rather than replacing it, so nothing you have already paid for is lost.
      </p>

      <h2>Add-ons</h2>
      <p>
        Add-ons (for example extra user seats) are one-time purchases applied to your workspace as
        soon as payment is confirmed. Because the entitlement is granted immediately and cannot be
        un-granted retrospectively, add-ons are non-refundable except in the billing-error and
        duplicate-charge circumstances listed above.
      </p>

      <h2>Annual periods</h2>
      <p>
        An annual period follows the same terms as a monthly one: access runs to the end of the
        paid year, after which the workspace becomes read-only unless renewed, and unused months
        are not refunded except in the circumstances listed above.
      </p>
    </LegalLayout>
  );
}

export function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      path="/cookies"
      description="Which cookies TestFlow sets, what each one does, and why we do not show a consent banner: every cookie we set is strictly necessary to keep you signed in."
    >
      <p>
        This page lists every cookie {PRODUCT} sets and what it does. We set no advertising
        cookies, no cross-site tracking cookies, and no cookies belonging to a third party.
      </p>

      <h2>Why there is no cookie banner</h2>
      <p>
        Consent is required for cookies that are not strictly necessary — analytics that profile
        you, advertising, and cross-site tracking. We use none of those. Every cookie below exists
        solely to deliver a service you asked for by signing in, which is the "strictly necessary"
        exemption under the ePrivacy Directive and equivalent rules. A banner asking permission for
        cookies you cannot decline without breaking sign-in would be theatre, so we publish this
        page instead.
      </p>
      <p>
        Our traffic analytics are deliberately chosen to be <strong>cookieless</strong>: they count
        page views in aggregate and set nothing on your device. If we ever adopt a technology that
        does require consent, we will ask for it before it runs.
      </p>

      <h2>Cookies we set</h2>
      <ul>
        <li>
          <strong>Authentication session</strong> (names beginning <code>sb-</code> and ending
          <code>-auth-token</code>, sometimes split across numbered parts such as
          {' '}<code>…-auth-token.0</code>). Holds your signed-in session. Scoped to
          {' '}<code>.optimustesting.com</code> so one sign-in covers the application host and your
          company's subdomain. <code>SameSite=Lax</code> and <code>Secure</code>. Lifetime up to 12
          months; removed when you sign out.
        </li>
      </ul>
      <p>
        We also store your light/dark theme preference in your browser's local storage. That is not
        a cookie, is never sent to us, and never leaves your device.
      </p>

      <h2>Cookies set by others</h2>
      <p>
        When you pay, Razorpay's checkout runs on their own domain and sets its own cookies to
        process and secure the transaction, governed by Razorpay's privacy policy rather than ours.
        Web fonts are fetched from Google's servers, which does not set a cookie but does make your
        IP address visible to Google.
      </p>

      <h2>Controlling cookies</h2>
      <p>
        You can clear or block cookies in your browser settings. Blocking the authentication cookie
        will prevent you from signing in — there is no way to keep you signed in without it. The
        public marketing pages, including this one, work with all cookies blocked.
      </p>

      <h2>Questions</h2>
      <p>
        Contact <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, or read the fuller{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </LegalLayout>
  );
}

export function ContactUs() {
  return (
    <LegalLayout
      title="Contact Us"
      path="/contact"
      description="Reach the TestFlow team about TestFlow: support email, phone, registered address, and demo or enterprise pricing enquiries."
    >
      <p>
        We are happy to help with questions about the platform, billing, or a trial.
      </p>

      <h2>Support</h2>
      <p>
        Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><br />
        We aim to respond within one business day.
      </p>

      <h2>Phone</h2>
      <p>{CONTACT_PHONE}</p>

      <h2>Registered address</h2>
      <p className="whitespace-pre-line">{`${LEGAL_ENTITY}\n${CONTACT_ADDRESS}`}</p>

      <h2>Sales</h2>
      <p>
        For demos, pilots or enterprise pricing, use the enquiry form on our{' '}
        <a href="/#cta">home page</a> and we will get back to you within one business day.
      </p>
    </LegalLayout>
  );
}
