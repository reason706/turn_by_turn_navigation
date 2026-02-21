# Getting Started Guide

## Quick Start (5 minutes)

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** 16+ ([download](https://nodejs.org/))
- **npm** 7+ (comes with Node.js)
- Git (for cloning)

### 2. Installation

```bash
# Navigate to the project
cd maplibre_valhalla_app

# Install dependencies
npm install
```

**Installation takes ~2 minutes depending on internet speed**

### 3. Start Development Server

```bash
npm run dev
```

- Opens browser at `http://localhost:8080`
- Hot-reload enabled - changes apply instantly
- Ready to explore!

### 4. Test Features

1. **Search for a location**
   - Type "Eiffel Tower" in the search box
   - Click on a result

2. **Request a route**
   - Click on the map to select a destination
   - Route automatically calculates

3. **Navigate**
   - Click "▶ Start" button
   - Watch vehicle simulate movement
   - Adjust speed with the slider

4. **Change map style**
   - Select different styles from the dropdown
   - Night mode available!

---

## Configuring Services

### Option A: Use Public Services (Easiest)

No configuration needed! The app uses:
- **Valhalla:** `valhalla.openstreetmap.de` (free but rate-limited)
- **Geocoding:** `photon.komoot.io` + `nominatim.openstreetmap.org`
- **Maps:** CartoDB Positron/Voyager/Dark

**Limitations:** 50-100 requests/hour per IP

### Option B: Self-Hosted Services (Recommended)

#### Setup Valhalla with Docker

```bash
# 1. Create data directory
mkdir -p valhalla_data/

# 2. Run Valhalla service
docker run -dt --name valhalla -p 8002:8002 \
  -v valhalla_data:/data valhalla/valhalla:latest

# 3. Update app to use local Valhalla
# Edit src/services/valhalla.ts:
# new ValhallaService('http://localhost:8002')
```

#### Setup Nominatim with Docker

```bash
# Full setup (20GB+ disk space)
docker run -dt --name nominatim -p 8001:80 \
  -e PBF_URL=https://planet.openstreetmap.org/pbf/europe/france-latest.osm.pbf \
  mediagis/nominatim:latest

# Use lighter Photon instead (recommended)
# It works with public servers - no setup needed!
```

#### Update Service URLs

**src/services/valhalla.ts:**
```typescript
constructor(baseUrl: string = 'http://localhost:8002') {
  this.baseUrl = baseUrl;
  // ...
}
```

**src/services/geocoding.ts:**
```typescript
constructor(
  photonUrl: string = 'https://photon.komoot.io',
  nominatimUrl: string = 'http://localhost:8001'
) {
  // ...
}
```

---

## Building for Production

### 1. Create Optimized Build

```bash
npm run build
```

- Minifies code
- Bundles assets
- Optimizes images
- Output: `dist/` folder

**Build time:** ~30 seconds
**Bundle size:** ~500KB gzipped

### 2. Serve Locally

```bash
npm run serve
```

Opens at `http://localhost:8000`

### 3. Deploy

#### To Vercel (Recommended for Quick Deploy)

```bash
npm install -g vercel
vercel
# Follow prompts, select dist/ as build output
```

#### To Netlify

```bash
netlify deploy --prod --dir=dist
```

#### To GitHub Pages

```bash
# Add to package.json predeploy script
# Then push to GitHub and enable Pages
```

#### To Docker Registry

```bash
docker build -t myapp:1.0 .
docker run -p 8080:8080 myapp:1.0
```

---

## Environment Variables

Create `.env` file (optional):

```env
# API Endpoints
VALHALLA_URL=http://localhost:8002
PHOTON_URL=https://photon.komoot.io
NOMINATIM_URL=https://nominatim.openstreetmap.org

# Map Settings
MAP_STYLE=https://basemaps.cartocdn.com/gl/positron-gl-style/style.json

# Features
ENABLE_OFFLINE_MODE=false
ENABLE_TRAFFIC_LAYER=false
ENABLE_VOICE_ANNOUNCEMENTS=true
```

Then in code:
```typescript
const config = getConfig();
// Uses process.env or defaults
```

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Web Browser (Client)            │
├─────────────────────────────────────────┤
│  Navigation App (TypeScript/React)      │
│  ├─ SearchBox (UI Component)            │
│  ├─ NavigationPanel (UI Component)      │
│  ├─ ControlPanel (UI Component)         │
│  └─ NavigationManager (Orchestrator)    │
├─────────────────────────────────────────┤
│  Services Layer                         │
│  ├─ MapLibreService ──────────────┐    │
│  ├─ NavigationService ────────────┐│   │
│  ├─ GeocodingService ────────────┐││   │
│  └─ LocationService ────────────┐│││   │
├──────────────────────────────────────┤  │
│        External APIs (Internet)      │  │
│  ├─ MapLibre Tiles (CartoDB) ◄────────┘  │
│  ├─ Valhalla Routing Server ◄───────────┘
│  ├─ Nominatim Geocoding ◄────────────────┘
│  └─ Photon Search ◄─────────────────────┘
└─────────────────────────────────────────┘
```

---

## Coding Guide

### Adding a New Feature

**1. Define Types** (`src/types/index.ts`):
```typescript
export interface MyFeature {
  id: string;
  name: string;
  // ...
}
```

**2. Create Service** (`src/services/myservice.ts`):
```typescript
class MyService {
  async doSomething(): Promise<MyFeature> {
    // Implementation
  }
}

export default new MyService();
```

**3. Create UI Component** (`src/components/MyComponent.ts`):
```typescript
export class MyComponent {
  constructor(container: HTMLElement) {
    this.render();
    this.setupListeners();
  }

  private render(): void {
    // HTML
  }

  private setupListeners(): void {
    // Event handlers
  }
}
```

**4. Integrate in App** (`src/index.ts`):
```typescript
import myService from '@services/myservice';
import { MyComponent } from '@components/MyComponent';

class NavigationApp {
  async initialize() {
    // Initialize your component
    const myComp = new MyComponent(container);
    
    // Use your service
    const result = await myService.doSomething();
  }
}
```

### Code Style

- **TypeScript:** Strict mode (`tsconfig.json`)
- **Naming:** camelCase for variables/functions, PascalCase for classes
- **Comments:** JSDoc for public functions
- **Imports:** Use path aliases from `tsconfig.json`

```typescript
// ❌ Bad
import something from '../../../services/file';

// ✅ Good
import something from '@services/file';
```

---

## Performance Tips

### 1. Optimize API Calls
```typescript
// ❌ Bad - many requests
for (const place of places) {
  const route = await getRoute(start, place);
}

// ✅ Good - batch requests
const routes = await Promise.all(
  places.map(place => getRoute(start, place))
);
```

### 2. Debounce Search
```typescript
const debouncedSearch = debounce(
  (query: string) => searchPlaces(query),
  500 // 500ms delay
);

input.addEventListener('input', (e) => {
  debouncedSearch((e.target as HTMLInputElement).value);
});
```

### 3. Cache Routes
```typescript
const routeCache = new Map<string, Route>();

function getCachedRoute(start: any, end: any): Route | undefined {
  const key = JSON.stringify({ start, end });
  return routeCache.get(key);
}
```

### 4. Lazy Load Images
```typescript
<img loading="lazy" src="..." />
```

---

## Debugging

### Enable Debug Logging

**src/index.ts:**
```typescript
const DEBUG = true;

if (DEBUG) {
  console.log('Navigation state:', state);
  console.log('Route:', route);
}
```

### Browser DevTools

1. **F12** - Open DevTools
2. **Console Tab** - View errors/logs
3. **Network Tab** - Monitor API calls
4. **Sources Tab** - Debug TypeScript (source maps enabled)
5. **Application → Local Storage** - Check cached data

### Check Service Health

```typescript
// Test Valhalla
fetch('http://valhalla.openstreetmap.de/route?...')
  .then(r => r.json())
  .then(d => console.log('Valhalla OK', d))
  .catch(e => console.error('Valhalla Error', e));

// Test Geocoding
fetch('https://photon.komoot.io/api?q=paris')
  .then(r => r.json())
  .then(d => console.log('Geocoding OK', d))
  .catch(e => console.error('Geocoding Error', e));
```

---

## Testing

### Unit Tests (Setup Example)

```bash
npm install --save-dev jest @types/jest ts-jest
```

**jest.config.js:**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
};
```

**src/utils/__tests__/math.test.ts:**
```typescript
import { calculateDistance } from '../index';

describe('calculateDistance', () => {
  it('calculates distance correctly', () => {
    const distance = calculateDistance([0, 0], [0, 1]);
    expect(distance).toBeGreaterThan(110000); // ~111 km
  });
});
```

Run tests:
```bash
jest
```

---

## Troubleshooting

### Issue: "Cannot find module '@services/valhalla'"
**Solution:** Verify `tsconfig.json` paths and `webpack.config.js` aliases match.

### Issue: Map not displaying
**Solution:** 
- Check MapLibre GL CSS is imported in `src/index.ts`
- Verify map container has width/height
- Check browser console for errors

### Issue: Routes not loading
**Solution:**
- Test Valhalla service is accessible
- Check network tab for API errors
- Verify coordinates are valid [lng, lat] format

### Issue: Search not working
**Solution:**
- Try `https://photon.komoot.io/api?q=london`
- Check CORS headers in browser DevTools
- Verify internet connection

### Issue: "CORS error"
**Solution:**
- Use CORS-enabled public APIs (already configured)
- For self-hosted, enable CORS in server config
- Use JSONP as fallback

---

## Next Steps

- [ ] Deploy to production
- [ ] Add traffic layer integration
- [ ] Implement offline mode with service workers
- [ ] Add real-time updates from backend
- [ ] Setup error monitoring (Sentry)
- [ ] Configure analytics (Plausible)
- [ ] Add unit tests
- [ ] Setup CI/CD pipeline

---

## Resources

- **MapLibre Documentation:** https://maplibre.org/maplibre-gl-js/
- **Valhalla API Docs:** https://valhalla.readthedocs.io/
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Web APIs:** https://developer.mozilla.org/en-US/docs/Web/API/

---

## Support

- **Issues:** Check GitHub Issues
- **Discussions:** Start a GitHub Discussion
- **Email:** support@example.com

Happy navigating! 🗺️
