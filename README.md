# Turn-by-turn Navigation (React + MapLibre)

Advanced React prototype for high-performance turn-by-turn navigation.

## Stack

- **Map engine:** MapLibre GL JS
- **Routing engine (demo endpoint):** OSRM public API
- **UI runtime:** React via module CDN (no local build step)

## Run

```bash
cd react_app
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Features implemented

- Multiple map view options: vector, street, dark mode
- Start/end waypoint selection by map click
- Current location permission flow (set current position as start)
- Live GPS tracking (`watchPosition`) with breadcrumb trail
- Optional follow-GPS camera mode
- Route rendering with turn-by-turn instructions
- Navigation status panel: turn left/right, roundabout labels, and lane guidance when provided by route intersections
- Vehicle simulation with user speed slider
- Bottom trip ETA panel (arrival time + remaining duration + remaining distance)
- Progress bar for trip completion
