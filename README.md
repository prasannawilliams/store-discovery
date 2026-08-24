# MarketScope

Take-home: upload a store portfolio, draw a **≤ 30 km²** market box, discover competing stores with **Google Places (New)**, then inspect three map layers.

Time box was 2–3 days. Core discovery is implemented; **150 m portfolio↔Places matching is intentionally skipped**.

## Demo

1. Start Docker Desktop, then from the repo root:

```bash
cp .env.example .env
# add GOOGLE_MAPS_API_KEY and VITE_GOOGLE_MAPS_API_KEY

docker compose up -d
cd backend && npm install && npm run dev
# other terminal
cd frontend && npm install && npm run dev
```

2. Open http://localhost:5173
3. Upload [`sample/sample_portfolio_bengaluru.csv`](sample/sample_portfolio_bengaluru.csv) (10 rows; 3 missing coordinates — that is expected)
4. Country **India** → **Karnataka** → **Bengaluru**
5. The default city viewport is **over 30 km²**. Shrink the rectangle until Create enables
6. Pick at least one category → **Create market**
7. Dashboard polls the job, then shows:
   - **Blue** — Places discovered inside the box
   - **Green** — portfolio stores inside the box
   - **Grey** — portfolio stores outside the box (or still unlocated)

App: http://localhost:5173 · API health: http://localhost:3001/api/health

## Google Cloud

Enable on the same project:

- **Maps JavaScript API** (browser key → `VITE_GOOGLE_MAPS_API_KEY`)
- **Geocoding API** (server key → `GOOGLE_MAPS_API_KEY`)
- **Places API (New)** (same server key)

Restrict the browser key to `http://localhost:5173/*`. Never commit `.env`.

## Architecture

One Node process + Postgres + Google. No Redis, no worker queue.

```
Browser (Vite)
  POST /api/portfolios              validate CSV/XLSX → persist rows (lat/lng optional)
  GET  /api/locations/...           seed India / states / cities
  GET  /api/locations/cities/:id/bounds   Geocoding viewport (usually > 30 km²)
  POST /api/markets                 reject area > 30 → 202 + in-process job
  GET  /api/markets/:id             poll status + three layers

Job (same process)
  geocode missing portfolio coords
  classify in vs out of bbox
  tile bbox → Places Nearby (New) → dedupe placeId → drop points outside box
  status: completed | partial | failed
```

Diagrams: [docs/system-design.md](docs/system-design.md) · [docs/er-diagram.md](docs/er-diagram.md)

**Why this shape**

| Choice | Reason |
|---|---|
| `202` + poll | Nearby tiling can take tens of seconds. That is the third-party API story. Swap later for Bull/SQS without changing tables. |
| Thin Express | Area cap, retries, and tiling live in services/clients so they can be tested without HTTP. |
| Four bbox floats | No PostGIS. Cost cap is `areaSqKm ≤ 30` on **server and UI**. |
| Places writes only `discovered_stores` | Portfolio pins outside the box stay visible; the 30 km² cap limits Places spend, not the map. |

Nearby Search is a **circle**, max **20** results, **no pagination** on the New API. The job grids the rectangle (~2 km tiles), subdivides a tile if it hits 20, dedupes `placeId`, then **filters back to the rectangle**.

Retries: Geocoding and Places retry on 429 / 5xx with backoff. Some geocode or tile failures → `partial`. Every Places tile failing → `failed`.

## Data model (short)

- **portfolio_uploads / portfolio_stores** — the file. Empty lat/lng allowed.
- **markets** — city + bbox + job status.
- **market_portfolio_stores.inBoundary** — uploaded pin in vs out of the box.
- **discovered_stores** — Places pins **inside** the box only.
- **categories.googleType** — seed catalog (not parsed from the CSV).

Seed: India → Karnataka / Maharashtra / Delhi → Bengaluru / Mumbai / New Delhi. Categories: Supermarket, Pharmacy, Hypermarket, Grocery Store, Convenience Store.

## Tests

```bash
cd backend && npm test
```

Covers CSV/XLSX header+row parsing and spherical bbox area / tiling (`pointInBBox`, `tileBBoxes`). Geo math is not `Δlat × Δlng`.

## Out of v1

Auth, Redis/Bull, PostGIS, Nominatim/Overpass fallback, 150 m matching, multi-market UI, production migrations (`synchronize` is on in non-production only).
