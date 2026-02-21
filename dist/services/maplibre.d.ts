/**
 * MapLibre Service
 * Handles map rendering and interactions
 */
import { Map } from 'maplibre-gl';
import { Route } from '../types/index';
interface MapConfig {
    container: HTMLElement | string;
    style: string;
    center: [number, number];
    zoom: number;
    pitch?: number;
    bearing?: number;
}
declare class MapLibreService {
    private map;
    private routeSource;
    private routeLayer;
    private waypointSource;
    private userLocationSource;
    private directionArrowsLayer;
    /**
     * Initialize the map
     */
    initMap(config: MapConfig): Map;
    /**
     * Get the map instance
     */
    getMap(): Map;
    /**
     * Destroy the map
     */
    destroy(): void;
    /**
     * Setup default layers
     */
    private setupDefaultLayers;
    /**
     * Add route to map
     */
    addRoute(route: Route, highlight?: boolean): void;
    /**
     * Clear route from map
     */
    clearRoute(): void;
    /**
     * Update user location
     */
    updateUserLocation(lng: number, lat: number, accuracy?: number): void;
    /**
     * Add waypoints marker
     */
    addWaypoints(waypoints: Array<{
        lng: number;
        lat: number;
        label: string;
    }>): void;
    /**
     * Clear waypoints
     */
    clearWaypoints(): void;
    /**
     * Fit map bounds to geometry
     */
    fitRouteBounds(geometry: [number, number][]): void;
    /**
     * Set map style
     */
    setStyle(style: string): void;
    /**
     * Decode polyline geometry
     */
    private decodePolyline;
    /**
     * Toggle map layers visibility
     */
    setLayerVisibility(layerId: string, visible: boolean): void;
    /**
     * Add click handler to layer
     */
    onLayerClick(layerId: string, callback: (e: any) => void): void;
    /**
     * Remove click handler
     */
    offLayerClick(layerId: string, callback: (e: any) => void): void;
}
declare const _default: MapLibreService;
export default _default;
//# sourceMappingURL=maplibre.d.ts.map