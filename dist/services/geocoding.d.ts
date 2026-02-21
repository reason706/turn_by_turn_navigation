/**
 * Geocoding Service
 * Handles place search using Nominatim/Photon
 */
import { SearchResult } from '../types/index';
declare class GeocodingService {
    private photonClient;
    private nominatimClient;
    constructor(photonUrl?: string, nominatimUrl?: string);
    /**
     * Search for places by query string
     */
    searchPlaces(query: string, bbox?: {
        minLng: number;
        minLat: number;
        maxLng: number;
        maxLat: number;
    }, limit?: number): Promise<SearchResult[]>;
    /**
     * Reverse geocode a coordinate to get address
     */
    reverseGeocode(lng: number, lat: number): Promise<string | null>;
    /**
     * Search for coordinates of a location
     */
    searchCoordinates(query: string): Promise<[[number, number], string] | null>;
    /**
     * Autocomplete search
     */
    autocomplete(query: string, limit?: number): Promise<SearchResult[]>;
}
declare const _default: GeocodingService;
export default _default;
//# sourceMappingURL=geocoding.d.ts.map