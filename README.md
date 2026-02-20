# OpenNav React Web App

This is now a **React-based web app** (not vanilla JS) for advanced turn-by-turn navigation.

## Run

```bash
cd react_app
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Advanced features included

- React app with hooks/state lifecycle for navigation flow
- Multiple map views (vector, street, dark)
- Start/end by map tap or place search (Photon)
- Current location permission flow (`getCurrentPosition`)
- Live location tracking (`watchPosition`) + breadcrumb path
- GPS follow toggle
- Routing with OSRM (`steps=true` + annotations)
- Vehicle simulation with speed slider
- Turn status (left/right/roundabout/U-turn) + next step preview
- Lane guidance when route lane metadata is available
- Bottom ETA panel with arrival time, remaining duration/distance, and trip progress bar
