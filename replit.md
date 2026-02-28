# Remio — Find the Cheapest Way to Send Money Abroad

## Overview
Remio helps diaspora workers find the cheapest multi-hop route to send money internationally. It compares routes across fintech apps, crypto bridges, and bank transfers. All data is mock/static. The app is a single page with a clean search-engine aesthetic.

## Architecture
- **Frontend**: React + Vite, TypeScript, Tailwind CSS, shadcn/ui, Wouter (unused, single page), framer-motion
- **Backend**: Express.js API serving mock data from JSON + runtime seeded random walks
- **Fonts**: DM Sans (body) + Bricolage Grotesque (headings)

## Pages
1. **Route Finder** (`/`) — the only page; clean search form + route result cards

## Key Components
- `client/src/components/corridor-select.tsx` — currency + country data, APPROX_RATES, getCurrencySymbol, getApproxConverted
- `client/src/components/how-it-works-modal.tsx` — 3-step explainer modal (branded Remio)

## Layout
- No sidebar. Header: Remio logo + "How it works" link. Footer: disclaimer text.
- Search form centered (hero feel before search, stays at top after results appear)
- Route cards: total cost + FX/fees split, platform flow (names + arrows), time estimate, Best route badge

## API Endpoints
- `GET /api/routes?from=COP&to=GBP[&maxHours=6]` — ranked route options (returns `{ routes: [...] }`)
- `GET /api/rates?from=COP&to=GBP` — 90-day FX history with stats (unused in UI now)
- `GET /api/smart-timing?from=COP&to=GBP` — dual-line chart data (unused in UI now)

## Supported Corridors (From)
- COP (Colombia), MXN (Mexico), BRL (Brazil), PHP (Philippines), INR (India), NGN (Nigeria)

## Supported Corridors (To)
- GBP (United Kingdom), USD (United States), EUR (Europe)

## Route Data
- Stored in `server/data/routes.json`; each route has hops with from/to platform + URL + currency fields
- `estimated_hours` field: 0=instant, 3-6=hours, 24=1day, 48=2days, 72=3days
- `maxHours` query param filters routes server-side
- `from_url`/`to_url` are nullable — if present, platform names are rendered as clickable links

## Design Tokens
- Background: `#0F1729` (dark navy)
- Accent: `#00D4AA` (teal)
- Amber: `#F5A623`, Red: `#FF6B6B`
- White/5, white/8, white/10 for subtle elevated surfaces and borders
