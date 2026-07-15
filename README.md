# Idcibidci — Iceland DMC website

A custom, Nordic-inspired marketing site for **Idcibidci ehf**, a licensed Iceland
destination management company selling group and tailor-made tours to travel agencies
and MICE planners (B2B). Built as a content-driven React Router SPA.

## Stack

- **Vite + React Router** single-page app.
- **Neon Postgres + Drizzle** for the admin CRM, content revisions, profiles, and audit data.
- **Vercel Blob** for media originals and generated image variants only.
- **React components** for all routes, shared layout, tour filters, inquiry form and
  interactive map.
- **Tailwind CSS v4** with a CSS-first design-token layer (`src/styles/tokens.css`).
- **Typed file content** from Markdown/JSON under `src/content`, loaded with Vite
  glob imports, `gray-matter`, and `zod`.
- Self-hosted fonts (Geist Sans, Montserrat, Playfair Display, Instrument Serif, JetBrains Mono).

## Getting started

```bash
pnpm install
cp .env.example .env      # optional; form runs in demo mode without a key
pnpm dev                  # http://localhost:5173
pnpm build && pnpm preview
```

For the admin application and API, use `pnpm dev:admin` locally. It runs an isolated
PGlite database under `.context/admin-data/`, applies migrations automatically, and
serves the Vercel functions alongside the frontend. Plain `pnpm dev` remains useful
for public-site design work but does not serve the admin API.

## Content sources and publishing

Repository seed content lives under `src/content/` (one folder per collection) and is
validated by the schemas in `src/lib/content.ts`:

| Collection     | Location                                     | What it is                                     |
| -------------- | -------------------------------------------- | ---------------------------------------------- |
| `tours`        | `src/content/tours/*.md`                     | The 6 tour packages incl. day-by-day itinerary |
| `regions`      | `src/content/regions/*.json`                 | The 8 map regions (name, colour, blurb)        |
| `destinations` | `src/content/destinations/destinations.json` | Map pins                                       |
| `services`     | `src/content/services/*.md`                  | FIT / Group Tours / MICE                       |
| `testimonials` | `src/content/testimonials/testimonials.json` | Partner quotes                                 |
| `offices`      | `src/content/offices/offices.json`           | Reykjavik + Kuala Lumpur                       |

Site-wide defaults (brand, nav, contact email, form provider) are in
`src/config/site.ts`. `pnpm db:seed` imports these files as the first immutable
published revisions. After rollout, Editors work in `/admin/content`; publishing
creates a release, and the production build materializes that approved release into
the existing prerendered site. The repository files remain deterministic seed and
fallback content rather than a second live editing system.

## Photography

Content references a semantic **photo key** (e.g. `tour-std02s4`); `src/lib/photos.ts`
maps it to a bundled image URL. Real, licence-clean photography (Unsplash/Pexels,
free for commercial use) ships at `src/assets/photos/<key>.jpg`. To swap in different
photography, replace the JPG at the same filename — no code change needed.

## Interactive map

The map is built from the client's `Iceland Map Master Ori CS6.ai` artwork:

```
.ai → pdftocairo -svg → scripts/build-map.mjs → src/data/map-base.svg + map-regions.json
```

`scripts/build-map.mjs` optimizes the full artwork (decorative base layer) and extracts
the exact geometry of the 8 regions as an accessible, keyboard-operable hotspot overlay
(`src/components/map/IcelandMap.tsx`). Re-run `pnpm gen:map` if the artwork changes
(expects the raw SVG at `/tmp/iceland-raw.svg`).

## Unified admin console

`src/components/react/InquiryForm.tsx` posts through `src/lib/formProvider.ts` to the
project's own Vercel function at `/api/form-submissions`. Validated intake is written
transactionally to Neon as an organization, contact, lead, timeline event, follow-up
task, and assignment notification.

`/admin` is a responsive, route-split sales CRM and website CMS. A shared workspace
password opens the gateway; each person then selects a named profile and enters a
four-digit PIN. The first profile is Owner and later profiles begin with Sales access.
Owners can combine Sales, Editor, and Owner roles.

The console includes pipeline list/board views, tasks, notifications, tracked outbound
email, analytics, custom fields, audit-safe CSV exports, versioned content editing,
release publishing, content health, and a media library. Website publishing keeps the
public site on the last successful immutable release and triggers a Vercel Deploy Hook.
Postmark sending and content publishing are independently feature-gated.

Environment required for production:

- `DATABASE_URL`: Neon connection string supplied by the Vercel integration
- `ADMIN_PASSWORD`: shared `/admin` workspace gateway
- `ADMIN_SESSION_SECRET`: independent high-entropy session signing secret
- `CRON_SECRET`: authorization for scheduled notification and SLA jobs
- A **private Vercel Blob store** so `BLOB_READ_WRITE_TOKEN` (or Blob OIDC values)
  is available to media functions

Optional production integrations and rollout switches are documented in
`.env.example`. Keep `ADMIN_EMAIL_ENABLED=false` until Postmark has a verified sender
and `SALES_REPLY_TO_EMAIL`; keep `ADMIN_CONTENT_PUBLISHING_ENABLED=false` until the
deploy hook and production content-version check are confirmed.

### First production rollout

```bash
pnpm db:migrate                 # apply Drizzle migrations to DATABASE_URL
pnpm db:seed                    # seed repository content as release zero
pnpm admin:import               # dry-run legacy submissions/copy/media reconciliation
pnpm admin:import -- --apply    # import only after reviewing counts and checksum
```

Set `ADMIN_V2_ENABLED=true` after import reconciliation. Enable content publishing and
email independently after their integration checks. The legacy Blob inbox remains
read-only at `/admin/legacy` for the rollback window.

If every Owner is locked out, reset a profile PIN from the trusted server environment:

```bash
pnpm admin:reset-pin -- --profile="Profile name or UUID" --pin=1234
```

This invalidates that profile's existing sessions and writes an audit event.

## Scripts

| Command                                    | Description                                         |
| ------------------------------------------ | --------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm preview` | Public dev / checked production build / preview     |
| `pnpm dev:admin`                           | Vercel Dev, admin API, and local PGlite             |
| `pnpm db:migrate` / `pnpm db:seed`         | Apply admin schema / seed repository content        |
| `pnpm admin:import`                        | Dry-run legacy reconciliation (`-- --apply` writes) |
| `pnpm admin:reset-pin`                     | Server-side Owner/profile PIN recovery              |
| `pnpm test` / `pnpm test:e2e`              | Vitest integration / Playwright admin smoke tests   |
| `pnpm gen:map`                             | Rebuild the interactive map from the raw SVG        |
| `pnpm format`                              | Prettier                                            |

## Out of scope (future phases)

Multi-language, agent login/portal, and live availability/booking were flagged as open
questions in the PRD and are intentionally not built. The content schema already carries
per-tour `seasonality`, so booking/availability can be added without restructuring.
