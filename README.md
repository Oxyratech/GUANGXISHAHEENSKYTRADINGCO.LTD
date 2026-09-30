# Guangxi Shaheen Sky Trading Co., Ltd.

**广西沙欣斯凯商贸有限责任公司** — website and future-ready B2B platform for an international trading and sourcing company registered in Nanning, Guangxi, China.

> _Connecting Global Markets Through Trade_

The site is multilingual (English, 简体中文, العربية with full RTL), statically rendered for speed and SEO, and
backed by an optional SQL Server / Azure SQL database for inquiries, contact messages, products, news and the admin area.

## Registered company facts

All company information comes from the company's Business License (营业执照) and lives in one place,
[`src/config/company.ts`](src/config/company.ts), with the 40-item business scope in
[`src/config/business-scope.ts`](src/config/business-scope.ts). Both are covered by tests (a golden copy of the printed
scope text; the Unified Social Credit Code check digit).

|                            |                                                       |
| -------------------------- | ----------------------------------------------------- |
| Company                    | GUANGXI SHAHEEN SKY TRADING CO., LTD.                 |
| 中文名称                   | 广西沙欣斯凯商贸有限责任公司                          |
| Legal representative       | AHMED ALI                                             |
| Type                       | 有限责任公司(外国自然人独资)                          |
| **Registered capital**     | **RMB 50,000** (伍万人民币元整)                       |
| Established                | 18 June 2026                                          |
| Registered address         | 南宁市青秀区桂雅路6号4栋1单元603号 (Nanning, Guangxi) |
| Unified Social Credit Code | 91450100MAKG57TE3Y                                    |

> The original brief stated registered capital as RMB 5,000,000. The license reads 伍万人民币元整, which is
> **RMB 50,000**, and the license is the source of truth. If the company's capital is different from what the license says,
> update the license first, then `src/config/company.ts`.

## What is (and is not) in the site

- **Nothing is invented.** No products, prices, statistics, clients, certifications, offices, or contact details exist in
  the codebase. Empty states say so honestly. Registered business scope is deliberately kept separate from
  currently published products.
- **Contact channels are unset until you provide them** (email, phone, WhatsApp). Set `CONTACT_EMAIL`, `CONTACT_PHONE`,
  `CONTACT_WHATSAPP` or use **Admin → Settings**. They then appear in the footer, the contact page and structured data.
- **No domain is assumed.** Set `NEXT_PUBLIC_SITE_URL` when a domain is owned. Until then the site is served `noindex`.
- **Legal pages are drafts** marked for review by qualified counsel; bracketed items are decisions for the company.

## Technology stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 6 (strict) · Tailwind CSS 4 · Radix primitives + CVA ·
Lucide · `motion` (Framer Motion) · `next-intl` 4 · Zod 4 · React Hook Form · Prisma 7 (SQL Server driver adapter) ·
Vitest + Testing Library · Playwright · ESLint · Prettier.

TypeScript is pinned to 6.x until `typescript-eslint` supports 7.

## Architecture in one page

- **Public site** (`src/app/(site)/[locale]`): Server Components by default, locale-prefixed URLs (`/en`, `/zh`, `/ar`),
  statically generated. Client code only for menus, forms, dialogs and light motion.
- **Static content** (code, translated): company facts, business scope, 12 product categories, 6 services, the trade
  process, FAQ, legal pages.
- **Database content**: inquiries, contact messages, products, news, media, users/roles, audit log, site settings.
- **Admin** (`src/app/(admin)/admin`): English-only, role-based, server-side authorization on every page and action.
- **Security**: scrypt passwords, hashed server sessions, RBAC, rate limiting, honeypot + signed time tokens,
  signature-verified uploads, audit log, CSP and security headers.

Full details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/DATABASE.md`](docs/DATABASE.md) ·
[`docs/SECURITY.md`](docs/SECURITY.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Folder structure

```
prisma/            schema, migrations, seed
scripts/           create-admin, world-map generator, route smoke test
docs/              architecture, database, security, deployment
public/            static assets (business license image, brand)
e2e/               Playwright specs
src/
  app/             (site)/[locale] public pages · (admin)/admin · api · metadata routes
  components/      ui · layout · motion · brand · graphics · site · forms · feature folders
  config/          company facts, business scope, routes, navigation, site
  content/         categories, services, trade-process registries
  i18n/            routing, request config, message loading
  lib/             utilities, SEO helpers, validation, analytics, logger
  messages/        en · zh · ar translation namespaces
  server/          server-only code: db, auth, security, storage, settings, repositories
```

## Getting started

Requirements: Node.js 22+ (developed on 24).

```bash
npm install            # also runs `prisma generate`
cp .env.example .env.local
npm run dev            # http://localhost:3000  → redirects to /en
```

The **public content pages work without a database**. Inquiries, contact messages, products, news and the admin area
need one (below); until `DATABASE_URL` is set those features report honestly that they are unavailable — they never
pretend to succeed.

## Environment variables

See [`.env.example`](.env.example) for the full annotated list.

| Variable                                               | Purpose                                                                           |
| ------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                 | Public origin (canonical URLs, sitemap, Open Graph). Unset ⇒ `noindex`.           |
| `DATABASE_URL`                                         | SQL Server / Azure SQL connection string (Prisma `sqlserver://` format).          |
| `AUTH_SECRET`                                          | 32+ random bytes; keys IP hashing and signed form tokens. Required in production. |
| `CONTACT_EMAIL` / `CONTACT_PHONE` / `CONTACT_WHATSAPP` | Public contact channels (none by default).                                        |
| `SMTP_*`, `INQUIRY_NOTIFY_EMAIL`                       | Optional new-inquiry notification email.                                          |
| `UPLOAD_MAX_BYTES`                                     | Attachment/image limit (default 5 MiB, max 7 MiB).                                |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`                         | Optional cookieless analytics.                                                    |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`             | Optional first Super Admin created by the seed.                                   |

Never commit real values; only `.env.example` is tracked.

## Database setup

Any SQL Server 2019+ or Azure SQL Database works. Details, including Azure provisioning and an ER diagram, are in
[`docs/DATABASE.md`](docs/DATABASE.md).

```bash
# .env.local → DATABASE_URL="sqlserver://<host>:1433;database=<db>;user=<user>;password=<pw>;encrypt=true"
npm run db:migrate     # applies prisma/migrations (0001_init, 0002_fk_indexes)
npm run db:seed        # inquiry statuses, permissions, roles (idempotent)
```

Enums are stored as validated strings (the SQL Server connector has no native enums); the initial migration adds
`CHECK` constraints and the `InquiryStatus` lookup rows.

## Admin setup

1. Apply migrations and seed (above).
2. Create the first Super Admin — either set `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` before seeding, or run
   `npm run admin:create -- --email you@company.example --name "Your Name"` (prompts for a password with hidden input).
3. Sign in at `/admin/login`. Roles: **Super Admin**, **Admin**, **Content Manager**, **Sales / Inquiry Manager**
   (permission matrix in `src/server/auth/permissions.ts`, editable per role by Super Admins).
4. In **Admin → Settings** enter the real contact channels once they exist.

There is no default password anywhere.

## Development commands

| Command                                 | What it does                                                       |
| --------------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                           | Development server                                                 |
| `npm run check`                         | Type check + lint + unit/component tests                           |
| `npm run typecheck` / `lint` / `format` | Individual gates                                                   |
| `npm test` / `npm run test:watch`       | Vitest                                                             |
| `npm run e2e`                           | Playwright end-to-end specs                                        |
| `npm run graphics:world-map`            | Regenerate the decorative dotted world map from Natural Earth data |
| `npm run db:studio`                     | Prisma Studio                                                      |

## Production commands

```bash
npm run build          # succeeds with no database and no secrets (public content is static)
npm start
node scripts/smoke-routes.mjs http://localhost:3000   # every public route × 3 locales
```

## Testing

- **Unit/component (Vitest):** business-scope golden text, USCC check digit, i18n key parity, validation schemas, server
  actions with a mocked database, RBAC, upload sniffing, rate limiting, UI kit behaviour, RTL rules.
- **Route smoke test:** status, `lang`/`dir`, single `<h1>`, canonical/hreflang, JSON-LD, leaked i18n keys.
- **E2E (Playwright):** navigation, language switching and RTL, forms failing honestly without a database, accessibility (axe).

Database code is tested with mocked Prisma; no local SQL Server is required to run the suite.

## Localization

English, Simplified Chinese and Arabic. Messages live in `src/messages/<locale>/<namespace>.json`; a test enforces identical
key structure across locales. Layout uses logical CSS properties throughout so Arabic is designed, not mirrored. Registered
company names are never translated. Adding a language: add it to `src/i18n/locales.ts`, add message files, and extend the
metadata/hreflang helpers.

## SEO

Per-page titles/descriptions, canonical URLs, hreflang alternates (including `x-default`), Open Graph/Twitter metadata,
JSON-LD (Organization, WebSite, BreadcrumbList, FAQPage, Product and NewsArticle only from real data), `sitemap.xml`,
`robots.txt`, one `<h1>` per page.

## Security notes

Server-side validation and authorization everywhere; HttpOnly SameSite cookies; scrypt password hashing; login lockout; rate
limits; upload validation by file signature (no SVG/HTML/executables); IPs stored only as HMAC hashes; secrets only in
the environment; audit log for admin actions. See [`docs/SECURITY.md`](docs/SECURITY.md) for controls, limitations and the
operations checklist.

## Deployment

Designed for Vercel (or any Node host) with Azure SQL. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Future architecture

The boundaries are in place for buyer/supplier accounts, RFQs and quotations, product catalogs, order and document
management, shipment tracking, notifications and payment/logistics integrations, plus AI features (RFQ parsing, product
matching, translation, inquiry classification). None of these are implemented, and nothing in the UI claims they are.
Repository modules under `src/server/*`, the storage service, and the translation-table pattern are the extension points.
