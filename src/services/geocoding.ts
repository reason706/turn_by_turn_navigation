/**
 * Geocoding Service
 * Handles place search using Nominatim/Photon
 */

import axios, { AxiosInstance } from 'axios';
import { SearchResult, GeocodeResponse, GeoFeature } from '../types/index';

class GeocodingService {
  private photonClient: AxiosInstance;
  private nominatimClient: AxiosInstance;

  constructor(
    photonUrl: string = 'https://photon.komoot.io',
    nominatimUrl: string = 'https://nominatim.openstreetmap.org'
  ) {
    this.photonClient = axios.create({
      baseURL: photonUrl,
      timeout: 5000,
    });

    this.nominatimClient = axios.create({
      baseURL: nominatimUrl,
      timeout: 5000,
    });
  }

  /**
   * Search for places by query string
   */
  async searchPlaces(
    query: string,
    bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number },
    limit: number = 10
  ): Promise<SearchResult[]> {
    try {
      const params: any = {
        q: query,
        limit,
        osm_tag: '!tourism',
      };

      if (bbox) {
        params.bbox = `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`;
      }

      const response = await this.photonClient.get<GeocodeResponse>('/api', {
        params,
      });

      return response.data.features.map((feature: GeoFeature) => ({
        id: feature.id,
        name: feature.properties.name,
        address: feature.properties.address || feature.properties.name,
        coordinates: feature.geometry.coordinates as [number, number],
        type: feature.type,
      }));
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode a coordinate to get address
   */
  async reverseGeocode(lng: number, lat: number): Promise<string | null> {
    try {
      const response = await this.nominatimClient.get('/reverse', {
        params: {
          format: 'json',
          lat,
          lon: lng,
          zoom: 18,
          addressdetails: 1,
        },
      });

      return response.data.address?.road || response.data.name || null;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Search for coordinates of a location
   */
  async searchCoordinates(query: string): Promise<[[number, number], string] | null> {
    try {
      const results = await this.searchPlaces(query, undefined, 1);
      if (results.length > 0) {
        return [results[0].coordinates, results[0].name];
      }
      return null;
    } catch (error) {
      console.error('Search error:', error);
      return null;
    }
  }

  /**
   * Autocomplete search
   */
  async autocomplete(query: string, limit: number = 5): Promise<SearchResult[]> {
    return this.searchPlaces(query, undefined, limit);
  }
}

export default new GeocodingService();
