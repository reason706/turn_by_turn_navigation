# Quick Reference Guide

## 📦 File Structure

```
maplibre_valhalla_app/
│
├── 📄 Configuration Files
│   ├── package.json                  # Dependencies & NPM scripts
│   ├── tsconfig.json                 # TypeScript compiler options
│   ├── webpack.config.js             # Webpack bundler config
│   ├── Dockerfile                    # Container image definition
│   └── docker-compose.yml            # Multi-service orchestration
│
├── 📄 Documentation
│   ├── README.md                     # Complete reference (500+ lines)
│   ├── GETTING_STARTED.md            # Setup & debugging guide (400+ lines)
│   ├── EXAMPLES.md                   # Code examples & usage patterns
│   ├── ARCHITECTURE.md               # System design & diagrams
│   ├── PROJECT_SUMMARY.md            # High-level overview
│   └── QUICK_REFERENCE.md            # This file
│
├── 📂 Source Code (src/)
│   ├── types/
│   │   └── index.ts                  # TypeScript interfaces (150+ lines)
│   │                                  # - LngLatLike, Location, Route
│   │                                  # - NavigationState, ManeuverType
│   │                                  # - SearchResult, TurnInstruction
│   │
│   ├── services/
│   │   ├── valhalla.ts               # Routing service (250+ lines)
│   │   │                              # - getRoute(), isochrone()
│   │   │                              # - polyline decode, bearing calc
│   │   ├── geocoding.ts              # Search service (150+ lines)
│   │   │                              # - searchPlaces(), reverseGeocode()
│   │   │                              # - Photon + Nominatim integration
│   │   ├── location.ts               # GPS service (200+ lines)
│   │   │                              # - getCurrentPosition(), track
│   │   │                              # - bearing & distance calculation
│   │   ├── maplibre.ts               # Map service (350+ lines)
│   │   │                              # - map init, layers, interactions
│   │   │                              # - route/waypoint visualization
│   │   └── navigation.ts             # Main orchestrator (400+ lines)
│   │                                  # - state management
│   │                                  # - route tracking, simulation
│   │
│   ├── components/
│   │   ├── SearchBox.ts              # Location search UI
│   │   ├── NavigationPanel.ts        # Route & turn instructions panel
│   │   └── ControlPanel.ts           # Start/stop/simulation controls
│   │
│   ├── styles/
│   │   └── main.scss                 # Complete styling (700+ lines)
│   │                                  # - Dark/light themes
│   │                                  # - Responsive design
│   │                                  # - Animations & transitions
│   │
│   ├── utils/
│   │   ├── config.ts                 # Configuration management
│   │   └── index.ts                  # Helper functions (500+ lines)
│   │                                  # - formatDistance, calculateBearing
│   │                                  # - polyline encode/decode
│   │                                  # - debounce, throttle
│   │
│   └── index.ts                      # App entry point (250+ lines)
│                                      # - initialization, event setup
│
├── 📄 Web Assets
│   └── index.html                    # HTML template (minimal)
│
└── 📄 Git Configuration
    └── .gitignore                    # Git ignore patterns
```

## 🚀 Quick Commands

### Development
```bash
# Install dependencies (one time)
npm install

# Start dev server with hot reload
npm run dev
# → Opens http://localhost:8080

# Type check
npm run type-check
```

### Production
```bash
# Build optimized bundle
npm run build
# → Output in dist/ folder (~500KB gzipped)

# Serve production build
npm run serve
# → Serves at http://localhost:8000
```

### Docker
```bash
# Run with self-hosted services
docker-compose up -d

# Build Docker image
docker build -t nav-app .

# Run container
docker run -p 8080:8080 nav-app
```

## 📚 Key Classes & Types

### Services (Singleton Pattern)
```typescript
// Import services
import navigationManager from '@services/navigation';
import maplibreService from '@services/maplibre';
import geocodingService from '@services/geocoding';
import locationService from '@services/location';
import valhallaService from '@services/valhalla';
```

### Core Types
```typescript
// Location point
type LngLat = [number, number]; // [longitude, latitude]

// Navigation state
interface NavigationState {
  isNavigating: boolean;
  currentLocation: Location | null;
  route: Route | null;
  remainingDistance: number;
  remainingTime: number;
  arrival_time: string;
  deviation: boolean;
}

// API response
interface RouteResponse {
  routes: Route[];
  waypoints?: Waypoint[];
}
```

## 📖 Main Functions

### Navigation Manager
```typescript
// Initialize
await navigationManager.initialize();

// Request route
const route = await navigationManager.requestRoute(
  [lng, lat],           // start
  [lng, lat],           // end
  'auto'                // costing mode
);

// Navigation control
navigationManager.startNavigation();
navigationManager.stopNavigation();
navigationManager.simulateNavigation(1.5); // speed multiplier

// Event subscription
navigationManager.onStateChange((state) => {
  // State updated
});

navigationManager.onTurn((turn) => {
  // New turn instruction
});

// Get current state
const state = navigationManager.getState();
```

### MapLibre Service
```typescript
// Initialize
maplibreService.initMap({
  container: 'map',
  style: 'https://...',
  center: [lng, lat],
  zoom: 12
});

// Route management
maplibreService.addRoute(route, true);  // highlight = true
maplibreService.clearRoute();

// User location
maplibreService.updateUserLocation(lng, lat, accuracy);

// Waypoints
maplibreService.addWaypoints([
  { lng, lat, label: 'Start' },
  { lng, lat, label: 'End' }
]);

// Styling
maplibreService.setStyle(styleUrl);
maplibreService.setLayerVisibility('layer-id', true);

// Interaction
const map = maplibreService.getMap();
map.flyTo({ center: [lng, lat], zoom: 15 });
```

### Geocoding Service
```typescript
// Search places
const results = await geocodingService.searchPlaces('query');

// Autocomplete
const suggestions = await geocodingService.autocomplete('que');

// Reverse geocode
const address = await geocodingService.reverseGeocode(lng, lat);

// Search coordinates
const [coords, name] = await geocodingService.searchCoordinates('query');
```

### Location Service
```typescript
// Check support
if (!locationService.checkSupport()) { ... }

// Get once
const location = await locationService.getCurrentPosition();

// Start tracking
locationService.startTracking(
  (update) => { /* location update */ },
  (error) => { /* error handling */ }
);

// Stop tracking
locationService.stopTracking();

// Helper calculations
const bearing = LocationService.calculateBearing(from, to);
const distance = LocationService.calculateDistance(from, to);
```

### Valhalla Service
```typescript
// Get route
const route = await valhallaService.getRoute(
  [lng, lat],    // start
  [lng, lat],    // end
  undefined,     // waypoints
  'auto'         // costing
);

// Get turns
const turns = valhallaService.extractTurns(route);

// Check if on route
const onRoute = valhallaService.isOnRoute([lng, lat], geometry);

// Decode polyline
const coords = valhallaService.decodePolyline(encoded);
```

## 🎯 Common Use Cases

### 1. Search and Navigate
```typescript
const location = await navigationManager.searchLocation('Eiffel Tower');
if (location) {
  const route = await navigationManager.requestRoute(
    currentLocation.coordinates,
    location.coordinates
  );
  navigationManager.startNavigation();
}
```

### 2. GPS Tracking
```typescript
navigationManager.startLocationTracking(true);

navigationManager.onStateChange((state) => {
  console.log(state.currentLocation);
  maplibreService.updateUserLocation(
    state.currentLocation.coordinates[0],
    state.currentLocation.coordinates[1]
  );
});
```

### 3. Route Simulation
```typescript
// For demo/testing
navigationManager.simulateNavigation(1.5);  // 1.5x speed

setTimeout(() => {
  navigationManager.stopSimulation();
}, 30000); // Run for 30 seconds
```

### 4. Subscribe to Events
```typescript
// State changes
navigationManager.onStateChange((state) => {
  updateUI(state);
});

// Turn instructions
navigationManager.onTurn((turn) => {
  announceDirection(turn);
  updateTurnDisplay(turn);
});
```

## 🎨 UI Customization

### Colors (in main.scss)
```scss
$primary-color: #0084ff;      // Blue actions
$success-color: #10b981;      // Green success
$danger-color: #ef4444;       // Red warning
$dark-bg: #1f2937;            // Dark background
$light-bg: #f3f4f6;           // Light background
```

### Map Styles
```typescript
// Light
'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

// Voyager
'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json'

// Dark
'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
```

## 🔍 Debugging

### Browser Console
```javascript
// Check services
navigationManager.getState()
maplibreService.getMap()

// Test API
fetch('https://photon.komoot.io/api?q=paris')
  .then(r => r.json())
  .then(console.log)

// Enable verbose logging
window.DEBUG = true;
```

### Health Checks
```bash
# Valhalla
curl http://localhost:8002/route

# Nominatim
curl http://localhost:8001/reverse?lat=48.8566&lon=2.3522

# Photon
curl https://photon.komoot.io/api?q=test
```

## 📊 Performance Tips

1. **Debounce Search**
   ```typescript
   const debouncedSearch = debounce(search, 500);
   ```

2. **Cache Routes**
   ```typescript
   const routeCache = new Map();
   // Store and reuse routes
   ```

3. **Optimize Rendering**
   - Use vector layers (already done)
   - Limit layer visibility
   - Update throttled

4. **Reduce API Calls**
   - Use local geocoding cache
   - Batch requests
   - Reuse routes when possible

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Map not loading | Check MapLibre GL CSS import in index.ts |
| No routes found | Verify Valhalla service URL is correct |
| Search not working | Check internet, test Photon API |
| GPS not working | Enable location in browser, check HTTPS |
| Slow performance | Check network tab, reduce update frequency |
| CORS errors | Use CORS-enabled public APIs |

## 📚 External Resources

- **MapLibre:** https://maplibre.org/maplibre-gl-js/
- **Valhalla:** https://valhalla.readthedocs.io/
- **TypeScript:** https://www.typescriptlang.org/
- **Web APIs:** https://developer.mozilla.org/

## 🔗 File Dependencies

```
index.ts
├── NavigationApp uses
│   ├── navigationsManager (all features)
│   ├── maplibreService (map)
│   ├── geocodingService (search)
│   ├── SearchBox (UI)
│   ├── NavigationPanel (UI)
│   └── ControlPanel (UI)
│
NavigationManager uses
├── ValhallaService (routing)
├── GeocodingService (search)
├── LocationService (GPS)
└── MapLibreService (rendering)
```

## ✅ Deployment Checklist

- [ ] npm install
- [ ] npm run type-check (no errors)
- [ ] npm run build (successful)
- [ ] Test locally with npm run serve
- [ ] Update API endpoints if self-hosting
- [ ] Enable HTTPS in production
- [ ] Setup error tracking (optional)
- [ ] Configure CDN (optional)
- [ ] Deploy dist/ folder to hosting

## 🎓 Learning Path

1. **Start:** Read GETTING_STARTED.md
2. **Explore:** Review src/index.ts
3. **Understand:** Check src/services/navigation.ts
4. **Practice:** Run EXAMPLES.md code
5. **Customize:** Modify src/components/
6. **Deploy:** Follow deployment section

---

**Created:** February 2026 | **Version:** 1.0.0 | **Status:** Production-Ready
