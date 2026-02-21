# Architecture Guide

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Interface                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   SearchBox      │  │ NavigationPanel │  │ ControlPanel │  │
│  │   - Location     │  │ - Route Info    │  │ - Start/Stop │  │
│  │   - Autocomplete │  │ - Turn Instr.   │  │ - Simulation │  │
│  │   - Results      │  │ - Progress      │  │ - Map Style  │  │
│  └────────┬─────────┘  └────────┬────────┘  └──────┬───────┘  │
│           │                    │                   │           │
└───────────┼────────────────────┼───────────────────┼───────────┘
            │                    │                   │
            └────────────────────┼───────────────────┘
                                 │
┌────────────────────────────────┴──────────────────────────────┐
│              NavigationManager (Orchestrator)               │
│  • State management                                        │
│  • Event coordination                                      │
│  • Navigation lifecycle                                   │
│  • Route tracking                                         │
│  • Vehicle simulation                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
┌───────▼────────┐ ┌──▼──────────┐ ┌▼────────────┐ ┌▼──────────────┐
│  MapLibre      │ │  Valhalla   │ │ Geocoding  │ │ Location     │
│  Service       │ │  Service    │ │ Service    │ │ Service      │
├────────────────┤ ├─────────────┤ ├────────────┤ ├──────────────┤
│ • Map Init     │ │ • Routing   │ │ • Search   │ │ • GPS Track  │
│ • Layer Mgmt   │ │ • Turn List │ │ • Reverse  │ │ • Bearing    │
│ • Events       │ │ • Isochrone │ │ • Address  │ │ • Distance   │
│ • Styling      │ │ • Polyline  │ │ • Auto     │ │ • Events     │
└────────┬───────┘ └─────┬──────┘ └────┬──────┘ └──────┬───────┘
         │                │            │               │
         └────────────────┼────────────┼───────────────┘
                          │
┌─────────────────────────┴──────────────────────────────────┐
│           External API Services (Internet)               │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │   Valhalla   │  │   CartoDB    │  │  Nominatim  │   │
│  │   Routing    │  │ Vector Tiles │  │ Geocoding   │   │
│  └──────────────┘  └──────────────┘  └─────────────┘   │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │    Photon    │  │      GPS     │  │   Browser   │   │
│  │  Autocomplete│  │ Geolocation  │  │  Geolocation│   │
│  └──────────────┘  └──────────────┘  └─────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
User Interaction
     │
     ▼
  SearchBox / Map Click
     │
     ├──────────────────────────────┐
     │                              │
    Search Location             Request Route
     │                              │
     ▼                              ▼
GeocodingService          NavigationManager
     │                              │
  (Photon/Nominatim)      ValhallaService
     │                              │
     ▼                              ▼
  Location Found          Route Calculated
     │                              │
     └──────────────┬───────────────┘
                    │
                    ▼
             NavigationManager
             (Update State)
                    │
          ┌─────────┼─────────┐
          │         │         │
          ▼         ▼         ▼
      MapLibre   Navigation  Location
      Service    Panel       Service
          │         │         │
          ▼         ▼         ▼
       Route    Turn Text   GPS Track
       Display  Progress    Update
```

## Service Dependencies

```
NavigationManager (singleton)
├── requires: ValhallaService
├── requires: GeocodingService
├── requires: LocationService
└── requires: MapLibreService

MapLibreService
├── depends: maplibre-gl library
├── depends: Map container
└── manages: MapLibre instance

ValhallaService
├── depends: axios (HTTP client)
├── calls: Valhalla API
└── returns: Route objects

GeocodingService
├── depends: axios
├── calls: Photon API (search)
├── calls: Nominatim API (reverse)
└── returns: Location results

LocationService
├── depends: Browser Geolocation API
├── provides: GPS coordinates
└── tracks: Location updates
```

## Component Hierarchy

```
NavigationApp (Main)
│
└─ NavigationManager
   │
   ├─ MapLibreService
   │  ├─ maplibregl.Map
   │  ├─ GeoJSON sources
   │  │  ├─ route (LineString)
   │  │  ├─ waypoints (Points)
   │  │  └─ user-location (Point)
   │  └─ Layers
   │     ├─ route-line
   │     ├─ direction-arrows
   │     ├─ waypoint-circle
   │     └─ user-location-circle
   │
   ├─ ValhallaService
   │  ├─ HTTP client
   │  ├─ Request formatter
   │  └─ Response parser
   │
   ├─ GeocodingService
   │  ├─ Photon client
   │  └─ Nominatim client
   │
   └─ LocationService
      └─ Geolocation watcher
      
UI Components
├─ SearchBox
│  ├─ input field
│  ├─ results dropdown
│  └─ event handlers
│
├─ NavigationPanel
│  ├─ route info
│  ├─ progress bar
│  └─ turn instructions
│
└─ ControlPanel
   ├─ start/stop buttons
   ├─ speed slider
   ├─ style selector
   └─ status display
```

## State Management Flow

```
NavigationState
└─ Updated by NavigationManager when:
   ├─ Location changes (LocationService callback)
   ├─ Route changes (when route requested)
   ├─ Navigation starts/stops
   ├─ Step advances during simulation
   ├─ Speed changes
   └─ Deviation detected

State Structure:
{
  isNavigating: boolean      ◄── startNavigation/stopNavigation
  currentLocation: Location  ◄── LocationService updates
  route: Route              ◄── requestRoute()
  currentStepIndex: number   ◄── Navigation progress
  remainingDistance: number  ◄── Calculated from route
  remainingTime: number      ◄── Calculated from route
  arrival_time: string       ◄── Calculated from duration
  deviation: boolean         ◄── Route deviation check
  speed: number             ◄── From GPS or simulation
  heading: number           ◄── From GPS or calculation
}

State Changes → Notify Observers
     │
     ├─ NavigationPanel.updateState()
     ├─ ControlPanel.updateUI()
     └─ Custom subscribers via onStateChange()
```

## Event Flow

```
User Actions
│
├─ Map Click
│  └─ requestRoute(start, clicked_point)
│
├─ Search Box Input
│  └─ searchPlaces(query)
│
├─ Button Click
│  ├─ startNavigation()
│  ├─ stopNavigation()
│  ├─ simulateNavigation(speed)
│  └─ onStyleChange(style)
│
└─ GPS Update
   └─ LocationService notification
      └─ updateUserLocation()

Internal Events
│
├─ Route Calculated
│  └─ Emit onStateChange(state)
│     └─ Update all observers
│
├─ Navigation Started
│  └─ Begin simulation loop
│     └─ Emit location updates
│
├─ Step Reached
│  └─ Emit onTurn(instruction)
│
└─ Navigation Complete
   └─ Stop simulation
      └─ Update state
```

## API Integration Points

```
Frontend (TypeScript)
   │
   ├──► Valhalla (HTTP POST)
   │    └─ /route endpoint
   │       ├─ Input: locations, costing
   │       └─ Output: routes with legs/steps
   │
   ├──► Photon (HTTP GET)
   │    └─ /api endpoint
   │       ├─ Input: q (query)
   │       └─ Output: features with coordinates
   │
   ├──► Nominatim (HTTP GET)
   │    └─ /reverse endpoint
   │       ├─ Input: lat, lon
   │       └─ Output: address
   │
   ├──► CartoDB (HTTPS)
   │    └─ Vector tile URLs
   │       ├─ Style JSON
   │       └─ VectorTiles (pbf)
   │
   └──► Browser Geolocation
        └─ Navigator.geolocation
           ├─ getCurrentPosition()
           └─ watchPosition()
```

## Routing Algorithm (Simplified)

```
Request Route(from, to)
       │
       ▼
Build Valhalla JSON
{
  locations: [{lat, lon}, ...],
  costing: 'auto',
  directions_options: {...}
}
       │
       ▼
POST to Valhalla API
       │
       ▼
Parse Response
       │
       ├─ Geometry (encoded polyline)
       ├─ Legs (segments)
       │  └─ Steps (turn-by-turn)
       │     ├─ instruction (text)
       │     ├─ distance
       │     ├─ duration
       │     └─ maneuver (turn details)
       │
       ▼
Return Route Object
       │
       ▼
Display on Map
└─ Add route GeoJSON
       │
       ▼
Update Navigation Panel
└─ Show ETA, distance, turns
```

## Simulation Algorithm

```
Start Simulation(speedMultiplier)
       │
       ▼
Set interval timer (every 1 second)
       │
       ▼
Each timer tick:
  ├─ Get current position
  ├─ Calculate bearing to next waypoint
  ├─ Move forward along bearing
  │  └─ distance = speed × (1 / speedMultiplier)
  ├─ Update map position
  ├─ Check if reached waypoint
  │  └─ If yes: advance to next step
  │      └─ Emit onTurn event
  ├─ Update progress
  └─ Emit onStateChange
       │
       ▼
Repeat until navigation complete
       │
       ▼
Stop Timer
└─ Clear simulation interval
```

## TypeScript Type System

```
Core Types
├─ LngLatLike: { lng, lat }
├─ Coordinates: { longitude, latitude }
├─ Location: { coordinates, name?, address? }
│
Route Types
├─ Route: { geometry, legs, distance, duration }
├─ Leg: { distance, duration, steps }
├─ Step: { distance, duration, instruction, maneuver }
├─ Maneuver: { type, modifier, bearing, location }
│
Maneuver Types
├─ turn
├─ modifier: 'left' | 'right' | 'sharp' | 'uturn' | etc.
│
State Types
├─ NavigationState: { all fields }
├─ LocationUpdate: { coordinates, accuracy, timestamp }
│
Service Response Types
├─ RouteResponse: { routes[], waypoints[] }
├─ GeocodeResponse: { features[] }
├─ SearchResult: { id, name, address, coordinates }
```

## Performance Optimization

```
Optimization Strategy
│
├─ Map Rendering
│  ├─ Vector tiles (MapLibre)
│  ├─ Lazy layer loading
│  ├─ WebGL rendering
│  └─ 60 FPS target
│
├─ Data Transfer
│  ├─ Polyline compression
│  ├─ Route caching
│  ├─ GeoJSON streaming
│  └─ HTTP compression (gzip)
│
├─ Computation
│  ├─ Debounced search
│  ├─ Throttled events
│  ├─ Efficient distance calc
│  └─ Client-side processing
│
└─ Bundle Size
   ├─ Tree shaking
   ├─ Code splitting
   ├─ Minification
   └─ Target: < 500KB gzipped
```

## Deployment Architecture

```
Development
└─ npm run dev
   └─ webpack-dev-server
      └─ Hot reload on file change

Production
├─ npm run build
│  └─ Optimized bundle in dist/
│
└─ Deployment Options:
   ├─ Static Files
   │  └─ HTTP Server
   │     ├─ Vercel
   │     ├─ Netlify  
   │     └─ GitHub Pages
   │
   ├─ Container
   │  ├─ Docker image
   │  └─ Docker Hub registry
   │
   └─ Services
      ├─ Self-hosted Valhalla
      ├─ Self-hosted Nominatim
      └─ Or use public APIs
```

---

This architecture provides:
- ✅ **Scalability** - Easy to add new services
- ✅ **Maintainability** - Clear separation of concerns
- ✅ **Testability** - Service-based design
- ✅ **Performance** - Optimized data flow
- ✅ **Flexibility** - Pluggable components
