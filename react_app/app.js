import React, { useCallback, useEffect, useMemo, useRef, useState } from 'https://esm.sh/react@18.3.1'
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client'
import maplibregl from 'https://esm.sh/maplibre-gl@4.7.1'

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json'
const h = React.createElement

function metersToLabel(m) {
  if (!m && m !== 0) return '0 m'
  return m > 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

function secondsToLabel(s) {
  const min = Math.round(s / 60)
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

function App() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const routeGeoRef = useRef(null)
  const animRef = useRef(null)
  const abortRef = useRef(null)
  const startMarkerRef = useRef(null)
  const endMarkerRef = useRef(null)
  const carMarkerRef = useRef(null)

  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [profile, setProfile] = useState('driving')
  const [route, setRoute] = useState(null)
  const [steps, setSteps] = useState([])
  const [status, setStatus] = useState('Click map to set start and destination')
  const [navigating, setNavigating] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [stepIndex, setStepIndex] = useState(0)

  const summary = useMemo(() => {
    if (!route) return 'No route loaded'
    return `ETA ${secondsToLabel(route.duration)} • Distance ${metersToLabel(route.distance)}`
  }, [route])

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

    const url = `https://router.project-osrm.org/route/v1/${profile}/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      const data = await res.json()
      if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('No route')
      const r = data.routes[0]
      setRoute(r)
      setSteps(r.legs[0]?.steps ?? [])
      setStepIndex(0)
      renderRoute(r.geometry)
      setStatus('Route ready. Start navigation to simulate movement.')
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
    setStatus('Navigating...')

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
      map.easeTo({ center: p, bearing: bearing(p, next), duration: 100, easing: (x) => x, essential: true })
      const totalSteps = Math.max(1, steps.length)
      const approxStep = Math.min(totalSteps - 1, Math.floor((i / coords.length) * totalSteps))
      setStepIndex(approxStep)

      if (i >= coords.length - 1) {
        setStatus('Arrived at destination')
        stopNavigation()
        return
      }
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
  }, [speed, steps.length, stopNavigation])

  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return
    const map = new maplibregl.Map({ container: mapContainerRef.current, style: MAP_STYLE, center: [144.9631, -37.8136], zoom: 12 })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('click', (e) => {
      const coord = [e.lngLat.lng, e.lngLat.lat]
      if (!start) { setStart(coord); setMarker(coord, 'start'); return }
      if (!end) { setEnd(coord); setMarker(coord, 'end'); return }
      stopNavigation()
      setRoute(null)
      setSteps([])
      setEnd(null)
      endMarkerRef.current?.remove()
      setStart(coord)
      setMarker(coord, 'start')
      setStatus('Start reset. Click map to choose destination.')
    })

    return () => { stopNavigation(); map.remove(); mapRef.current = null }
  }, [start, end, setMarker, stopNavigation])

  useEffect(() => { if (start && end) fetchRoute() }, [start, end, profile, fetchRoute])

  const clearAll = () => {
    stopNavigation()
    setStart(null); setEnd(null); setRoute(null); setSteps([]); setStepIndex(0)
    setStatus('Click map to set start and destination')
    startMarkerRef.current?.remove(); endMarkerRef.current?.remove()
    if (mapRef.current?.getSource('route')) { mapRef.current.removeLayer('route-line'); mapRef.current.removeSource('route') }
  }

  return h('div', { className: 'layout' },
    h('aside', { className: 'panel' },
      h('h1', null, 'OpenNav React (High-Performance)'),
      h('p', { className: 'muted' }, 'Vector map + optimized animation loop + camera follow.'),
      h('label', null, 'Start'),
      h('input', { readOnly: true, value: start ? `${start[1].toFixed(5)}, ${start[0].toFixed(5)}` : '', placeholder: 'Click map' }),
      h('label', null, 'Destination'),
      h('input', { readOnly: true, value: end ? `${end[1].toFixed(5)}, ${end[0].toFixed(5)}` : '', placeholder: 'Click map' }),
      h('label', null, 'Routing profile'),
      h('select', { value: profile, onChange: (e) => setProfile(e.target.value) },
        h('option', { value: 'driving' }, 'Driving'), h('option', { value: 'cycling' }, 'Cycling'), h('option', { value: 'walking' }, 'Walking')),
      h('div', { className: 'buttons' },
        h('button', { onClick: startNavigation, disabled: !route || navigating }, 'Start Navigation'),
        h('button', { className: 'secondary', onClick: stopNavigation, disabled: !navigating }, 'Stop'),
        h('button', { className: 'secondary', onClick: clearAll }, 'Clear')),
      h('label', null, `Simulation speed: ${speed.toFixed(1)}x`),
      h('input', { type: 'range', min: '0.5', max: '5', step: '0.5', value: speed, onChange: (e) => setSpeed(Number(e.target.value)) }),
      h('p', { className: 'status' }, status),
      h('p', { className: 'summary' }, summary),
      h('h3', null, 'Next Maneuver'),
      h('div', { className: 'step-card' },
        steps[stepIndex]?.maneuver?.instruction || 'No step loaded',
        steps[stepIndex] ? h('small', null, metersToLabel(steps[stepIndex].distance)) : null
      )
    ),
    h('main', { ref: mapContainerRef, className: 'map' })
  )
}

createRoot(document.getElementById('root')).render(h(App))
