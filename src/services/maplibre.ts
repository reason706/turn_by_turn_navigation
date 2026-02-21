/**
 * MapLibre Service
 * Handles map rendering and interactions
 */

import maplibregl, { Map, LngLatLike, StyleSpecification } from 'maplibre-gl';
import { Route } from '../types/index';

interface MapConfig {
  container: HTMLElement | string;
  style: string;
  center: [number, number];
  zoom: number;
  pitch?: number;
  bearing?: number;
}

class MapLibreService {
  private map: Map | null = null;
  private routeSource = 'route';
  private routeLayer = 'route-line';
  private waypointSource = 'waypoints';
  private userLocationSource = 'user-location';
  private directionArrowsLayer = 'direction-arrows';

  /**
   * Initialize the map
   */
  initMap(config: MapConfig): Map {
    try {
      this.map = new maplibregl.Map({
        container: config.container,
        style: config.style,
        center: config.center as LngLatLike,
        zoom: config.zoom,
        pitch: config.pitch || 0,
        bearing: config.bearing || 0,
        attributionControl: false,
      });

      // Add error handlers
      this.map.on('error', (e) => {
        console.error('Map error:', e);
      });

      this.map.on('style.error', (e) => {
        console.error('Map style error:', e);
      });

      // Wait for style to load before setting up layers
      if (this.map.isStyleLoaded()) {
        this.setupDefaultLayers();
      } else {
        this.map.once('load', () => {
          this.setupDefaultLayers();
        });
      }

      return this.map;
    } catch (error) {
      console.error('Failed to initialize map:', error);
      throw error;
    }
  }

  /**
   * Get the map instance
   */
  getMap(): Map {
    if (!this.map) {
      throw new Error('Map not initialized');
    }
    return this.map;
  }

  /**
   * Destroy the map
   */
  destroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Setup default layers
   */
  private setupDefaultLayers(): void {
    if (!this.map) return;

    const map = this.map;

    try {
      // Add route source and layer
      if (!map.getSource(this.routeSource)) {
        map.addSource(this.routeSource, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        map.addLayer({
          id: this.routeLayer,
          type: 'line',
          source: this.routeSource,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#0084ff',
            'line-width': 4,
            'line-opacity': 0.8,
          },
        });

        // Add direction arrow layer
        map.addLayer({
          id: this.directionArrowsLayer,
          type: 'symbol',
          source: this.routeSource,
          layout: {
            'symbol-placement': 'line',
            'icon-image': 'arrow',
            'icon-size': 1,
            'icon-rotation-alignment': 'map',
            'symbol-spacing': 50,
          },
        });
      }

      // Add waypoints source and layer
      if (!map.getSource(this.waypointSource)) {
        map.addSource(this.waypointSource, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        map.addLayer({
          id: 'waypoint-circle',
          type: 'circle',
          source: this.waypointSource,
          paint: {
            'circle-radius': 8,
            'circle-color': '#ff0000',
            'circle-opacity': 0.8,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });

        map.addLayer({
          id: 'waypoint-label',
          type: 'symbol',
          source: this.waypointSource,
          layout: {
            'text-field': ['get', 'label'],
            'text-offset': [0, -1.5],
            'text-size': 12,
            'text-font': ['Open Sans Bold'],
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          },
        });
      }

      // Add user location source and layer
      if (!map.getSource(this.userLocationSource)) {
        map.addSource(this.userLocationSource, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        map.addLayer({
          id: 'user-location-circle',
          type: 'circle',
          source: this.userLocationSource,
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              12,
              8,
              22,
              20,
            ],
            'circle-color': '#007AFF',
            'circle-opacity': 0.9,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
          },
        });
      }
    } catch (error) {
      console.error('Error setting up map layers:', error);
      // Don't throw - map can still function partially without all layers
    }
  }

  /**
   * Add route to map
   */
  addRoute(route: Route, highlight: boolean = true): void {
    if (!this.map) return;

    const geometry = this.decodePolyline(route.geometry);
    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: geometry,
      },
      properties: {
        distance: route.distance,
        duration: route.duration,
      },
    };

    const source = this.map.getSource(this.routeSource);
    if (source && source.type === 'geojson') {
      (source as any).setData({
        type: 'FeatureCollection',
        features: [feature],
      });
    }

    if (highlight) {
      this.fitRouteBounds(geometry);
    }
  }

  /**
   * Clear route from map
   */
  clearRoute(): void {
    if (!this.map) return;

    const source = this.map.getSource(this.routeSource);
    if (source && source.type === 'geojson') {
      (source as any).setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }

  /**
   * Update user location
   */
  updateUserLocation(lng: number, lat: number, accuracy?: number): void {
    if (!this.map) return;

    const feature = {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [lng, lat],
      },
      properties: {
        accuracy: accuracy || 0,
      },
    };

    const source = this.map.getSource(this.userLocationSource);
    if (source && source.type === 'geojson') {
      (source as any).setData({
        type: 'FeatureCollection',
        features: [feature],
      });
    }

    this.map.flyTo({
      center: [lng, lat],
      zoom: Math.max(this.map.getZoom(), 16),
      duration: 1000,
    });
  }

  /**
   * Add waypoints marker
   */
  addWaypoints(waypoints: Array<{ lng: number; lat: number; label: string }>): void {
    if (!this.map) return;

    const features = waypoints.map((wp, idx) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.lng, wp.lat],
      },
      properties: {
        label: wp.label,
        index: idx,
      },
    }));

    const source = this.map.getSource(this.waypointSource);
    if (source && source.type === 'geojson') {
      (source as any).setData({
        type: 'FeatureCollection',
        features,
      });
    }
  }

  /**
   * Clear waypoints
   */
  clearWaypoints(): void {
    if (!this.map) return;

    const source = this.map.getSource(this.waypointSource);
    if (source && source.type === 'geojson') {
      (source as any).setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }

  /**
   * Fit map bounds to geometry
   */
  fitRouteBounds(geometry: [number, number][]): void {
    if (!this.map || geometry.length === 0) return;

    const bounds = geometry.reduce(
      (bounds, coord) => {
        return bounds.extend(coord as LngLatLike);
      },
      new maplibregl.LngLatBounds(geometry[0], geometry[0])
    );

    this.map.fitBounds(bounds, { padding: 50 });
  }

  /**
   * Set map style
   */
  setStyle(style: string): void {
    if (!this.map) return;
    try {
      this.map.setStyle(style);
      this.map.once('styledata', () => {
        this.setupDefaultLayers();
      });
    } catch (error) {
      console.error('Error setting map style:', error);
      // Fallback to light style if error occurs
      try {
        this.map!.setStyle('https://basemaps.cartocdn.com/gl/positron-gl-style/style.json');
      } catch (fallbackError) {
        console.error('Failed to set fallback style:', fallbackError);
      }
    }
  }

  /**
   * Decode polyline geometry
   */
  private decodePolyline(encoded: string): [number, number][] {
    const poly: [number, number][] = [];
    let index = 0,
      lat = 0,
      lng = 0;
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let b;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;
      result = 0;
      shift = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;
      poly.push([lng / 1e5, lat / 1e5]);
    }
    return poly;
  }

  /**
   * Toggle map layers visibility
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    if (!this.map) return;
    this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
  }

  /**
   * Add click handler to layer
   */
  onLayerClick(layerId: string, callback: (e: any) => void): void {
    if (!this.map) return;
    this.map.on('click', layerId, callback);
  }

  /**
   * Remove click handler
   */
  offLayerClick(layerId: string, callback: (e: any) => void): void {
    if (!this.map) return;
    this.map.off('click', layerId, callback);
  }
}

export default new MapLibreService();
