# Deployment

Target: **Vercel** (or any Node.js 22+ host) for the app and **Azure SQL Database** (or SQL Server) for data.
The application builds and serves all public content with **no database and no secrets**; add them to enable
inquiries, contact messages, products, news and the admin area.

## 1. Provision the database

1. Create an Azure SQL Database (the free/serverless tiers are enough to start). Choose the region closest to
   your users and to the Vercel region you will use.
2. Networking: allow your host to connect. Vercel functions have no fixed IP on most plans, so either allow Azure services,
   use Vercel's Secure Compute / static IPs, or connect over a private endpoint. Do **not** open the firewall to `0.0.0.0/0`.
3. Create a dedicated SQL login/user for the app with the minimum rights it needs (read/write on the schema). Use a
   separate, more privileged login only to run migrations.
4. Connection string (Prisma format), for the `DATABASE_URL` environment variable:

   ```
   sqlserver://<server>.database.windows.net:1433;database=<db>;user=<user>;password=<password>;encrypt=true
   ```

## 2. Apply schema and seed

Run once per environment, from a trusted machine or CI job with `DATABASE_URL` set:

```bash
npm ci
npm run db:migrate     # prisma migrate deploy — applies prisma/migrations in order
npm run db:seed        # inquiry statuses, permissions, roles (idempotent, safe to re-run)
npm run admin:create -- --email you@company.example --name "Your Name"
```

`migrate deploy` never generates or resets anything; it only applies committed migrations. Take a backup (or rely on
Azure point-in-time restore) before applying a new migration to production.

## 3. Configure Vercel

Import the repository. Build settings are the defaults (`npm install`, `npm run build`, output managed by Next.js);
`postinstall` runs `prisma generate`.

Environment variables (Production and Preview):

| Variable                                                                                    | Required                          | Notes                                                                                     |
| ------------------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                                                      | yes, once a domain exists         | e.g. `https://www.your-domain.com`, no trailing slash. Unset ⇒ `noindex`.                 |
| `DATABASE_URL`                                                                              | for inquiries/admin/products/news | Never expose to the client.                                                               |
| `AUTH_SECRET`                                                                               | **yes in production**             | ≥ 32 random bytes; rotating it invalidates outstanding form tokens and changes IP hashes. |
| `CONTACT_EMAIL`, `CONTACT_PHONE`, `CONTACT_WHATSAPP`                                        | optional                          | Or set in Admin → Settings (admin values win).                                            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `INQUIRY_NOTIFY_EMAIL` | optional                          | Enables new-inquiry notification emails.                                                  |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`                                                              | optional                          | Enables cookieless analytics; the CSP allows the Plausible origin only when set.          |
| `UPLOAD_MAX_BYTES`                                                                          | optional                          | Default 5 MiB, max 7 MiB.                                                                 |
| `LOG_LEVEL`                                                                                 | optional                          | `debug` … `error`, `silent`.                                                              |

Do not set `SEED_ADMIN_PASSWORD` on Vercel; create the admin from a trusted machine and remove the variable afterwards.

## 4. Domain and DNS

Add the domain in Vercel, point DNS as instructed, set `NEXT_PUBLIC_SITE_URL`, redeploy. Then submit
`https://<domain>/sitemap.xml` to search engines. `robots.txt` and the `noindex` header switch to indexable
automatically once the URL is configured.

## 5. Post-deploy checklist

- [ ] `GET /api/health` returns `{"status":"ok","database":"configured"}`.
- [ ] `node scripts/smoke-routes.mjs https://<domain>` passes (all routes × 3 locales).
- [ ] Submit a test inquiry with a small PDF; confirm it appears in **Admin → Inquiries** with the attachment.
- [ ] Sign in to `/admin/login`; confirm role restrictions with a non-Super-Admin test user.
- [ ] Response headers include CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`.
- [ ] Enter real contact channels in Admin → Settings and verify the footer and `/contact`.
- [ ] Have counsel review `/privacy-policy`, `/terms`, `/cookies` and resolve the bracketed placeholders.

## 6. Operations

- **Logs:** structured JSON lines (`ts`, `level`, `event`, `fields`) with secrets redacted; ship them to your log platform.
- **Backups:** Azure SQL automated backups; test a restore. Uploaded files live in the database, so they are covered.
- **Rate limits** are stored in the database, so they hold across serverless instances.
- **Scaling files:** when upload volume grows, move `MediaBlob` data to object storage by re-implementing
  `src/server/storage` (see `docs/DATABASE.md`).
- **Migrations:** add a new folder under `prisma/migrations`, never edit an applied one.

## Other hosts

Any platform that runs `npm run build && npm start` on Node 22+ works. Behind a reverse proxy, forward the real client
IP in `X-Forwarded-For` (the first hop is used for rate limiting) and terminate TLS there.
