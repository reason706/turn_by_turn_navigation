/**
 * Valhalla Routing Service
 * Handles communication with Valhalla routing engine
 */

import axios, { AxiosInstance } from 'axios';
import { Route, RouteRequest, RouteResponse, Leg } from '../types/index';

class ValhallaService {
  private apiClient: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = 'https://valhalla1.openstreetmap.de') {
    this.baseUrl = baseUrl;
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
    });
  }

  /**
   * Get route between two points
   */
  async getRoute(
    start: [number, number],
    end: [number, number],
    waypoints?: [number, number][],
    costing: string = 'auto'
  ): Promise<Route> {
    try {
      // Use OSRM API format which is more reliable
      const coords = [start, ...(waypoints || []), end]
        .map(([lon, lat]) => `${lon},${lat}`)
        .join(';');

      const osrmClient = axios.create({
        baseURL: 'https://router.project-osrm.org',
        timeout: 10000,
      });

      const response = await osrmClient.get<any>(
        `/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=true`
      );

      if (response.data.routes && response.data.routes.length > 0) {
        const routeData = response.data.routes[0];
        
        // Transform OSRM legs with steps to our format
        const legs = (routeData.legs || []).map((leg: any) => ({
          distance: leg.distance || 0,
          duration: leg.duration || 0,
          steps: (leg.steps || []).map((step: any) => ({
            distance: step.distance || 0,
            duration: step.duration || 0,
            instruction: step.maneuver?.type ? this.generateInstruction(step.maneuver) : 'Continue',
            maneuver: step.maneuver || { type: 'straight' },
            name: step.name || '',
            geometry: step.geometry || '',
          })),
          summary: leg.summary || '',
        }));
        
        return {
          geometry: routeData.geometry,
          legs,
          distance: routeData.distance || 0,
          duration: routeData.duration || 0,
        };
      }

      throw new Error('No route found');
    } catch (error) {
      console.error('Routing error:', error);
      throw new Error(`Could not calculate route: ${(error as any).message}`);
    }
  }

  /**
   * Generate human-readable instruction from maneuver
   */
  private generateInstruction(maneuver: any): string {
    const type = maneuver.type || 'straight';
    const modifier = maneuver.modifier || '';
    
    const instructions: { [key: string]: string } = {
      'turn': `Turn ${modifier}`,
      'new name': `Continue on road name change`,
      'depart': `Head ${modifier || 'forward'}`,
      'arrive': `Arrive at destination`,
      'merge': `Merge ${modifier}`,
      'ramp': `Take the {{modifier}} ramp`,
      'on ramp': `Take the {{modifier}} ramp`,
      'off ramp': `Take the {{modifier}} off ramp`,
      'fork': `Take the {{modifier}} fork`,
      'end of road': `Take the {{modifier}} turn`,
      'continue': `Continue {{modifier}}`,
      'roundabout': `Take roundabout`,
      'exit roundabout': `Exit roundabout {{modifier}}`,
      'rotary': `Take rotary`,
      'exit rotary': `Exit rotary {{modifier}}`,
      'roundabout turn': `Take roundabout turn {{modifier}}`,
      'notification': `Notification {{modifier}}`,
      'exit': `Exit {{modifier}}`,
    };
    
    const instruction = instructions[type] || 'Continue';
    return instruction.replace('{{modifier}}', modifier || '');
  }

  /**
   * Get isochrone (reachable area) from a point
   */
  async getIsochrone(
    center: [number, number],
    contours: number[] = [5, 10, 15],
    costing: string = 'auto'
  ): Promise<any> {
    try {
      const response = await this.apiClient.get('/isochrone', {
        params: {
          json: JSON.stringify({
            locations: [{ lat: center[1], lon: center[0] }],
            costing,
            contours: contours.map((minutes) => ({
              time: minutes,
            })),
          }),
        },
      });
      return response.data;
    } catch (error) {
      console.error('Isochrone error:', error);
      throw error;
    }
  }

  /**
   * Get turn-by-turn instructions
   */
  extractTurns(route: Route): any[] {
    const turns: any[] = [];
    let cumulativeDistance = 0;
    let cumulativeDuration = 0;

    // Handle both Valhalla and OSRM response formats
    if (!route.legs || route.legs.length === 0) {
      // Fallback for simple route without detailed legs
      return [{
        instruction: 'Start navigation',
        distance: route.distance,
        cumulativeDistance: route.distance,
        duration: route.duration,
        cumulativeDuration: route.duration,
      }];
    }

    route.legs.forEach((leg, legIndex) => {
      leg.steps?.forEach((step, stepIndex) => {
        turns.push({
          legIndex,
          stepIndex,
          instruction: step.instruction || step.name || 'Continue',
          distance: step.distance || 0,
          cumulativeDistance: (cumulativeDistance += step.distance || 0),
          duration: step.duration || 0,
          cumulativeDuration: (cumulativeDuration += step.duration || 0),
          maneuver: step.maneuver,
          name: step.name,
          mode: step.mode,
        });
      });
    });

    // If no turns were extracted but we have route data, create a simple turn
    if (turns.length === 0) {
      turns.push({
        instruction: 'Follow the route',
        distance: route.distance,
        cumulativeDistance: route.distance,
        duration: route.duration,
        cumulativeDuration: route.duration,
      });
    }

    return turns;
  }

  /**
   * Check if a point is close to the route
   */
  isOnRoute(point: [number, number], routeGeometry: string, tolerance: number = 50): boolean {
    // Simple implementation - decode geometry and check distance
    const route = this.decodePolyline(routeGeometry);
    const minDistance = Math.min(
      ...route.map((coord) => this.haversineDistance(point, coord))
    );
    return minDistance <= tolerance;
  }

  /**
   * Decode polyline geometry
   */
  decodePolyline(encoded: string): [number, number][] {
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
   * Calculate distance between two points
   */
  private haversineDistance(
    point1: [number, number],
    point2: [number, number]
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(point2[1] - point1[1]);
    const dLon = this.toRad(point2[0] - point1[0]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1[1])) *
      Math.cos(this.toRad(point2[1])) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}

export default new ValhallaService();
