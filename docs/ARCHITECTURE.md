# Architecture

Guangxi Shaheen Sky Trading Co., Ltd. (广西沙欣斯凯商贸有限责任公司) — international B2B trading & sourcing website
and the foundation of a future trade platform.

This document is the contract for everyone (people and agents) building the site. When code and this
document disagree, fix one of them in the same change.

## 1. Principles

1. **One canonical implementation.** No parallel architectures, no dead code paths.
2. **Truthful by construction.** No invented company facts, products, prices, statistics, clients,
   certifications, offices, or contact details (§9). Empty states are honest, not placeholders.
3. **Server Components by default.** Client Components only for real interactivity (menus, forms,
   dialogs, motion). Keep client bundles small.
4. **Works without a database for public content.** Company, services, categories, FAQ, legal and
   process pages are static. The database backs inquiries, contact messages, products, news, media,
   admin users and audit logs. Without `DATABASE_URL`, DB-backed pages render an honest empty/error state and
   forms return a clear error — never a fake success.
5. **Secure by default, authorised on the server.** Hiding a button is never access control.
6. **Accessible, RTL-correct, fast.** WCAG 2.2 AA intent; Arabic is designed for, not mirrored by accident.

## 2. Stack

Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript 6 strict, Tailwind CSS 4,
Radix primitives (`radix-ui`) + `class-variance-authority` (shadcn-style components we own), Lucide,
`motion` (Framer Motion), `next-intl` 4, Zod 4, `react-hook-form`, Prisma 7 with the SQL Server driver
adapter (`@prisma/adapter-mssql`) targeting **SQL Server / Azure SQL**, Vitest + Testing Library, Playwright.

> Next.js 16 differs from older versions (async `params`, `proxy.ts` instead of `middleware.ts`,
> generated `PageProps`/`LayoutProps`). Read `node_modules/next/dist/docs/` before using an API from memory.

Deliberate version notes:

- TypeScript is pinned to 6.x because `typescript-eslint` does not yet support TypeScript 7.
- `next.config.ts` declares the `next-intl/config` alias directly instead of calling
  `createNextIntlPlugin` (which eagerly loads a native SWC addon at config time).

## 3. Routing & i18n

- Locales: `en` (default), `zh` (Simplified), `ar` (RTL). URLs are always prefixed: `/en/...`.
- `src/proxy.ts` (next-intl) negotiates/prefixes locales; it excludes `/api`, `/admin`, `/media`, `/files`, `/_next`, `/apple-icon`
  and any path with a file extension (`src/proxy.test.ts` guards the matcher).
- **Keep public pages static.** `getTranslations`/`getMessages` called without an explicit `locale` fall back to reading request
  headers, which turns the whole `[locale]` tree dynamic. Pass `{ locale, namespace }` in server code. `loading.tsx` receives no
  params, so it can only be translated from a Client Component (`useTranslations`). After touching the layout tree, check that
  `npm run build` still lists `/en`, `/zh` and `/ar` as `●` (SSG).
- **Real 404 status.** There is deliberately no `loading.tsx` at `[locale]` level: its Suspense boundary starts streaming before
  `notFound()` throws, so every unknown URL would answer `200` (a soft 404; `scripts/smoke-routes.mjs` expects `404`). Add
  `loading.tsx` only to a DB-backed section (products, news) and accept that a missing slug there is a `200` with `noindex`.
- Public site: `src/app/(site)/[locale]/...` (its layout is a root layout: owns `<html lang dir>`).
- Admin: `src/app/(admin)/admin/...` (its own root layout; English only, never indexed).
- Metadata routes (`sitemap.ts`, `robots.ts`, `manifest.ts`) live at `src/app/`.
- In every page/layout/generateMetadata: `const locale = assertLocale((await params).locale); setRequestLocale(locale);`
  (`@/i18n/assert-locale`). Use `Link`, `redirect`, `usePathname`, `useRouter` from `@/i18n/navigation` — never `next/link` for public pages.
- Messages: `src/messages/<locale>/<namespace>.json`; namespaces are listed in `src/i18n/namespaces.ts`
  and typed from the **English** files (`src/i18n/messages.ts`). Every key must exist in all three
  locales with the same structure (enforced by `src/i18n/messages.test.ts`).
  Adding a namespace = add the JSON for all locales + register in `namespaces.ts` and `messages.ts`.
- Each page namespace has a `meta` object: `{ "meta": { "title": "...", "description": "..." } }`.
- Client Components get only the namespaces they need: wrap them in a `NextIntlClientProvider` with
  `messages` picked from the request messages, or pass translated strings as props. Do not ship whole catalogues to the client.
- Use ICU for plurals and rich text (`t.rich`) instead of string concatenation.
- **Arabic/RTL:** use logical utilities only (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`,
  `text-start`, `border-s`, `rounded-s`, …). Never `left/right/ml/mr/pl/pr/text-left/text-right`. Directional icons get
  the `rtl-flip` class. Numbers, Latin brand names and the license text are wrapped in `<bdi>` / `dir="ltr"` where needed.
  Uppercase/letter-spacing utilities do nothing for Arabic/Chinese (handled in `globals.css`).
- **Chinese:** platform CJK font stack; body line-height 1.85; no synthetic bold/italics; use full-width punctuation.
- **English copy uses American spelling** (license, mold, jewelry, center, color), matching the brief and the glossary.
- **Keep pages static.** Every server call that reads translations passes an explicit `locale`
  (`getTranslations({ locale, namespace })`, `getMessages({ locale })`); without it next-intl reads request
  headers and the whole `[locale]` tree becomes dynamic. Pages never render their own `<main>` (the layout
  owns it). Pages with per-language slugs (news, products) render `<AlternateLocalePaths />` so the language
  switcher points at real URLs. Do not add `loading.tsx` at the `[locale]` level (unknown URLs would answer
  200 instead of 404); DB-backed sections may add their own client-component `loading.tsx`.

### Translation glossary (use these terms consistently)

| English                    | 简体中文         | العربية                                                   |
| -------------------------- | ---------------- | --------------------------------------------------------- |
| Brand: Shaheen Sky         | 沙欣斯凯         | شاهين سكاي (brand rendering only — not a registered name) |
| International trading      | 国际贸易         | التجارة الدولية                                           |
| Import & export            | 进出口           | الاستيراد والتصدير                                        |
| Product sourcing           | 产品寻源         | البحث عن المنتجات ومصادر التوريد                          |
| Supplier coordination      | 供应商协调       | التنسيق مع الموردين                                       |
| Business procurement       | 商业采购         | المشتريات التجارية                                        |
| Cross-border trade         | 跨境贸易         | التجارة عبر الحدود                                        |
| Business inquiry / RFQ     | 商务询盘         | استفسار تجاري                                             |
| Send an inquiry            | 发送询盘         | أرسل استفسارًا                                            |
| Request a quote            | 获取报价         | اطلب عرض سعر                                              |
| Submit trade inquiry       | 提交贸易询盘     | إرسال الاستفسار التجاري                                   |
| Registered capital         | 注册资本         | رأس المال المسجَّل                                        |
| Unified Social Credit Code | 统一社会信用代码 | رمز الائتمان الاجتماعي الموحَّد                           |
| Legal representative       | 法定代表人       | الممثل القانوني                                           |
| Business scope             | 经营范围         | نطاق النشاط التجاري                                       |
| Registered address         | 注册地址（住所） | العنوان المسجَّل                                          |
| Business license           | 营业执照         | الرخصة التجارية                                           |
| Typical trade process      | 典型贸易流程     | مسار التجارة المعتاد                                      |
| Product categories         | 产品类别         | فئات المنتجات                                             |
| Buyers / importers         | 采购商 / 进口商  | المشترون / المستوردون                                     |

Legal/registered names (English + Chinese) are never translated or transliterated. Arabic pages show them
verbatim, marked `dir="ltr"` / `lang="en"` / `lang="zh-CN"`.

## 4. Content model — what is code vs. what is data

| Content                                        | Where                                                  | Why                                                                           |
| ---------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Company facts                                  | `src/config/company.ts`                                | Transcribed from the license; changes only with a new license.                |
| Registered business scope (40 items)           | `src/config/business-scope.ts`                         | Legally sensitive; verbatim; tested against a golden string.                  |
| Product categories (12)                        | `src/content/categories.ts` (+ `categories` namespace) | Derived from scope groups; drive routes/SEO; must render without DB.          |
| Services (6)                                   | `src/content/services.ts` (+ `services` namespace)     | Each has a hand-authored page.                                                |
| Trade process (8 steps)                        | `src/content/process.ts` (+ `globalTrade` namespace)   | Static.                                                                       |
| FAQ                                            | `faq` namespace                                        | Static, reviewed copy; FAQPage JSON-LD.                                       |
| Legal pages                                    | `legal` namespace                                      | Marked for legal review.                                                      |
| Products, images, specs, documents             | Database                                               | Real catalogue arrives later. **Never seeded with fiction.**                  |
| News                                           | Database                                               | Real posts arrive later. Never seeded.                                        |
| Inquiries, contact messages                    | Database                                               |                                                                               |
| Users, roles, permissions, sessions, audit log | Database                                               |                                                                               |
| Site settings (contact channels, etc.)         | Database (`SiteSetting`)                               | No contact details exist yet; configurable in admin.                          |
| SEO overrides                                  | Database (`SeoMetadata`)                               | Optional per-page/entity overrides.                                           |
| Media (images, documents, attachments)         | Database (`MediaAsset` + `MediaBlob`)                  | Zero extra infrastructure; swap the storage service for object storage later. |

The prompt's `Service`, `ProductCategory`, `FAQ` and `Translation` entities are intentionally **not tables**:
they are code-defined (above) and the admin lists them read-only ("managed in code"). The generic
`Translation` entity is replaced by per-entity translation tables plus an admin _translation coverage_ report.

Registered scope ≠ published products. Category pages state that categories are areas available for
sourcing and trade, not current stock. Regulated categories (`regulated: true`) show a compliance note.

## 5. Database

- Prisma schema: `prisma/schema.prisma` (SQL Server). Client is generated to `src/generated/prisma` (gitignored; `postinstall` runs `prisma generate`).
- Access only via `getDb()` from `@/server/db` (lazy; throws `DatabaseUnavailableError` if `DATABASE_URL` is missing).
  Wrap connection-level failures with `toDatabaseError`. Catch `DatabaseUnavailableError` at the edge (page/action) and show a truthful message.
- Enums are strings validated in code (`src/lib/domain/statuses.ts`); the initial migration adds `CHECK` constraints and inserts `InquiryStatus` rows.
- Repositories live in `src/server/<domain>/` and are `import "server-only"`. Public queries select only public columns —
  never internal notes, IP hashes, or private media.
- Optimistic concurrency: update with `where: { id, version }` and `version: { increment: 1 }`; surface a friendly conflict error.
- Migrations: `prisma/migrations/`. Apply with `npm run db:migrate` (`prisma migrate deploy`). Seed: `npm run db:seed` (idempotent; roles, permissions, status rows, optional super admin from env).

## 6. Security model

- **AuthN:** email + password (scrypt, OWASP parameters), server-side sessions (opaque token in an
  HttpOnly, Secure, SameSite=Lax cookie; only a SHA-256 hash stored), idle + absolute expiry, lockout after repeated failures, generic error messages.
- **AuthZ (RBAC):** roles `SUPER_ADMIN`, `ADMIN`, `CONTENT_MANAGER`, `SALES_MANAGER` → permissions. Every admin page, server action and route
  handler calls `requirePermission(...)` on the server. The layout redirect is a convenience, not the gate.
- **Forms:** Zod validation on client _and_ server (server is authoritative); honeypot + minimum-fill-time + rate limiting
  (per IP hash and per email) ; Origin check on non-action POST handlers (Server Actions have built-in Origin/Host checks).
- **Uploads:** allow-list by _detected_ signature (PDF, JPEG, PNG, WebP, DOCX, XLSX), size cap, sanitised display name, never trusted client MIME/extension,
  random IDs, `Content-Disposition`/`X-Content-Type-Options: nosniff`, private files only through authorised routes.
- **PII:** IPs stored only as HMAC hashes; logs never contain secrets or full personal data; internal notes never selected by public queries.
- **Headers:** CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame-ancestors none — configured in `next.config.ts`.
- **Secrets:** env only (`.env.example` documents them). Nothing secret uses `NEXT_PUBLIC_`.
- **Audit:** state-changing admin actions and status changes write `AuditLog`.

## 7. Design system

Tokens live in `src/app/globals.css` (`@theme`): navy (primary), professional blue (secondary), subtle gold (accent), neutrals;
modest radii (≤ 8px), two quiet shadow levels, light theme only. Type scale utilities: `text-display`, `text-h1..h3`,
`text-body-lg`, `text-body`, `text-small`, `text-caption`, `text-label`, `text-button`, `text-eyebrow`.
Fonts: IBM Plex Sans (Latin), IBM Plex Sans Arabic, platform CJK stack.

Components (`src/components/ui`) are ours (Radix + cva), RTL-safe, keyboard-accessible, with visible focus. Layout primitives in
`src/components/layout`. Motion via `motion` in small client wrappers only, always honouring `prefers-reduced-motion`; no perpetual animation.
Imagery is **vector/typographic** (no stock photos that imply facilities or clients we do not have). Any representative image must be
swappable for real company photography via a single component (`ImageSlot`).
Class names are merged with the one `cn` in `@/lib/utils` (it knows our type-scale utilities; do not add another).

## 8. Folder structure

```
prisma/                 schema, migrations, seed
scripts/                CLI utilities (create-admin, world-map generator, route smoke test, env loader)
docs/                   this file
public/                 static assets (documents/business-license.png, icons)
src/
  app/
    (site)/[locale]/    public site (root layout with <html>)
    (admin)/admin/      admin (root layout, English only)
    api/                minimal route handlers (health, private file download, ...)
    sitemap.ts robots.ts manifest.ts globals.css
  components/
    ui/                 design-system primitives
    layout/             Container, Section, PageHero, Prose
    brand/              Logo, wordmark
    graphics/           vector art, world map, ImageSlot
    motion/             Reveal, FadeIn (reduced-motion aware)
    analytics/          Plausible loader, TrackOnMount
    site/               Header, Footer, MobileNav, LanguageSwitcher
    forms/              InquiryForm, ContactForm, form fields wiring
    <feature>/          feature components (home, products, company, ...)
  config/               company facts, business scope, routes, site, navigation
  content/              categories, services, process (code-defined content registries)
  i18n/                 routing, request, navigation, messages loader
  lib/                  isomorphic utilities (utils, seo helpers, domain constants, validation schemas)
  messages/{en,zh,ar}/  translation namespaces
  server/               server-only code: db, security, auth, repositories, actions
  generated/prisma/     generated client (gitignored)
```

## 9. Honesty rules (from the brief — non-negotiable)

Never invent: employees, offices, warehouses, factories, revenue, customer counts, countries served, certifications, awards,
partnerships, supplier relationships, shipping volumes, market share, years of experience, inventory, MOQ, prices, lead times,
testimonials, client logos, government relationships, international offices, email/phone/WhatsApp/domain.
Registered capital is **RMB 50,000** (伍万人民币元整) — not 5 million. Founded 2026-06-18.
"Typical Trade Process" is labelled typical. No "leading", "trusted by", "best", "#1" claims. No "Coming soon".
No fake AI features. No fake analytics. No dead buttons/links. Do not use the state emblem/seal as a logo.

## 10. Testing & verification

`npm run check` = typecheck (`next typegen && tsc`) + ESLint + Vitest. Also `npm run build`.
Code that touches the database is tested with mocked Prisma (`vi.mock("@/server/db")`); no live SQL Server is required.

### End-to-end (Playwright, `e2e/`, `npm run e2e`)

Runs against a real `next build && next start` (never `next dev`: a cold per-route compile can take longer than is
reasonable to wait for in a test), with a fixed test-only `AUTH_SECRET` and **no `DATABASE_URL`** — deliberately, so the
suite proves the "never a fake success" rule holds for real HTTP requests and a real browser, not only for a mocked
Prisma client. Two projects: `desktop` (1440×900) and `mobile` (a phone viewport); `navigation.spec.ts` is desktop-only
(it exercises the always-visible header nav) and `mobile.spec.ts` is mobile-only (it exercises `MobileNav`'s drawer,
hidden above `xl`) — see the `testIgnore` entries in `playwright.config.ts`.

| Spec                           | Proves                                                                                                                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `navigation.spec.ts`           | Header/footer links resolve to real routes; every category and service page returns 200; unknown paths 404; license-derived facts render (RMB 50,000, never 5,000,000).                                                                                                                           |
| `language-and-rtl.spec.ts`     | Each locale renders its own translated `<h1>` with correct `lang`/`dir`; the language switcher moves to the same page; hreflang alternates cover en/zh-CN/ar/x-default; Arabic pages ship **zero** physical-direction Tailwind classes; Radix widgets (the FAQ accordion) work under `dir="rtl"`. |
| `mobile.spec.ts`               | The drawer opens/closes (incl. Escape returning focus), lists the full nav, a submenu expands, the inquiry CTA works, and key pages have no horizontal overflow at 360px.                                                                                                                         |
| `forms-honest-failure.spec.ts` | A real inquiry/contact submission with no database shows the honest `errors.form.databaseUnavailable` message — never a fake reference code — and client-side validation blocks an invalid submission before it ever reaches the server.                                                          |
| `admin.spec.ts`                | An unauthenticated `/admin` redirects to login; without a database, sign-in is disabled with an honest explanation, never a raw crash; admin responses carry `X-Robots-Tag: noindex, nofollow`; `/api/health` reports `database: "not_configured"` truthfully.                                    |
| `accessibility.spec.ts`        | Zero axe (WCAG 2.1 A/AA) violations across every key public page in all three locales, the admin sign-in page, and two pages after interaction (an opened accordion, a submitted form).                                                                                                           |

Locally this uses the system-installed Chrome (`channel: "chrome"`) because the sandbox this project was built in cannot
reach the Playwright CDN to download its own browser; CI installs Playwright's pinned Chromium instead
(`npx playwright install --with-deps chromium`) — see `.github/workflows/ci.yml`.

Two real defects were found and fixed this way, not by unit tests: `src/proxy.ts`'s matcher losing a backslash inside a
plain JS string (§3, now covered by `src/proxy.test.ts`), and `src/app/(admin)/admin/not-found.tsx` swallowing every
error from `getSession()` — including Next's own dynamic-rendering bailout signal — instead of re-throwing anything
that is not a recognised `DatabaseUnavailableError` (now covered by a regression test in `not-found.test.tsx`). Both
are a reminder that `tsc`/ESLint/Vitest cannot see the App Router's client/server boundary or its build-time static
analysis; only `next build` and a real running server can.
