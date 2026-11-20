# Optimus Testing (TestFlow)

Multi-tenant web platform for electrical substation commissioning: test planning, field execution, review and approval, and report generation, replacing paper test sheets and spreadsheets.

**4 roles · 8 equipment types · 46 test templates · 4 dashboards**

> This is a sanitized public extract of a private production codebase. Customer data, sales material, deployment workflows and some operational functions were removed, so it is meant to be read, not deployed as is.

## What it does

- **Plan** commissioning projects by equipment type, with 46 ready test templates.
- **Execute** tests in the field and record results against each equipment item.
- **Review** results through role-based approval and rework flows.
- **Report** with AI-assisted report generation (Anthropic Claude API) from recorded results.
- **Multi-tenant**: each company gets its own isolated workspace (Postgres row-level security), with a platform admin layer for tenants and subscriptions.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Database | Supabase Postgres with row-level security, 90+ migrations |
| Auth | Supabase Auth (email/password and Google OAuth) |
| Realtime | Supabase Realtime for live project updates |
| Backend | Supabase Edge Functions (Deno): tenant and user admin, report generation, trials, subscriptions, retention cleanup, health |
| AI | Anthropic Claude API |
| Testing | Vitest unit tests, Playwright end-to-end golden path, Deno tests for server code, k6 and Node load tests |

## Repository layout

```
frontend/      React SPA (pages, components, hooks, Playwright e2e)
supabase/      migrations (schema, RLS) and edge functions
load-test/     k6 and Node scripts: concurrency, realtime fan-out, seeding
packages/      shared code
mobile/        Expo React Native client (offline-aware, realtime, plan limits)
```

## Engineering highlights

- Tenant isolation enforced in the database with RLS policies, not only in app code.
- Atomic tenant creation (company plus first admin) in a single edge function.
- Load tests covering concurrent writers and realtime fan-out, with a guard that refuses to run against production.
- End-to-end golden path test covering the main user journey.

## Running the frontend locally

```bash
cd frontend
npm install
cp ../.env.example .env   # set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for your own Supabase project
npm run dev               # http://localhost:8080
```

Built by [Parakh Sharma](https://github.com/Parakh20).
