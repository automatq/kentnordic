# Idcibidci — Iceland DMC website

A custom, Nordic-inspired marketing site for **Idcibidci ehf**, a licensed Iceland
destination management company selling group and tailor-made tours to travel agencies
and MICE planners (B2B). Built as a content-driven React Router SPA.

## Stack

- **Vite + React Router** single-page app.
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

For the admin backend and protected inbox, use `vercel dev` locally so the `api/`
routes run alongside the frontend. Plain `pnpm dev` keeps the site fast for design
work, but falls back to demo submission behavior because Vite does not serve the
serverless functions.

## Editing content

All client-editable content lives under `src/content/` (one folder per collection),
validated by the schemas in `src/lib/content.ts`:

| Collection     | Location                                     | What it is                                     |
| -------------- | -------------------------------------------- | ---------------------------------------------- |
| `tours`        | `src/content/tours/*.md`                     | The 6 tour packages incl. day-by-day itinerary |
| `regions`      | `src/content/regions/*.json`                 | The 8 map regions (name, colour, blurb)        |
| `destinations` | `src/content/destinations/destinations.json` | Map pins                                       |
| `services`     | `src/content/services/*.md`                  | FIT / Group Tours / MICE                       |
| `testimonials` | `src/content/testimonials/testimonials.json` | Partner quotes                                 |
| `offices`      | `src/content/offices/offices.json`           | Reykjavik + Kuala Lumpur                       |

Site-wide config (brand, nav, contact email, form provider) is in `src/config/site.ts`.

The folder-per-collection, flat-frontmatter layout is **CMS-ready**: a Git-based CMS
(Decap or TinaCMS) can be layered on later with no restructuring.

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

## Inquiry form and admin backend

`src/components/react/InquiryForm.tsx` posts through `src/lib/formProvider.ts` to the
project's own Vercel function at `/api/form-submissions`. Submissions are stored for
review in `/admin`.

Environment required for production:

- `ADMIN_PASSWORD`: password for the `/admin` login
- `ADMIN_SESSION_SECRET`: recommended signing secret for admin sessions
- A **private Vercel Blob store** connected to the project so `BLOB_READ_WRITE_TOKEN`
  (or Blob OIDC envs) are available to the serverless functions

Storage behavior:

- Local non-Vercel runs fall back to `.context/admin-data/submissions/*.json`
- Vercel production requires persistent Blob storage; without it the API returns a
  clear configuration error instead of pretending to save data

## Scripts

| Command                                    | Description                                        |
| ------------------------------------------ | -------------------------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm preview` | Vite dev / TypeScript + production build / preview |
| `pnpm gen:map`                             | Rebuild the interactive map from the raw SVG       |
| `pnpm format`                              | Prettier                                           |

## Out of scope (future phases)

Multi-language, agent login/portal, and live availability/booking were flagged as open
questions in the PRD and are intentionally not built. The content schema already carries
per-tour `seasonality`, so booking/availability can be added without restructuring.
