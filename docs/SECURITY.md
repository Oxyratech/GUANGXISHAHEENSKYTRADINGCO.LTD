# Security

How the site protects visitors, buyers' inquiry data and the admin area, where each control lives, what it
does not cover, and what an operator must do. Architecture context: `docs/ARCHITECTURE.md` section 6.

Rule zero: authorisation is decided on the server, on every request. Hiding a button, a layout redirect or
a proxy rule is convenience, never access control.

## 1. Threat model (summary)

| Asset                                           | Who might go after it                                        | Main ways                                                         | Answered by                                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin accounts and sessions                     | Internet attackers, credential stuffers                      | Password guessing, stolen cookies, session fixation, CSRF         | scrypt, lockout, rate limits, opaque hashed sessions, `__Host-` cookie, SameSite=Lax, Origin checks                                                       |
| Buyer inquiry data (names, emails, attachments) | Curious or compromised staff, scrapers, anyone guessing URLs | Missing checks on downloads, enumerable ids, leaky public queries | RBAC on every route, private files only via `/files/[id]` (access never depends on an id being secret), audit of downloads, IPs stored as HMAC only       |
| The database and server                         | Anyone who can submit a form or a file                       | Injection, malicious uploads, decompression bombs, spam floods    | Prisma (parameterised) and bound raw parameters only, allow-list by detected file type, size and pixel caps, rate limits, honeypot and signed form tokens |
| Site integrity (what visitors see)              | XSS authors, framing/clickjacking                            | Injected scripts, hostile uploads served inline                   | CSP, `nosniff`, sandboxed file responses, `frame-ancestors none`, news Markdown rendered without raw HTML                                                 |
| Availability                                    | Bots, scanners                                               | Form floods, expensive hashing, oversized bodies                  | Rate limits (database-backed with in-memory fallback), body limits, bounded work per request                                                              |
| Secrets                                         | Repo readers, log readers                                    | Committed keys, secrets in logs                                   | Env only, no fallback secret, structural log redaction                                                                                                    |

Out of scope for this layer: denial of service at network level (use the platform's protection), physical
access, compromise of the hosting account or database credentials, and supply-chain attacks on dependencies
(see the checklist).

## 2. Controls

| Area                 | Control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Where                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Authentication       | Email + password. scrypt N=2^16, r=8, p=2, 16-byte random salt, 32-byte key; parameters stored in the hash so they can be raised later. Password input is NFKC-normalised. Unknown email, wrong password and inactive account are indistinguishable to the visitor and cost the same CPU (dummy verification).                                                                                                                                                                                                                                                                                             | `security/password.ts`, `auth/login.ts`         |
| Password policy      | 12 to 128 characters, more than one character class, not a common password, not built from the email name, not highly repetitive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `validatePasswordStrength`                      |
| Lockout              | 5 consecutive failures lock the account for 15 minutes; the counter resets on lock and on success. Failures, locks and successes are audited (never the password).                                                                                                                                                                                                                                                                                                                                                                                                                                         | `auth/login.ts`                                 |
| Login rate limit     | 10 attempts per 15 minutes per IP hash and per email hash.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `security/rate-limit.ts`                        |
| Sessions             | 256-bit random token in an HttpOnly, SameSite=Lax, Path=/ cookie (`Secure` and the `__Host-` prefix in production). Only SHA-256 of the token is stored. Idle timeout 8 h (sliding, `lastUsedAt` refreshed at most every 5 min), absolute timeout 7 days. New token on every sign-in (no fixation); the previous session of that browser is revoked. Inactive or locked users get no session. Expired rows are deleted on sight.                                                                                                                                                                           | `auth/session.ts`, `auth/session-policy.ts`     |
| Authorisation (RBAC) | Roles map to `resource:action` permissions (`auth/permissions.ts`). `requirePermission` for pages, `requirePermissionOrThrow` for Server Actions and Route Handlers. A user who is signed in but lacks the permission gets `AuthorizationError` (Next's `forbidden()` is still experimental and needs `experimental.authInterrupts`, so it is not used).                                                                                                                                                                                                                                                   | `auth/authorize.ts`                             |
| CSRF                 | SameSite=Lax cookies; Server Actions use Next's built-in Origin/Host check; hand-written POST/PUT/PATCH/DELETE route handlers must call `assertSameOrigin(request)` (Origin, else Referer, compared to the host the visitor used; `Sec-Fetch-Site: cross-site` refused).                                                                                                                                                                                                                                                                                                                                   | `http/origin.ts`                                |
| Rate limits          | Fixed window counters shared across instances in `RateLimitCounter`, updated by one atomic `MERGE ... WITH (HOLDLOCK)` with bound parameters. Keys are HMACs, never raw emails or IPs. If the database cannot be used, an in-memory per-instance limiter takes over and a warning is logged once per outage.                                                                                                                                                                                                                                                                                               | `security/rate-limit.ts`                        |
| Anti-spam            | `guardPublicSubmission`: honeypot (`website_url`), HMAC-signed form token with minimum fill time (3 s) and maximum age (2 h), then rate limits per IP hash and per email hash. A tripped honeypot is reported as `spam` so the caller can answer as if it succeeded and store nothing.                                                                                                                                                                                                                                                                                                                     | `security/anti-spam.ts`                         |
| Uploads              | Allow-list by detected signature (PDF, JPEG, PNG, WebP; DOCX and XLSX by a minimal ZIP central-directory read that also rejects macros, ZIP64, encryption, path traversal and archive bombs). Client MIME type and extension are cross-checked only, never trusted. Size cap per policy (checked before reading the file), image pixel cap read from the header without decoding. Display name sanitised (paths, control and bidi-override characters, double extensions). GUID ids (sequential GUIDs per the schema, so never treated as secrets). Bytes stored in `MediaBlob`; nothing touches the disk. | `storage/*`                                     |
| File serving         | `/media/[id]`: PUBLIC assets only, verified `Content-Type`, `nosniff`, images inline and documents as attachments, `ETag` from the content hash with 304 support, immutable caching; PRIVATE or unknown ids are an identical 404. `/files/[id]`: PRIVATE assets only, session required (401), `inquiry:read` for inquiry attachments or `media:read` for other private files (403), always an attachment, `Cache-Control: private, no-store`, download audited. Both get a locked-down CSP (`default-src 'none'; sandbox`).                                                                                | `app/media`, `app/files`                        |
| Headers              | CSP, HSTS (production), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, microphone, geolocation, payment, usb denied), `Cross-Origin-Opener-Policy: same-origin`; `/admin/*` additionally `noindex, nofollow` and `no-store`.                                                                                                                                                                                                                                                                                | `next.config.ts` via `security/headers.ts`      |
| PII and IPs          | IPs are stored and used only as HMAC-SHA-256 keyed with `AUTH_SECRET` (`hashIp`), with IPv4-mapped IPv6 normalised. Internal notes and IP hashes are never selected by public queries (repository rule).                                                                                                                                                                                                                                                                                                                                                                                                   | `security/hash.ts`                              |
| Logging              | One JSON line per event. Values under keys matching `pass(word)`, `secret`, `token`, `authorization`, `cookie`, `api-key`, `set-cookie` are replaced, long strings truncated, errors flattened, depth and size bounded. The logger is the only place allowed to call `console.*`.                                                                                                                                                                                                                                                                                                                          | `lib/logger.ts`                                 |
| Secrets              | Environment only (`.env.example` documents them). Nothing secret uses `NEXT_PUBLIC_`. In production `AUTH_SECRET` (32+ characters) is mandatory and its absence throws on first use; elsewhere a random per-process secret is used with a warning. There is no fixed fallback.                                                                                                                                                                                                                                                                                                                             | `server/env.ts`                                 |
| Audit                | `writeAudit` appends to `AuditLog` (actor snapshot, action, entity, redacted and size-capped metadata, IP hash). It never throws: a failed audit write is logged, and never undoes the action.                                                                                                                                                                                                                                                                                                                                                                                                             | `server/audit.ts`                               |
| Admin bootstrap      | `npm run admin:create` reads the password with hidden input (or `ADMIN_PASSWORD` for CI), validates strength, creates or resets the user, sets the role, revokes sessions on reset and audits it. It never prints or accepts a password as a flag.                                                                                                                                                                                                                                                                                                                                                         | `scripts/create-admin.ts`, `auth/admin-user.ts` |

## 3. The CSP trade-off (nonce, hash or static)

Next.js injects inline scripts (bootstrap, RSC payload), so a strict `script-src` needs one of:

1. **Nonce via `proxy.ts`.** The strictest option, but the documented mechanism needs a fresh nonce per
   request, which forces every page into dynamic rendering. That removes static generation and CDN caching
   of the marketing pages, costs server work on every visit, and is incompatible with partial prerendering.
2. **Hash-based (experimental `experimental.sri`).** Keeps static generation, but it is experimental, applies
   to script files rather than the inline payload scripts, and could not be verified here without a build.
3. **Static CSP with `script-src 'self' 'unsafe-inline'`.** Static-generation friendly. Weaker against
   script injection, because an injected inline script would run.

This site is mostly static content with no user-generated HTML: news bodies are Markdown rendered without
raw HTML, and every value shown from the database is escaped by React. The realistic XSS surface is small, so
the chosen trade-off is option 3, with everything else kept strict: `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'`, `frame-ancestors 'none'`, `img-src 'self' data: blob:`, `font-src 'self'`, and
`connect-src 'self'` plus `https://plausible.io` (also allowed in `script-src`) only when
`NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set. `'unsafe-eval'` (and websockets for HMR) exist in development only.
`upgrade-insecure-requests` is omitted; HSTS does that job in production.

Revisit this if the site ever renders user-supplied HTML, or when `experimental.sri` stabilises (then move
to `script-src 'self'` plus integrity hashes and re-test the build). The admin area is more sensitive than
the public site; if it needs a stricter policy, give it its own nonce-based CSP through `proxy.ts` (it is
dynamic anyway) without touching the public pages.

## 4. Using the modules (rules for feature authors)

- **Admin page or layout:** `const session = await requirePermission("inquiry:read")`.
- **Server Action or Route Handler:** `await requirePermissionOrThrow("product:write")`; catch
  `AuthenticationError` and `AuthorizationError` and return a normal error state.
- **State change by an admin:** finish with `await writeAudit({ actor, action, entityType, entityId, ... })`.
- **Public form (inquiry, contact):** embed a fresh `createFormToken()` per request (a dynamic render, or a
  fetch on mount) in a hidden `form_token` field and an empty `website_url` honeypot field hidden from people
  and assistive technology; in the action call `guardPublicSubmission({ formData, scope, email })` after
  validating, and only then store. `spam` means answer as if it succeeded and store nothing; `too_fast` and
  `expired` mean "reload and retry"; `rate_limited` carries `retryAfterSeconds`. A token in statically
  generated HTML would carry the build time and expire, so never create it at build time.
- **Storing IPs:** only `ctx.ipHash` from `getRequestContext()`; never the raw address.
- **Uploads:** `storeUpload({ file, policy, uploadedById })` with `INQUIRY_ATTACHMENT`, `PRODUCT_IMAGE`,
  `PUBLIC_DOCUMENT` or `NEWS_IMAGE`; expected failures come back as `{ ok: false, code }`. Show files with
  `/media/<id>` (public) or `/files/<id>` (staff). Use `describeUploadPolicy` to render limits and `accept`.
- **Database failures:** `DatabaseUnavailableError` means an outage, not "signed out" or "not found".
- **Raw SQL:** only through Prisma tagged templates (`$queryRaw` with `${value}`); never `$queryRawUnsafe`
  with interpolated input.

## 5. Known limitations

- **CSP allows inline scripts and styles** (section 3). It still blocks foreign script origins, plugins,
  framing and foreign form targets.
- **No MFA and no self-service password reset.** Admins are created and reset with `npm run admin:create`.
  Add MFA before granting admin access to many people.
- **The "locked" response reveals that an account exists** once five wrong passwords have been sent for it.
  Rate limiting slows enumeration but does not remove it. The UI may show one generic message for both.
- **A stolen session cookie works until it expires** (8 h idle / 7 days absolute); there is no device or IP
  binding. `destroyAllSessionsForUser` must be called on password change, deactivation and role change.
  Because `lastUsedAt` is refreshed every 5 minutes, the idle limit is accurate to about 5 minutes.
- **Rate limiting can be used to lock a victim out** (per-email budget and account lockout are shared by
  attackers and the owner). Accepted: the alternative is unlimited guessing.
- **Client IP trust.** `x-forwarded-for` (first hop) then `x-real-ip` are used as reported. This is safe only
  when the platform's proxy overwrites or sanitises them. If clients can reach the app directly, or a proxy
  merely appends to a client-supplied header, IP-based limits can be evaded. Confirm your platform's behaviour.
- **Rate limits are weaker without the database.** The in-memory fallback is per instance, so `N` instances
  allow roughly `N` times the budget, and it resets on restart.
- **Uploads are validated, not scanned.** There is no antivirus or content-disarm step. PDFs and Office files
  may contain active content, so they are only ever served as downloads. Images are not re-encoded, so EXIF
  (including GPS) is preserved; only headers are read, so a truncated but well-headed image is accepted.
  Inquiry attachments are private, but staff opening them locally carry the usual risks.
- **Private files without an inquiry link.** `/files/[id]` requires `inquiry:read` for files linked to an
  inquiry and `media:read` for any other private file, so an orphaned attachment (link creation failed) is
  reachable by `media:read` holders. Link the attachment in the same transaction as the inquiry.
- **Public media is public from the moment it is uploaded.** Ids are sequential GUIDs, so an image uploaded
  for a draft product or article can be fetched by anyone who guesses its id before the content is published.
  Do not upload confidential material under a PUBLIC policy.
- **Immutable caching of `/media`.** A deleted public asset can stay in browser and CDN caches for up to a
  year. Never reuse an id; replace by uploading a new asset.
- **Upload sizes vs Server Actions.** `serverActions.bodySizeLimit` is 8 MB, `UPLOAD_MAX_BYTES` is capped at
  7 MiB, and `PUBLIC_DOCUMENT` is also 7 MiB, so all uploads fit under the Server Action body limit (`serverActions.bodySizeLimit`, 8mb).
- **Hashing is memory-hungry by design** (about 64 MiB per scrypt). Node runs at most four at once by
  default; login rate limits keep that bounded. Size the instance accordingly.
- **The audit log lives in the application database.** Someone with write access to it can alter it; it is
  not tamper-evident. Ship database audit logs off-box if that matters.
- **Rotating `AUTH_SECRET`** invalidates outstanding form tokens and changes every IP hash and rate-limit
  key (counters restart, history is no longer comparable). Sessions are unaffected.
- **HSTS** is sent with `includeSubDomains` but without `preload`; add preload only once every subdomain of
  the eventual domain is HTTPS-only.
- **Dependencies.** No automated vulnerability scanning is configured in this repository.

## 6. Operational checklist

Before go-live:

- [ ] `AUTH_SECRET` set to 32+ random bytes (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`), stored in the platform's secret store.
- [ ] `DATABASE_URL` uses a least-privilege SQL login (read/write on the application schema, no DDL), `encrypt=true`, and the server firewall only admits the app.
- [ ] `npm run db:migrate` and `npm run db:seed` have run; the first admin was created with `npm run admin:create` (or the seed) and `SEED_ADMIN_PASSWORD` was then removed from the environment.
- [ ] The site is served over HTTPS only; `NEXT_PUBLIC_SITE_URL` is set to the real origin.
- [ ] The proxy or platform sets `x-forwarded-for` from the real client address and discards client-supplied values.
- [ ] `/api/health` is reachable by the platform's probe and reveals nothing beyond `ok` and `configured`.
- [ ] Response headers verified on the production URL (CSP, HSTS, nosniff, frame protections) and `/admin` returns `noindex` and `no-store`.
- [ ] Log shipping is on; alerts exist for `auth.login_rate_limited`, `auth.account_locked`, `audit.write_failed` and `rate_limit.database_unavailable_using_memory`.
- [ ] Backups of the database are enabled and a restore has been tried.
- [ ] `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is empty unless analytics is actually wanted (it widens the CSP).

Regularly:

- [ ] Review admin users, roles and the audit log; deactivate leavers (then call `destroyAllSessionsForUser`).
- [ ] Run `npm audit` and update dependencies; re-run the tests (`npm run check`).
- [ ] Rotate `AUTH_SECRET` and the database password on a schedule and after any suspected exposure.
- [ ] Re-check this document's known limitations against reality after platform or architecture changes.

Reporting: there is no public disclosure address yet (none has been supplied). Publish one, for example in
`/.well-known/security.txt`, before launch.
