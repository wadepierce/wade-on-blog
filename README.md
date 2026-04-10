# wade on blog

Astro blog with a mobile-friendly backend editor. Posts live in Postgres, images on a
persistent volume, admin protected by passkeys (WebAuthn).

## Stack

- Astro (SSR) + `@astrojs/node` standalone adapter
- React islands for the admin UI
- Tailwind CSS + `@tailwindcss/typography`
- Postgres via `drizzle-orm` + `postgres`
- Passkeys via `@simplewebauthn/server` + `@simplewebauthn/browser`
- `@uiw/react-md-editor` for the markdown editor
- `sharp` for image processing

## Local development

Requires Node 20+ and a running Postgres instance.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env and point DATABASE_URL at your local postgres

# 3. Generate and apply migrations
npm run db:generate
npm run db:migrate

# 4. Start
npm run dev
```

Open <http://localhost:4321>. First visit to `/admin` will redirect to `/admin/enroll`
where you create the single admin passkey. Subsequent visits use `/admin/login`.

## Deploying to Railway

1. **Create project** in Railway, add the **Postgres** plugin. It injects
   `DATABASE_URL` into the app service automatically.
2. **Add a new service** pointing at this repo. Nixpacks will pick up `nixpacks.toml`
   and install Node 20 + `vips` (needed by sharp).
3. **Attach a volume** to the service, mount path `/data`.
4. **Environment variables** on the app service:
   - `RP_ID` — your app's bare hostname, e.g. `wade-on-blog.up.railway.app`
   - `RP_ORIGIN` — full origin with scheme, e.g. `https://wade-on-blog.up.railway.app`
   - `UPLOADS_DIR` — `/data/uploads`
   - `NODE_ENV` — `production` (nixpacks.toml already sets this)
   - `PORT` and `HOST` — Railway sets `PORT` automatically; `HOST=0.0.0.0`
5. **Deploy**. On first boot the app runs migrations automatically and creates the
   uploads directory on the volume.
6. **Enroll your passkey**: visit `https://<your-domain>/admin/enroll` once. Creating
   a passkey immediately locks the page — subsequent visits 404.

### If you later add a custom domain

Update `RP_ID` and `RP_ORIGIN` to match the custom domain. Existing passkeys are
bound to the original `RP_ID` and will stop working, so enroll a fresh one before
retiring the railway.app subdomain.

## Project layout

```
src/
├── db/           # drizzle schema, client, migrator
├── lib/          # auth, passkey, markdown, slug, uploads
├── middleware.ts # boot-time migrations + session attach
├── components/   # Layout + React admin islands
└── pages/
    ├── index.astro          # public blog list
    ├── posts/[slug].astro   # public post
    ├── rss.xml.ts
    ├── admin/               # admin UI
    ├── api/                 # JSON endpoints (auth, posts, uploads)
    └── uploads/[filename].ts  # serves images from the volume
```

## Notes

- All posts are stored in Postgres. Markdown is rendered to sanitized HTML **on save**
  and cached in `posts.content_html`, so public pages never re-run the markdown pipeline.
- Images are resized to max 2000px wide and stored as webp on the volume.
- There is only one admin user by design. Enrollment is open exactly once, then closed.
