# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains the UrbanWatch satellite urban growth detection web application.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Map**: react-leaflet (Leaflet.js) + OpenStreetMap tiles
- **Charts**: Recharts
- **Animations**: Framer Motion

## Application: UrbanWatch

A satellite urban growth detection platform using:
- **ESA Copernicus Sentinel-1** (SAR data) for radar-based change detection
- **NASA Landsat** (optical data) for NDBI/NDVI differencing

### Pages
- `/` — Mission Control: interactive world map with real-time change event feed
- `/dashboard` — Urban Growth Dashboard with time-series charts and land use breakdown
- `/scenes` — Satellite Scene Browser (filter by source, date)
- `/analysis` — Change Detection Tool: configure area/dates/source, run detection, view GeoJSON results on map
- `/regions` — Monitored Regions (AOI) management

### API Endpoints
- `GET /api/scenes` — List satellite scenes (filterable by source/date)
- `GET /api/aoi` — List saved Areas of Interest
- `POST /api/aoi` — Create new AOI
- `DELETE /api/aoi/:id` — Delete AOI
- `POST /api/analysis/detect` — Run change detection algorithm
- `GET /api/analysis/stats` — Urban statistics time series
- `GET /api/analysis/summary` — Aggregated summary (total urban area, growth rate, etc.)
- `GET /api/feed/events` — Recent change events (real-time feed)
- `GET /api/feed/summary` — Feed overview counts

### Detection Methods
- **Sentinel-1 SAR**: backscatter delta thresholding
- **Landsat**: NDBI/NDVI index differencing
- Returns GeoJSON polygon overlays for detected urban changes

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Tables

- `satellite_scenes` — Sentinel-1 and Landsat scene metadata
- `areas_of_interest` — User-saved monitoring regions with bounding boxes
- `change_events` — Detected urban change events with location and magnitude
- `urban_stats` — Monthly urban/vegetation/water/bare land area time series

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
