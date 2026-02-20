import React, { useCallback, useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.3.1'
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client'
import maplibregl from 'https://esm.sh/maplibre-gl@4.7.1'

const h = React.createElement

const STYLE_PRESETS = {
  vector: 'https://demotiles.maplibre.org/style.json',
  street: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  },
  dark: {
    version: 8,
    sources: {
      carto: {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors © CARTO'
      }
    },
    layers: [{ id: 'carto', type: 'raster', source: 'carto' }]
  }
}

function metersToLabel(m) {
  if (!m && m !== 0) return '0 m'
  return m > 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function secondsToLabel(s) {
  const min = Math.max(0, Math.round(s / 60))
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

function bearing(from, to) {
  const [lon1, lat1] = from
  const [lon2, lat2] = to
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI
  const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2))
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1))
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function maneuverLabel(step) {
  if (!step?.maneuver) return 'Continue'
  const { type, modifier } = step.maneuver
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') return 'Roundabout'
  if (modifier?.includes('left')) return 'Turn Left'
  if (modifier?.includes('right')) return 'Turn Right'
  if (modifier?.includes('uturn')) return 'U-Turn'
  if (modifier?.includes('straight')) return 'Go Straight'
  return (type || 'continue').replaceAll('_', ' ')
}

function lanesLabel(step) {
  const laneData = step?.intersections?.flatMap((i) => i.lanes || []) || []
  if (!laneData.length) return 'Lane guidance unavailable'
  return laneData
    .slice(0, 5)
    .map((l) => `${l.valid ? '✅' : '⬜'} ${Array.isArray(l.indications) ? l.indications.join('/') : 'lane'}`)
    .join(' • ')
}

function App() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const routeGeoRef = useRef(null)
  const animRef = useRef(null)
  const abortRef = useRef(null)
  const watchIdRef = useRef(null)

  const startMarkerRef = useRef(null)
  const endMarkerRef = useRef(null)
  const carMarkerRef = useRef(null)
  const userMarkerRef = useRef(null)

  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [profile, setProfile] = useState('driving')
  const [mapStyle, setMapStyle] = useState('vector')

  const [route, setRoute] = useState(null)
  const [steps, setSteps] = useState([])
  const [status, setStatus] = useState('Click map to set start and destination')
  const [navigating, setNavigating] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [stepIndex, setStepIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  const [followGps, setFollowGps] = useState(true)
  const [trackingOn, setTrackingOn] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [trackPoints, setTrackPoints] = useState([])

  const summary = useMemo(() => {
    if (!route) return 'No route loaded'
    return `ETA ${secondsToLabel(route.duration)} • Distance ${metersToLabel(route.distance)}`
  }, [route])

  const remainingDistance = route ? Math.max(0, route.distance * (1 - progress)) : 0
  const remainingDuration = route ? Math.max(0, route.duration * (1 - progress)) : 0
  const arrivalTime = new Date(Date.now() + remainingDuration * 1000)

  const currentStep = steps[stepIndex]
  const nextStep = steps[Math.min(stepIndex + 1, steps.length - 1)]

  const stopNavigation = useCallback(() => {
    setNavigating(false)
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (carMarkerRef.current) carMarkerRef.current.remove()
    carMarkerRef.current = null
    mapRef.current?.setPitch(0)
    mapRef.current?.setBearing(0)
  }, [])

  const setMarker = useCallback((coord, type) => {
    if (!mapRef.current) return
    const markerRef = type === 'start' ? startMarkerRef : endMarkerRef
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = new maplibregl.Marker({ color: type === 'start' ? '#2563eb' : '#dc2626' }).setLngLat(coord).addTo(mapRef.current)
  }, [])

  const updateTrackSource = useCallback((coords) => {
    const map = mapRef.current
    if (!map) return
    const feature = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} }

    if (!map.getSource('gps-track')) {
      map.addSource('gps-track', { type: 'geojson', data: feature })
      map.addLayer({
        id: 'gps-track-line',
        type: 'line',
        source: 'gps-track',
        paint: { 'line-color': '#10b981', 'line-width': 4, 'line-opacity': 0.9 }
      })
      return
    }
    map.getSource('gps-track').setData(feature)
  }, [])

  const renderRoute = useCallback((geometry) => {
    const map = mapRef.current
    if (!map) return
    const data = { type: 'Feature', geometry, properties: {} }
    routeGeoRef.current = geometry.coordinates
    if (map.getSource('route')) {
      map.getSource('route').setData(data)
      return
    }
    map.addSource('route', { type: 'geojson', data })
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#2563eb', 'line-width': 7, 'line-opacity': 0.9 } })
  }, [])

  const fetchRoute = useCallback(async () => {
    if (!start || !end) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStatus('Routing...')

    const url = `https://router.project-osrm.org/route/v1/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true&annotations=true`
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route')
      const r = data.routes[0]
      setRoute(r)
      setSteps(r.legs[0]?.steps ?? [])
      setStepIndex(0)
      setProgress(0)
      renderRoute(r.geometry)
      setStatus('Route ready. Start navigation simulation.')

      const bounds = r.geometry.coordinates.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(r.geometry.coordinates[0], r.geometry.coordinates[0]))
      mapRef.current.fitBounds(bounds, { padding: 60 })
    } catch (e) {
      if (e.name !== 'AbortError') setStatus('Routing failed. Try different points.')
    }
  }, [start, end, profile, renderRoute])

  const startNavigation = useCallback(() => {
    if (!routeGeoRef.current?.length || !mapRef.current) return
    stopNavigation()
    setNavigating(true)
    setStatus('Simulation running...')

    const coords = routeGeoRef.current
    const map = mapRef.current
    let t = 0
    let prevTs = performance.now()
    carMarkerRef.current = new maplibregl.Marker({ color: '#0f172a' }).setLngLat(coords[0]).addTo(map)
    map.setPitch(55)
    map.setZoom(17)

    const tick = (ts) => {
      if (!carMarkerRef.current) return
      const dt = Math.min(40, ts - prevTs)
      prevTs = ts
      t += (dt / 16.67) * 0.8 * speed
      const i = Math.min(coords.length - 1, Math.floor(t))
      const p = coords[i]
      carMarkerRef.current.setLngLat(p)

      const next = coords[Math.min(i + 1, coords.length - 1)]
      map.easeTo({ center: p, bearing: bearing(p, next), duration: 110, easing: (x) => x, essential: true })

      const ratio = i / Math.max(1, coords.length - 1)
      setProgress(ratio)

      const totalSteps = Math.max(1, steps.length)
      const approxStep = Math.min(totalSteps - 1, Math.floor(ratio * totalSteps))
      setStepIndex(approxStep)

      if (i >= coords.length - 1) {
        setStatus('Arrived at destination')
        setProgress(1)
        stopNavigation()
        return
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }, [speed, steps.length, stopNavigation])

  const setCurrentLocationAsStart = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.')
      return
    }
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = [pos.coords.longitude, pos.coords.latitude]
        setStart(coord)
        setMarker(coord, 'start')
        mapRef.current?.flyTo({ center: coord, zoom: 15 })
        setStatus('Current location set as start.')
      },
      (err) => setLocationError(`Location permission denied: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [setMarker])

  const toggleTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.')
      return
    }

    if (trackingOn) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setTrackingOn(false)
      setStatus('Live tracking stopped.')
      return
    }

    setLocationError('')
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const coord = [pos.coords.longitude, pos.coords.latitude]
        if (!userMarkerRef.current) {
          userMarkerRef.current = new maplibregl.Marker({ color: '#10b981' }).setLngLat(coord).addTo(mapRef.current)
        } else {
          userMarkerRef.current.setLngLat(coord)
        }

        setTrackPoints((prev) => {
          const next = [...prev, coord].slice(-500)
          updateTrackSource(next)
          return next
        })

        if (followGps) mapRef.current?.easeTo({ center: coord, duration: 300 })
        if (!start) {
          setStart(coord)
          setMarker(coord, 'start')
        }
      },
      (err) => setLocationError(`Live tracking failed: ${err.message}`),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    )

    watchIdRef.current = id
    setTrackingOn(true)
    setStatus('Live GPS tracking started.')
  }, [trackingOn, followGps, start, setMarker, updateTrackSource])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = new maplibregl.Map({ container: mapContainerRef.current, style: STYLE_PRESETS.vector, center: [144.9631, -37.8136], zoom: 12 })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('click', (e) => {
      const coord = [e.lngLat.lng, e.lngLat.lat]
      if (!start) {
        setStart(coord)
        setMarker(coord, 'start')
        return
      }
      if (!end) {
        setEnd(coord)
        setMarker(coord, 'end')
        return
      }
      stopNavigation()
      setRoute(null)
      setSteps([])
      setEnd(null)
      endMarkerRef.current?.remove()
      setStart(coord)
      setMarker(coord, 'start')
      setStatus('Start reset. Click map to choose destination.')
    })

    return () => {
      stopNavigation()
      if (watchIdRef.current !== null) navigator.geolocation?.clearWatch(watchIdRef.current)
      map.remove()
      mapRef.current = null
    }
  }, [start, end, setMarker, stopNavigation])

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.setStyle(STYLE_PRESETS[mapStyle])
    mapRef.current.once('styledata', () => {
      if (routeGeoRef.current) renderRoute({ type: 'LineString', coordinates: routeGeoRef.current })
      if (trackPoints.length) updateTrackSource(trackPoints)
    })
  }, [mapStyle, renderRoute, trackPoints, updateTrackSource])

  useEffect(() => {
    if (start && end) fetchRoute()
  }, [start, end, profile, fetchRoute])

  const clearAll = () => {
    stopNavigation()
    setStart(null)
    setEnd(null)
    setRoute(null)
    setSteps([])
    setStepIndex(0)
    setProgress(0)
    setTrackPoints([])
    setStatus('Click map to set start and destination')
    startMarkerRef.current?.remove()
    endMarkerRef.current?.remove()
    userMarkerRef.current?.remove()

    if (mapRef.current?.getSource('route')) {
      mapRef.current.removeLayer('route-line')
      mapRef.current.removeSource('route')
    }
    if (mapRef.current?.getSource('gps-track')) {
      mapRef.current.removeLayer('gps-track-line')
      mapRef.current.removeSource('gps-track')
    }
  }

  return h('div', { className: 'layout' },
    h('aside', { className: 'panel' },
      h('h1', null, 'OpenNav React (Advanced)'),
      h('p', { className: 'muted' }, 'Vector map, advanced tracking, lane-aware turn status, and ETA panel.'),

      h('label', null, 'Start'),
      h('input', { readOnly: true, value: start ? `${start[1].toFixed(5)}, ${start[0].toFixed(5)}` : '', placeholder: 'Click map / Use current location' }),
      h('label', null, 'Destination'),
      h('input', { readOnly: true, value: end ? `${end[1].toFixed(5)}, ${end[0].toFixed(5)}` : '', placeholder: 'Click map' }),

      h('label', null, 'Routing profile'),
      h('select', { value: profile, onChange: (e) => setProfile(e.target.value) },
        h('option', { value: 'driving' }, 'Driving'),
        h('option', { value: 'cycling' }, 'Cycling'),
        h('option', { value: 'walking' }, 'Walking')
      ),

      h('label', null, 'Map view'),
      h('select', { value: mapStyle, onChange: (e) => setMapStyle(e.target.value) },
        h('option', { value: 'vector' }, 'Vector (MapLibre demo)'),
        h('option', { value: 'street' }, 'Street (OSM Raster)'),
        h('option', { value: 'dark' }, 'Dark mode')
      ),

      h('div', { className: 'buttons' },
        h('button', { onClick: startNavigation, disabled: !route || navigating }, 'Start Simulation'),
        h('button', { className: 'secondary', onClick: stopNavigation, disabled: !navigating }, 'Stop'),
        h('button', { className: 'secondary', onClick: clearAll }, 'Clear')
      ),

      h('div', { className: 'buttons' },
        h('button', { className: 'secondary', onClick: setCurrentLocationAsStart }, 'Use Current Location'),
        h('button', { className: 'secondary', onClick: toggleTracking }, trackingOn ? 'Stop Tracking' : 'Start Tracking'),
        h('button', { className: 'secondary', onClick: () => setFollowGps((v) => !v) }, followGps ? 'GPS Follow: ON' : 'GPS Follow: OFF')
      ),

      h('label', null, `Simulation speed: ${speed.toFixed(1)}x`),
      h('input', { type: 'range', min: '0.5', max: '6', step: '0.5', value: speed, onChange: (e) => setSpeed(Number(e.target.value)) }),

      h('p', { className: 'status' }, status),
      locationError ? h('p', { className: 'error' }, locationError) : null,
      h('p', { className: 'summary' }, summary),

      h('h3', null, 'Navigation Status'),
      h('div', { className: 'step-card' },
        h('strong', null, maneuverLabel(currentStep)),
        h('div', null, currentStep?.maneuver?.instruction || 'No step loaded'),
        currentStep ? h('small', null, `Distance ${metersToLabel(currentStep.distance)}`) : null,
        h('small', null, lanesLabel(currentStep)),
        nextStep && nextStep !== currentStep ? h('small', null, `Next: ${maneuverLabel(nextStep)} • ${nextStep.maneuver?.instruction || ''}`) : null
      )
    ),

    h('main', { ref: mapContainerRef, className: 'map-wrap' },
      h('div', { className: 'eta-panel' },
        h('div', { className: 'eta-title' }, 'Trip Estimate'),
        h('div', { className: 'eta-main' },
          h('div', null, `Arrival ${arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`),
          h('div', null, `${secondsToLabel(remainingDuration)} • ${metersToLabel(remainingDistance)}`)
        )
      ),
      h('div', { className: 'progress-track' }, h('div', { className: 'progress-fill', style: { width: `${Math.round(progress * 100)}%` } }))
    )
  )
}

createRoot(document.getElementById('root')).render(h(App))
