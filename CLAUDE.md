# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Snails of Approval is a directory and mapping application for Slow Food award recipients. Public users browse an interactive map and filterable directory; admins manage snails, chapters, categories, and users via a protected panel.

## Commands

```bash
npm run dev          # Dev server on port 3000
npm run build        # Production build (includes type checking)
npm run lint         # ESLint
npm run seed         # Seed database: npx tsx prisma/seed.ts
npx prisma migrate dev --name "<name>"   # Create a new migration
npx prisma generate  # Regenerate Prisma client (output: /app/generated/prisma)
```

Node 20 is required (managed via mise.toml).

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `NEXTAUTH_SECRET` — JWT signing secret (required in production)
- `NEXTAUTH_URL` — Base URL for NextAuth callbacks (not needed on Vercel; auto-detected)

## Architecture

**Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), Prisma 7 + PostgreSQL, NextAuth v4 (JWT/credentials), TailwindCSS 4, Leaflet + React Leaflet for maps.

### Routing & Pages

- `/` — Home page with interactive map and filters
- `/list` — Public directory with search, filters, pagination
- `/chapters` — Chapters grouped by state
- `/snails/[slug]` — Public snail detail page
- `/admin/*` — Protected admin panel (login, dashboard, CRUD for snails/chapters/categories/users)

### API Routes

- `/api/snails`, `/api/chapters`, `/api/categories` — Public read endpoints (snails filtered to `status: "published"`)
- `/api/snails/map` — Map marker data (published snails with coordinates)
- `/api/admin/*` — Protected CRUD endpoints mirroring public structure

### Auth & Authorization

- `middleware.ts` protects `/admin/*` and `/api/admin/*` routes via JWT check
- `lib/auth.ts` — NextAuth config with credentials provider (bcryptjs hashing)
- `lib/rbac.ts` — `requireRole()` and `requireWrite()` helpers for route-level role gating
- Three roles: **admin** (full access), **editor** (read/write snails, chapters, categories), **viewer** (read only)
- Default seed admin: `admin@snailsofapproval.org` / `admin123`

### Database (Prisma)

Four models in `prisma/schema.prisma`:
- **User** — email, passwordHash, role
- **Chapter** — name, slug, state (US state)
- **Category** — name, slug (e.g., Restaurant, Farm, Producer)
- **Snail** — core entity with name, slug, address, lat/lon (Decimal 10,7), status (draft/published), yearAwarded; belongs to Chapter, Category, and optionally User (createdBy)

Prisma client singleton in `lib/prisma.ts` uses `@prisma/adapter-pg`. Generated client output is `app/generated/prisma`.

### Key Patterns

- **Map rendering**: Leaflet components use dynamic import with `ssr: false` to avoid server-side issues
- **Geocoding**: `lib/geocode.ts` calls Nominatim OSM API to convert addresses to lat/lon on snail creation
- **Slug generation**: `lib/slug.ts` auto-generates URL-safe slugs; appends timestamp on collision
- **Filtering/pagination**: URL search params for state persistence
- **Public vs draft**: Only `status: "published"` snails appear on public pages
- **Admin layout**: `SessionProvider` wrapper with responsive sidebar navigation
- **Styling**: TailwindCSS utility classes throughout, amber-700 as primary theme color
