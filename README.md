# Evento

Premium event planning SaaS — weddings, baptisms, birthdays, and more.

## Stack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS v4**
- **shadcn/ui** (New York style)
- **Supabase** (Auth + PostgreSQL)
- **Vercel** (deployment)

## Prerequisites

Install **Node.js LTS** (includes npm): https://nodejs.org/

Verify:

```bash
node -v
npm -v
```

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase URL and anon key

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase setup (Română)

Ghid complet: **[docs/SETUP-SUPABASE-RO.md](docs/SETUP-SUPABASE-RO.md)** — email, Google OAuth, URL-uri redirect.

## Supabase setup (English)

1. Create a project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL**: `http://localhost:3000` (production: your Vercel URL)
   - **Redirect URLs**: `http://localhost:3000/auth/callback`
4. (Optional) Disable email confirmation during development:
   - **Authentication → Providers → Email** → turn off “Confirm email”

## Project structure

```
src/
├── app/
│   ├── (auth)/          # Login & signup (public)
│   ├── (dashboard)/     # Protected app shell
│   ├── auth/callback/   # Supabase OAuth / email redirect
│   ├── layout.tsx       # Root layout + fonts
│   ├── page.tsx         # Marketing landing
│   └── globals.css      # Theme tokens (blush, gold, beige)
├── components/
│   ├── ui/              # shadcn primitives
│   ├── layout/          # Sidebar, header
│   └── auth/            # Auth form
├── config/              # Navigation config
└── lib/
    └── supabase/        # Browser, server, middleware clients
```

## Scripts

| Command       | Description        |
|---------------|--------------------|
| `npm run dev` | Development server |
| `npm run build` | Production build   |
| `npm run start` | Run production     |
| `npm run lint`  | ESLint             |

## Deploy (Vercel)

1. Push to GitHub.
2. Import repo in Vercel.
3. Add the same env vars from `.env.local`.
4. Update Supabase redirect URLs to your production domain.

## Next features to build

1. **Events** — create wedding / baptism / birthday events
2. **Guest management**
3. **RSVP**
