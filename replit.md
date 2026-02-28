# RemitRadar — Google Flights for Remittances

## Overview
RemitRadar helps diaspora workers find the cheapest multi-hop route to send money between countries. All data is mock/static. The app has 4 pages and a dark fintech aesthetic.

## Architecture
- **Frontend**: React + Vite, TypeScript, Tailwind CSS, shadcn/ui, Recharts, Framer Motion, Wouter (routing)
- **Backend**: Express.js API serving mock data computed at runtime or from JSON files
- **Fonts**: DM Sans (body) + Bricolage Grotesque (headings)

## Pages
1. **Route Finder** (`/`) — finds cheapest multi-hop transfer routes with radar loading animation
2. **Rate Tracker** (`/rates`) — 90-day FX rate history with AreaChart + sentiment badge
3. **Smart Timing** (`/timing`) — LineChart comparing FX-only vs true cost over time with annotations
4. **Rate Alerts** (`/alerts`) — create/delete alerts, view active + history, form with Switch toggle

## Key Components
- `client/src/components/app-sidebar.tsx` — collapsible sidebar with icon mode
- `client/src/components/corridor-select.tsx` — reusable from/to currency selector
- `client/src/components/how-it-works-modal.tsx` — 3-step explainer modal
- `client/src/components/radar-icon.tsx` — animated SVG radar icon and pulse component

## API Endpoints
- `GET /api/routes?from=COP&to=GBP` — returns ranked route options
- `GET /api/rates?from=COP&to=GBP` — returns 90-day FX history with stats
- `GET /api/smart-timing?from=COP&to=GBP` — returns dual-line chart data with annotations

## Supported Corridors
- COP → GBP, COP → USD
- MXN → USD, MXN → GBP

## Design System
- Dark navy background: `#0F1729`
- Teal accent: `#00D4AA` (primary actions, best routes)
- Amber accent: `#F5A623` (alerts, warnings)
- Red accent: `#FF6B6B` (expensive routes)
- Cards: `bg-white/5` with `border-white/10`, hover glow on best route
- The app always loads in dark mode (dark class on html element)

## Data
- Mock route data: `server/data/routes.json`
- Rate and smart timing data are computed programmatically with seeded random walk
