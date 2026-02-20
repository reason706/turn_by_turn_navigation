# Turn-by-turn Navigation (React + MapLibre)

This repository includes a **high-performance React prototype** for turn-by-turn navigation.

## Stack

- **Map engine:** MapLibre GL JS (vector-based)
- **Routing engine (demo endpoint):** OSRM public API
- **UI runtime:** React (module CDN, no build step required)

## Run

```bash
cd react_app
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Implemented performance-focused behaviors

- Vector rendering via MapLibre (GPU-friendly map pipeline)
- Navigation simulation with `requestAnimationFrame`
- Route request cancellation with `AbortController`
- Route geometry and animation handles in refs to avoid unnecessary React re-renders
- Lightweight UI updates while map camera follows the vehicle
