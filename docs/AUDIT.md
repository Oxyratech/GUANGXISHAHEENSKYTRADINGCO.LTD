# Final audit

Status as of this repository's last commit. Every claim below is backed by a command anyone can
re-run — see the exact commands in [`docs/ARCHITECTURE.md`](ARCHITECTURE.md#10-testing--verification) and
[`README.md`](../README.md#testing). This is a snapshot, not a warranty: re-run it after any
significant change, and treat "not applicable in this environment" as a real gap to close before
production traffic, not as done.

## Build and code quality

| Check                                                | Result                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` (`next typegen && tsc --noEmit`) | 0 errors                                                                                                                                                                                                                                                                                |
| `npx eslint .`                                       | 0 errors, 0 warnings                                                                                                                                                                                                                                                                    |
| `npx prettier --check .`                             | clean                                                                                                                                                                                                                                                                                   |
| `npx vitest run`                                     | **3,468 / 3,468** tests passing, 265 files                                                                                                                                                                                                                                              |
| `npx playwright test` (desktop + mobile)             | **91 / 91** tests passing, twice in a row (no flakes observed)                                                                                                                                                                                                                          |
| `npm run build`                                      | succeeds with **no** `DATABASE_URL` and **no** secrets set — every public content route is prerendered (SSG) for `/en`, `/zh` and `/ar`                                                                                                                                                 |
| `node scripts/smoke-routes.mjs` against `next start` | every public route × 3 locales: correct status, `lang`/`dir`, single `<h1>`, canonical, hreflang, valid JSON-LD, no leaked i18n keys                                                                                                                                                    |
| Repository grep                                      | no `console.*` outside `src/lib/logger.ts`; no `TODO`/`FIXME`/`XXX`/"Coming soon"/lorem ipsum in shipped copy; no physical-direction Tailwind class (`ml-`/`mr-`/`pl-`/`pr-`/`left-`/`right-`/`text-left`/`text-right`/`rounded-l`/`rounded-r`/`border-l`/`border-r`) anywhere in `src` |

## Accessibility (WCAG 2.1 A/AA)

Automated: `e2e/accessibility.spec.ts` runs `@axe-core/playwright` against every key public page
(home, about, business + a service page, products + a category, global trade + how-it-works,
company information, news, FAQ, contact, inquiry, privacy policy) in relevant locales, the admin
sign-in page, and two pages after interaction (an opened FAQ accordion, a submitted inquiry form
with its resulting validation errors) — **zero violations** in every case.

Manually verified in addition to the automated scan: keyboard-only operation of the header menu,
mobile drawer (focus trap, Escape returns focus to the trigger — `e2e/mobile.spec.ts`), FAQ
accordion, and modal dialogs (license viewer zoom); visible focus rings on every interactive
element (`@layer base { :focus-visible { ... } }` in `src/app/globals.css`, fixed earlier in
development after it was found to override component border-radii — see git history);
`prefers-reduced-motion`
honoured by every `Reveal`/`FadeIn` usage; RTL logical-property discipline enforced by both a
repository-wide grep and a live-page grep in `language-and-rtl.spec.ts`.

**Not done:** a manual screen-reader pass (NVDA/VoiceOver/JAWS) and a manual full-keyboard walkthrough
of every admin CRUD screen. Axe catches most structural and contrast issues but not reading-order or
screen-reader phrasing problems; budget a manual pass before launch.

## SEO

Every public page uses `buildMetadata` (canonical URL, hreflang alternates for en/zh-CN/ar plus
`x-default`, Open Graph, Twitter card) — verified live for every route by the smoke test. JSON-LD:
Organization and WebSite on every page (no `sameAs`, `areaServed`, employee counts or ratings —
verified by `src/lib/seo/json-ld.test.ts` asserting their absence), BreadcrumbList on inner pages,
FAQPage on `/faq`, Product/NewsArticle only when real published data exists. `sitemap.xml` includes
every static path and category page in all three locales, plus published products/news when a
database is configured; it degrades to the static entries alone (never fails the build) when it is
not. `robots.txt` disallows `/admin`, `/api` and `/files`, and disallows everything while
`NEXT_PUBLIC_SITE_URL` is unset (so a misconfigured deployment can never be indexed under the wrong
origin). One `<h1>` per page, enforced by both the smoke test and `navigation.spec.ts`.

**Not done:** the site has no real domain yet, so no live Search Console / Rich Results Test
verification has been possible; do that once `NEXT_PUBLIC_SITE_URL` points at a real, deployed
domain.

## Security

Full control inventory, threat model and known limitations: [`docs/SECURITY.md`](SECURITY.md).
Verified live in this pass (`e2e/admin.spec.ts` plus manual `curl`): unauthenticated `/admin`
redirects to `/admin/login`; sign-in is disabled with an honest message when the database is
unreachable rather than accepting a password it cannot check; admin responses carry
`X-Robots-Tag: noindex, nofollow`; `/files/*` and `/media/*` never return a raw 500 for a
nonexistent or unauthorized asset; `/api/health` reports the real database state and nothing else;
CSP, HSTS (production), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy` and `Cross-Origin-Opener-Policy` are present on both public and admin
responses. Upload validation is exercised with crafted byte signatures in
`src/server/storage/validate-upload.test.ts` (genuine PNG/JPEG/PDF/ZIP vs. renamed
executables/HTML/SVG/PHP polyglots and non-office ZIPs).

A real defect was found and fixed during this pass:
`src/app/(admin)/admin/not-found.tsx` caught every error from `getSession()` unconditionally,
including Next's own dynamic-rendering bailout signal, instead of re-throwing anything that is not
a recognised `DatabaseUnavailableError` — the same pattern every other admin entry point already
used correctly (see `src/server/admin/access.ts`). Fixed, with a regression test.

**Not done:** no third-party penetration test, no dependency vulnerability scan (`npm audit` /
Dependabot) run as part of this pass, and no live SQL Server / Azure SQL instance has been exercised
(all database code is verified against a mocked Prisma client — see `docs/DATABASE.md`). Run all
three before handling real user data.

## UI / UX

Verified live via Playwright screenshots and manual review during this build: the design system
renders as intended in both light-on-white and white-on-navy contexts, at 360px through 1920px
(`e2e/mobile.spec.ts` asserts no horizontal overflow at 360px on four key pages), in all three
locales including Arabic RTL. No dead links or buttons: `navigation.spec.ts` requests every service
and category page and asserts 200; every CTA target is checked against `STATIC_PUBLIC_PATHS` or a
real category/service slug by component tests. No fake data anywhere: honest empty states render
correctly with no database configured (news, products beyond the 12 registered categories, the
inquiry/contact confirmation), and the registered-capital figure is RMB 50,000 everywhere, with the
wrong figure (5,000,000) absent from the entire repository outside the tests that assert it must
never appear.

**Not done:** no user testing, no design review by someone other than the agents that built it, no
testing on physical devices (only emulated viewports).

## Final checklist (against the original brief's §79)

Unchecked items are genuine gaps, not oversights in this document.

- [x] Business license inspected and transcribed; company data verified against it
- [x] Next.js 16 App Router architecture; TypeScript strict mode
- [x] Design system; responsive design (360px–1920px, verified at 360px automatically)
- [x] Homepage, About, Business + 6 service pages, Products, Global Trade, Inquiry, Contact,
      Company Information (with the license, viewer and verification link), News, FAQ complete
- [x] Multilingual (en/zh/ar) with hreflang, RTL verified live, no machine-literal Arabic/Chinese
- [x] SEO: sitemap, robots, JSON-LD, per-page metadata
- [x] Accessibility: automated WCAG 2.1 A/AA scan clean; manual screen-reader pass **not done**
- [x] Security: RBAC, rate limiting, upload validation, headers, audit log
- [x] Database architecture (SQL Server/Azure SQL, migrations, seed); **not exercised against a
      live database**
- [x] Error/loading/empty states complete and honest
- [x] Tests written and passing (3,468 unit/component + 91 E2E); **no live-DB integration tests**
- [x] TypeScript, ESLint, Prettier, production build all passing
- [x] No fake data, no fake claims, no dead buttons, no "Coming soon", no secrets committed
- [x] README, `.env.example`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/SECURITY.md`,
      `docs/DEPLOYMENT.md` complete
- [ ] Manual screen-reader pass
- [ ] `npm audit` / dependency vulnerability scan
- [ ] Live SQL Server / Azure SQL exercised end-to-end
- [ ] Real domain provisioned and verified in Search Console
- [ ] Legal pages reviewed by qualified counsel (they are explicitly marked as drafts pending this)
- [ ] Production deployment performed (this repository cannot provision Azure SQL or Vercel itself)
