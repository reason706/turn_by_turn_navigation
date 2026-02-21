/**
 * Valhalla Routing Service
 * Handles communication with Valhalla routing engine
 */
import { Route } from '../types/index';
declare class ValhallaService {
    private apiClient;
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * Get route between two points
     */
    getRoute(start: [number, number], end: [number, number], waypoints?: [number, number][], costing?: string): Promise<Route>;
    /**
     * Generate human-readable instruction from maneuver
     */
    private generateInstruction;
    /**
     * Get isochrone (reachable area) from a point
     */
    getIsochrone(center: [number, number], contours?: number[], costing?: string): Promise<any>;
    /**
     * Get turn-by-turn instructions
     */
    extractTurns(route: Route): any[];
    /**
     * Check if a point is close to the route
     */
    isOnRoute(point: [number, number], routeGeometry: string, tolerance?: number): boolean;
    /**
     * Decode polyline geometry
     */
    decodePolyline(encoded: string): [number, number][];
    /**
     * Calculate distance between two points
     */
    private haversineDistance;
    private toRad;
}
declare const _default: ValhallaService;
export default _default;
//# sourceMappingURL=valhalla.d.ts.map