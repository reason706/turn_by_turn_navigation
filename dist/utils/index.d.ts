/**
 * Utility Functions
 */
/**
 * Format distance for display
 */
export declare function formatDistance(meters: number): string;
/**
 * Format duration for display
 */
export declare function formatDuration(seconds: number): string;
/**
 * Calculate bearing between two points
 */
export declare function calculateBearing(from: [number, number], to: [number, number]): number;
/**
 * Calculate distance between two points
 */
export declare function calculateDistance(from: [number, number], to: [number, number]): number;
/**
 * Decode polyline (Google algorithm)
 */
export declare function decodePolyline(encoded: string): [number, number][];
/**
 * Encode polyline (Google algorithm)
 */
export declare function encodePolyline(points: [number, number][]): string;
/**
 * Throttle function
 */
export declare function throttle<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Debounce function
 */
export declare function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void;
/**
 * Get current time in readable format
 */
export declare function getCurrentTime(): string;
/**
 * Calculate ETA from current time and duration
 */
export declare function calculateETA(durationSeconds: number): string;
/**
 * Parse turn modifier to human-readable direction
 */
export declare function parseTurnModifier(modifier?: string): string;
/**
 * Check if coordinates are valid
 */
export declare function isValidCoordinates(coords: [number, number]): boolean;
/**
 * Get browser geolocation with promise
 */
export declare function getGeolocation(options?: PositionOptions): Promise<GeolocationCoordinates>;
/**
 * Check if device supports orientation
 */
export declare function supportsOrientation(): boolean;
/**
 * Format coordinates for display
 */
export declare function formatCoordinates(lng: number, lat: number, decimals?: number): string;
/**
 * Sleep for specified milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Parse URL query parameters
 */
export declare function getQueryParams(): {
    [key: string]: string;
};
//# sourceMappingURL=index.d.ts.map