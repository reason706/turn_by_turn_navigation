const { useState, useEffect, useMemo, useRef, useCallback } = React

const STYLE_PRESETS = {
  vector: 'https://demotiles.maplibre.org/style.json',
  street: {
    version: 8,
    sources: { osm: { type: 'raster', tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  },
  dark: {
    version: 8,
    sources: { dark: { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256 } },
    layers: [{ id: 'dark', type: 'raster', source: 'dark' }]
  }
}

const meters = (m) => (!m && m !== 0 ? '0 m' : m > 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`)
const duration = (s) => {
  const min = Math.max(0, Math.round((s || 0) / 60))
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`
}

const bearing = (from, to) => {
  const [lon1, lat1] = from
  const [lon2, lat2] = to
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const maneuverLabel = (step) => {
  const type = step?.maneuver?.type
  const mod = step?.maneuver?.modifier || ''
  if (!type) return 'Continue'
  if (type.includes('roundabout') || type === 'rotary') return 'Roundabout'
  if (mod.includes('left')) return 'Turn Left'
  if (mod.includes('right')) return 'Turn Right'
  if (mod.includes('uturn')) return 'U-Turn'
  return 'Continue'
}

const lanesLabel = (step) => {
  const lanes = step?.intersections?.flatMap((i) => i.lanes || []) || []
  if (!lanes.length) return 'Lane guidance unavailable'
  return lanes.slice(0, 5).map((l) => `${l.valid ? '✅' : '⬜'} ${(l.indications || []).join('/') || 'lane'}`).join(' • ')
}

function useDebounce(value, delay) {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return d
}

function App() {
  const mapDivRef = useRef(null)
  const mapRef = useRef(null)
  const routeCoordsRef = useRef([])
  const startMarkerRef = useRef(null)
  const endMarkerRef = useRef(null)
  const gpsMarkerRef = useRef(null)
  const carMarkerRef = useRef(null)
  const watchIdRef = useRef(null)
  const animRef = useRef(null)

  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [route, setRoute] = useState(null)
  const [steps, setSteps] = useState([])
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const [profile, setProfile] = useState('driving')
  const [mapStyle, setMapStyle] = useState('vector')
  const [speed, setSpeed] = useState(1)
  const [navigating, setNavigating] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeInput, setActiveInput] = useState(null)
  const [results, setResults] = useState([])
  const debouncedQuery = useDebounce(searchQuery, 500)

  const [status, setStatus] = useState('Set start and destination')
  const [error, setError] = useState('')
  const [trackingOn, setTrackingOn] = useState(false)
  const [followGps, setFollowGps] = useState(true)
  const [trackPoints, setTrackPoints] = useState([])

  const summary = useMemo(() => route ? `ETA ${duration(route.duration)} • ${meters(route.distance)}` : 'No route loaded', [route])
  const remainDist = route ? Math.max(0, route.distance * (1 - progress)) : 0
  const remainDur = route ? Math.max(0, route.duration * (1 - progress)) : 0
  const arrival = new Date(Date.now() + remainDur * 1000)

  const currentStep = steps[stepIndex]
  const nextStep = steps[Math.min(stepIndex + 1, steps.length - 1)]

  const drawRoute = useCallback((geometry) => {
    const map = mapRef.current
    if (!map) return
    routeCoordsRef.current = geometry.coordinates
    const data = { type: 'Feature', geometry, properties: {} }
    if (!map.getSource('route')) {
      map.addSource('route', { type: 'geojson', data })
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#2563eb', 'line-width': 7 } })
    } else map.getSource('route').setData(data)
  }, [])

  const drawTrack = useCallback((coords) => {
    const map = mapRef.current
    if (!map) return
    const data = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }
    if (!map.getSource('track')) {
      map.addSource('track', { type: 'geojson', data })
      map.addLayer({ id: 'track-line', type: 'line', source: 'track', paint: { 'line-color': '#10b981', 'line-width': 4 } })
    } else map.getSource('track').setData(data)
  }, [])

  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    const map = new maplibregl.Map({ container: mapDivRef.current, style: STYLE_PRESETS.vector, center: [144.9631, -37.8136], zoom: 12 })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    map.on('click', (e) => {
      const c = [e.lngLat.lng, e.lngLat.lat]
      if (!start) { setStart(c); return }
      if (!end) { setEnd(c); return }
      setStart(c); setEnd(null); setRoute(null); setSteps([]); setStatus('Start reset. Select destination.')
    })
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      map.remove(); mapRef.current = null
    }
  }, [start, end])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(STYLE_PRESETS[mapStyle])
    mapRef.current.once('styledata', () => {
      if (routeCoordsRef.current.length) drawRoute({ type: 'LineString', coordinates: routeCoordsRef.current })
      if (trackPoints.length) drawTrack(trackPoints)
    })
  }, [mapStyle, trackPoints, drawRoute, drawTrack])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (start) {
      startMarkerRef.current?.remove()
      startMarkerRef.current = new maplibregl.Marker({ color: '#2563eb' }).setLngLat(start).addTo(map)
    }
    if (end) {
      endMarkerRef.current?.remove()
      endMarkerRef.current = new maplibregl.Marker({ color: '#ef4444' }).setLngLat(end).addTo(map)
    }
  }, [start, end])

  useEffect(() => {
    if (!debouncedQuery || !activeInput) { setResults([]); return }
    fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(debouncedQuery)}&limit=5`)
      .then((r) => r.json())
      .then((d) => setResults((d.features || []).map((f, i) => ({
        id: `${f.properties.osm_id || 'x'}-${i}`,
        name: f.properties.name || f.properties.city || 'Unknown',
        full: f.properties.name || f.properties.city || 'Unknown',
        lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1]
      }))))
      .catch(() => setResults([]))
  }, [debouncedQuery, activeInput])

  const choosePlace = (p) => {
    const c = [p.lon, p.lat]
    if (activeInput === 'start') setStart(c); else setEnd(c)
    setActiveInput(null); setSearchQuery(''); setResults([])
    mapRef.current?.flyTo({ center: c, zoom: 15 })
  }

  const fetchRoute = async () => {
    if (!start || !end) return
    setError(''); setStatus('Routing...')
    try {
      const url = `https://router.project-osrm.org/route/v1/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true&annotations=true`
      const res = await fetch(url)
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route found')
      const r = data.routes[0]
      setRoute(r); setSteps(r.legs[0]?.steps || []); setStepIndex(0); setProgress(0)
      drawRoute(r.geometry)
      const b = r.geometry.coordinates.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(r.geometry.coordinates[0], r.geometry.coordinates[0]))
      mapRef.current.fitBounds(b, { padding: 60 })
      setStatus('Route ready')
    } catch (e) {
      setError(e.message || 'Routing error')
      setStatus('Routing failed')
    }
  }

  useEffect(() => { if (start && end) fetchRoute() }, [start, end, profile])

  const stopSim = () => {
    setNavigating(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (carMarkerRef.current) carMarkerRef.current.remove()
    carMarkerRef.current = null
    mapRef.current?.setPitch(0)
    mapRef.current?.setBearing(0)
  }

  const startSim = () => {
    if (!routeCoordsRef.current.length || !mapRef.current) return
    stopSim(); setNavigating(true); setStatus('Simulation running')
    const coords = routeCoordsRef.current
    let t = 0
    let prev = performance.now()
    const map = mapRef.current
    carMarkerRef.current = new maplibregl.Marker({ color: '#111827' }).setLngLat(coords[0]).addTo(map)
    map.setPitch(55); map.setZoom(17)
    const tick = (ts) => {
      if (!carMarkerRef.current) return
      const dt = Math.min(40, ts - prev); prev = ts
      t += (dt / 16.67) * 0.8 * speed
      const i = Math.min(coords.length - 1, Math.floor(t))
      const p = coords[i]
      const n = coords[Math.min(i + 1, coords.length - 1)]
      carMarkerRef.current.setLngLat(p)
      map.easeTo({ center: p, bearing: bearing(p, n), duration: 110, easing: (x) => x, essential: true })
      const ratio = i / Math.max(1, coords.length - 1)
      setProgress(ratio)
      setStepIndex(Math.min(steps.length - 1, Math.floor(ratio * Math.max(1, steps.length))))
      if (i >= coords.length - 1) { setStatus('Arrived'); setProgress(1); stopSim(); return }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = [pos.coords.longitude, pos.coords.latitude]
        setStart(c)
        mapRef.current?.flyTo({ center: c, zoom: 15 })
        setStatus('Current location set as start')
      },
      (e) => setError(`Location permission denied: ${e.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const toggleTracking = () => {
    if (!navigator.geolocation) { setError('Geolocation not supported'); return }
    if (trackingOn) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setTrackingOn(false)
      setStatus('Tracking stopped')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = [pos.coords.longitude, pos.coords.latitude]
        if (!gpsMarkerRef.current) gpsMarkerRef.current = new maplibregl.Marker({ color: '#10b981' }).setLngLat(c).addTo(mapRef.current)
        else gpsMarkerRef.current.setLngLat(c)
        setTrackPoints((prev) => {
          const next = [...prev, c].slice(-500)
          drawTrack(next)
          return next
        })
        if (followGps) mapRef.current?.easeTo({ center: c, duration: 300 })
      },
      (e) => setError(`Tracking failed: ${e.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    )
    setTrackingOn(true)
    setStatus('Tracking started')
  }

  const clearAll = () => {
    stopSim(); setStart(null); setEnd(null); setRoute(null); setSteps([]); setStepIndex(0); setProgress(0)
    setTrackPoints([]); setResults([]); setStatus('Set start and destination'); setError('')
    startMarkerRef.current?.remove(); endMarkerRef.current?.remove(); gpsMarkerRef.current?.remove()
    const map = mapRef.current
    if (map?.getSource('route')) { map.removeLayer('route-line'); map.removeSource('route') }
    if (map?.getSource('track')) { map.removeLayer('track-line'); map.removeSource('track') }
  }

  return (
    <div className="app">
      <div className="panel">
        <div className="header"><h1>OpenNav React Advanced</h1><div>Turn-by-turn with tracking, lanes, ETA panel</div></div>
        <div className="controls">
          <div className="row"><input value={activeInput === 'start' ? searchQuery : (start ? `${start[1].toFixed(5)}, ${start[0].toFixed(5)}` : '')} placeholder="Start" onFocus={() => setActiveInput('start')} onChange={(e) => { setActiveInput('start'); setSearchQuery(e.target.value) }} /></div>
          <div className="row"><input value={activeInput === 'end' ? searchQuery : (end ? `${end[1].toFixed(5)}, ${end[0].toFixed(5)}` : '')} placeholder="Destination" onFocus={() => setActiveInput('end')} onChange={(e) => { setActiveInput('end'); setSearchQuery(e.target.value) }} /></div>

          {!!results.length && <div className="resultList">{results.map((r) => <button className="result" key={r.id} onClick={() => choosePlace(r)}>{r.name}</button>)}</div>}

          <div className="row"><select value={profile} onChange={(e) => setProfile(e.target.value)}><option value="driving">Driving</option><option value="cycling">Cycling</option><option value="walking">Walking</option></select></div>
          <div className="row"><select value={mapStyle} onChange={(e) => setMapStyle(e.target.value)}><option value="vector">Vector</option><option value="street">Street</option><option value="dark">Dark</option></select></div>

          <div className="grid3">
            <button onClick={startSim} disabled={!route || navigating}>Start Sim</button>
            <button className="secondary" onClick={stopSim} disabled={!navigating}>Stop</button>
            <button className="secondary" onClick={clearAll}>Clear</button>
          </div>
          <div className="grid3">
            <button className="secondary" onClick={useCurrentLocation}>Use GPS</button>
            <button className="secondary" onClick={toggleTracking}>{trackingOn ? 'Stop Track' : 'Track'}</button>
            <button className="secondary" onClick={() => setFollowGps((v) => !v)}>{followGps ? 'Follow ON' : 'Follow OFF'}</button>
          </div>

          <div className="row">Simulation speed: {speed.toFixed(1)}x<input type="range" min="0.5" max="6" step="0.5" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></div>

          <div className="status">{status}</div>
          {error && <div className="error">{error}</div>}
          <div className="summary">{summary}</div>

          <div className="stepCard">
            <strong>{maneuverLabel(currentStep)}</strong>
            <div>{currentStep?.maneuver?.instruction || 'No maneuver yet'}</div>
            {currentStep && <small>{meters(currentStep.distance)}</small>}
            <small>{lanesLabel(currentStep)}</small>
            {nextStep && nextStep !== currentStep && <small>Next: {maneuverLabel(nextStep)} • {nextStep?.maneuver?.instruction}</small>}
          </div>
        </div>
      </div>
      <div className="mapWrap">
        <div ref={mapDivRef} id="map"></div>
        <div className="eta">
          <div style={{ fontSize: 12, opacity: .85 }}>Trip Estimate</div>
          <div className="etaMain">
            <div>Arrival {arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div>{duration(remainDur)} • {meters(remainDist)}</div>
          </div>
        </div>
        <div className="progress"><div className="progressFill" style={{ width: `${Math.round(progress * 100)}%` }}></div></div>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
