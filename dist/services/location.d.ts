/**
 * Location Service
 * Handles geolocation and location tracking
 */
import { LocationUpdate, Coordinates } from '../types/index';
type LocationCallback = (update: LocationUpdate) => void;
type ErrorCallback = (error: Error) => void;
declare class LocationService {
    private watchId;
    private callbacks;
    private errorCallbacks;
    private isSupported;
    constructor();
    /**
     * Check if geolocation is supported
     */
    checkSupport(): boolean;
    /**
     * Get current location once
     */
    getCurrentPosition(): Promise<LocationUpdate>;
    /**
     * Start continuous location tracking
     */
    startTracking(onUpdate: LocationCallback, onError?: ErrorCallback, options?: PositionOptions): void;
    /**
     * Stop location tracking
     */
    stopTracking(): void;
    /**
     * Remove a specific callback
     */
    removeCallback(callback: LocationCallback): void;
    /**
     * Calculate bearing between two points
     */
    static calculateBearing(from: Coordinates, to: Coordinates): number;
    /**
     * Calculate distance between two coordinates
     */
    static calculateDistance(from: Coordinates, to: Coordinates): number;
}
declare const _default: LocationService;
export default _default;
//# sourceMappingURL=location.d.ts.map