# Turn-by-turn navigation stack plan (open source + free data)

## Goal
Build a Google-Maps-like turn-by-turn navigation experience using free/open-source components that are production-friendly and scalable.

## Tile-based vs vector-based: which is best?

### Short answer
For a modern turn-by-turn app, **vector-based maps are the better default**.

### Why vector-based wins for this use case
- **Smooth UX at runtime**: dynamic styling, smooth zoom/rotation, and better handling of lane/road emphasis.
- **Smaller network payloads at multiple zoom levels** when tuned correctly, especially for interactive clients.
- **One data source, many styles**: day/night themes, navigation mode style, traffic overlays.
- **Client-side flexibility**: highlight route, maneuver arrows, rerouting visuals without re-rendering server raster tiles.

### When tile-based is still useful
- If you need the simplest possible setup quickly.
- If targeting very low-end devices where client vector rendering may be expensive.
- As a fallback cache layer (pre-rendered raster tiles) for reliability.

## Recommended free/open-source stack

### 1) Basemap rendering
- **MapLibre GL JS** (web) and MapLibre Native (mobile) for vector map rendering.
- **OpenMapTiles schema + tileserver-gl / Martin / Tegola** for serving vector tiles.
- **Data source**: OpenStreetMap extracts (regional + planet updates).

### 2) Routing engine (turn-by-turn core)
- **Valhalla** (recommended first choice)
  - Strong support for turn-by-turn instructions.
  - Good multimodal support and practical APIs.
  - Widely used in open-source navigation deployments.

- **Alternative**: OSRM
  - Very fast car routing.
  - Great if you prioritize shortest-latency car routes over richer instruction features.

### 3) Geocoding / search
- **Nominatim** (self-hosted) or Photon for place search.

### 4) Optional traffic / live conditions
- Start with static ETA from OSM + speed profiles.
- Add open traffic feeds later where available (country/city specific).

## Proposed architecture (phase 1)
1. Client app requests route from Valhalla.
2. Client renders route and maneuver list on MapLibre.
3. Vector basemap tiles served from self-hosted tile server.
4. Geocoding requests handled by Nominatim.
5. Periodic OSM updates refresh routing graph + tiles.

## Practical recommendation for this project
- Choose **vector-based maps** as the primary approach.
- Use this stack:
  - **MapLibre + OpenMapTiles + Valhalla + Nominatim**.
- Keep a lightweight raster fallback only if device constraints demand it.

## Why this matches the “Google-map-like” goal
- Smooth interaction + style control close to modern proprietary map UX.
- High-quality maneuver visualization and rerouting support.
- Fully open-source, no per-request map licensing fees.

## Next step checklist
- Pick initial deployment region (single country/city first).
- Stand up services in Docker Compose:
  - valhalla
  - vector tile server
  - nominatim/photon
- Define route API contract consumed by frontend.
- Implement first route render + step-by-step maneuvers.
- Add reroute trigger logic based on GPS drift from route polyline.
