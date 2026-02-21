/**
 * Location Service
 * Handles geolocation and location tracking
 */

import { LocationUpdate, Coordinates } from '../types/index';

type LocationCallback = (update: LocationUpdate) => void;
type ErrorCallback = (error: Error) => void;

class LocationService {
  private watchId: number | null = null;
  private callbacks: Set<LocationCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private isSupported: boolean;

  constructor() {
    this.isSupported = 'geolocation' in navigator;
  }

  /**
   * Check if geolocation is supported
   */
  checkSupport(): boolean {
    return this.isSupported;
  }

  /**
   * Get current location once
   */
  async getCurrentPosition(): Promise<LocationUpdate> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve({
            coordinates: { latitude, longitude },
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || 0,
            speed: position.coords.speed || 0,
            timestamp: position.timestamp,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  /**
   * Start continuous location tracking
   */
  startTracking(
    onUpdate: LocationCallback,
    onError?: ErrorCallback,
    options?: PositionOptions
  ): void {
    if (!this.isSupported) {
      const error = new Error('Geolocation not supported');
      onError?.(error);
      return;
    }

    this.callbacks.add(onUpdate);
    if (onError) {
      this.errorCallbacks.add(onError);
    }

    if (this.watchId === null) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const update: LocationUpdate = {
            coordinates: { latitude, longitude },
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || 0,
            speed: position.coords.speed || 0,
            timestamp: position.timestamp,
          };

          this.callbacks.forEach((callback) => callback(update));
        },
        (error) => {
          const err = new Error(`Location error: ${error.message}`);
          this.errorCallbacks.forEach((callback) => callback(err));
        },
        options || {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 1000,
        }
      );
    }
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.callbacks.clear();
    this.errorCallbacks.clear();
  }

  /**
   * Remove a specific callback
   */
  removeCallback(callback: LocationCallback): void {
    this.callbacks.delete(callback);
  }

  /**
   * Calculate bearing between two points
   */
  static calculateBearing(from: Coordinates, to: Coordinates): number {
    const dLon = to.longitude - from.longitude;
    const y = Math.sin((dLon * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180);
    const x =
      Math.cos((from.latitude * Math.PI) / 180) * Math.sin((to.latitude * Math.PI) / 180) -
      Math.sin((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.cos((dLon * Math.PI) / 180);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  /**
   * Calculate distance between two coordinates
   */
  static calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.latitude * Math.PI) / 180) *
      Math.cos((to.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export default new LocationService();
