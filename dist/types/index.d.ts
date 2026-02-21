/**
 * Core type definitions for the navigation system
 */
export interface LngLatLike {
    lng: number;
    lat: number;
}
export interface Coordinates {
    longitude: number;
    latitude: number;
}
export interface Location {
    coordinates: [number, number];
    name?: string;
    address?: string;
}
export interface ManeuverType {
    type: 'turn';
    modifier?: 'uturn' | 'sharp right' | 'right' | 'slight right' | 'straight' | 'slight left' | 'left' | 'sharp left';
}
export interface Maneuver {
    type: ManeuverType['type'];
    modifier?: ManeuverType['modifier'];
    bearing_before: number;
    bearing_after: number;
    location: [number, number];
}
export interface Step {
    distance: number;
    duration: number;
    instruction: string;
    maneuver: Maneuver;
    name?: string;
    mode?: string;
    driving_side?: 'left' | 'right';
    geometry?: string;
    intersections?: any[];
}
export interface Leg {
    distance: number;
    duration: number;
    steps: Step[];
    summary?: string;
}
export interface RouteResponse {
    routes: Route[];
    waypoints?: Waypoint[];
}
export interface Route {
    geometry: string;
    legs: Leg[];
    distance: number;
    duration: number;
    weight_name?: string;
    weight?: number;
}
export interface Waypoint {
    hint: string;
    distance: number;
    name: string;
    location: [number, number];
}
export interface RouteRequest {
    start: [number, number];
    end: [number, number];
    waypoints?: [number, number][];
    options?: {
        costing?: string;
        cost_type?: 'time' | 'distance';
        filters?: any;
    };
}
export interface NavigationState {
    isNavigating: boolean;
    currentRouteIndex: number;
    currentStepIndex: number;
    currentLocation: Location | null;
    route: Route | null;
    routes: Route[];
    remainingDistance: number;
    remainingTime: number;
    arrival_time: string;
    deviation: boolean;
    speed: number;
    heading: number;
}
export interface SearchResult {
    id: string;
    name: string;
    address?: string;
    coordinates: [number, number];
    type?: string;
}
export interface GeocodeResponse {
    features: GeoFeature[];
}
export interface GeoFeature {
    id: string;
    type: string;
    geometry: {
        type: string;
        coordinates: [number, number];
    };
    properties: {
        name: string;
        address?: string;
        osm_id?: number;
        importance?: number;
    };
}
export interface NavigationUIConfig {
    mapCenter?: [number, number];
    mapZoom?: number;
    mapPitch?: number;
    mapBearing?: number;
    mapStyle?: string;
    roundingIncrement?: number;
    speedSimulation?: number;
    autoStartLocation?: boolean;
}
export interface LocationUpdate {
    coordinates: Coordinates;
    accuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: number;
}
export interface TurnInstruction {
    type: string;
    degrees?: number;
    modifier?: string;
    distance: number;
    duration: number;
    instruction: string;
    next_instruction?: string;
    streetName?: string;
}
//# sourceMappingURL=index.d.ts.map