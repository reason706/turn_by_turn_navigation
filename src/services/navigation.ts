/**
 * Navigation Manager
 * Main orchestrator for the navigation system
 */

import {
  NavigationState,
  Location,
  Route,
  LocationUpdate,
  Step,
  TurnInstruction,
} from '../types/index';
import valhallaService from './valhalla';
import geocodingService from './geocoding';
import locationService from './location';
import maplibreService from './maplibre';

type StateChangeCallback = (state: NavigationState) => void;
type TurnCallback = (turn: TurnInstruction) => void;

class NavigationManager {
  private state: NavigationState;
  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private turnCallbacks: Set<TurnCallback> = new Set();
  private currentHeading: number = 0;
  private speedMultiplier: number = 1;
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.state = {
      isNavigating: false,
      currentRouteIndex: 0,
      currentStepIndex: 0,
      currentLocation: null,
      route: null,
      routes: [],
      remainingDistance: 0,
      remainingTime: 0,
      arrival_time: '',
      deviation: false,
      speed: 0,
      heading: 0,
    };
  }

  /**
   * Initialize navigation system
   */
  async initialize(): Promise<void> {
    if (!locationService.checkSupport()) {
      throw new Error('Geolocation not supported');
    }

    // Get initial location
    try {
      const location = await locationService.getCurrentPosition();
      this.state.currentLocation = {
        coordinates: [location.coordinates.longitude, location.coordinates.latitude],
      };
      if (location.heading != null) {
        this.currentHeading = location.heading;
      }
    } catch (error) {
      console.warn('Could not get initial location:', error);
    }
  }

  /**
   * Start listening to location updates
   */
  startLocationTracking(continuous: boolean = true): void {
    const onUpdate = (update: LocationUpdate) => {
      this.handleLocationUpdate(update);
    };

    const onError = (error: Error) => {
      console.error('Location tracking error:', error);
    };

    if (continuous) {
      locationService.startTracking(onUpdate, onError);
    }
  }

  /**
   * Stop location tracking
   */
  stopLocationTracking(): void {
    locationService.stopTracking();
  }

  /**
   * Handle location update from device
   */
  private handleLocationUpdate(update: LocationUpdate): void {
    const newLocation = {
      coordinates: [update.coordinates.longitude, update.coordinates.latitude] as [number, number],
    };

    this.state.currentLocation = newLocation;
    if (update.heading !== null && update.heading !== undefined) {
      this.currentHeading = update.heading;
      this.state.heading = update.heading;
    }
    if (update.speed !== null && update.speed !== undefined) {
      this.state.speed = update.speed;
    }

    // Check for route deviation
    if (this.state.route) {
      this.checkRouteDeviation(newLocation.coordinates);
    }

    maplibreService.updateUserLocation(
      newLocation.coordinates[0],
      newLocation.coordinates[1],
      update.accuracy
    );

    this.notifyStateChange();
  }

  /**
   * Search for a location
   */
  async searchLocation(query: string): Promise<Location | null> {
    const result = await geocodingService.searchCoordinates(query);
    if (result) {
      const [coords, name] = result;
      return {
        coordinates: coords,
        name,
      };
    }
    return null;
  }

  /**
   * Request route between two locations
   */
  async requestRoute(
    start: [number, number],
    end: [number, number],
    costing: string = 'auto'
  ): Promise<Route | null> {
    try {
      const route = await valhallaService.getRoute(start, end, undefined, costing);
      this.state.route = route;
      this.state.currentRouteIndex = 0;
      this.state.currentStepIndex = 0;
      this.state.remainingDistance = route.distance;
      this.state.remainingTime = route.duration;

      // Calculate arrival time
      this.state.arrival_time = this.calculateArrivalTime(route.duration);

      // Add route to map
      maplibreService.addRoute(route, true);

      // Add waypoints
      maplibreService.addWaypoints([
        { lng: start[0], lat: start[1], label: 'Start' },
        { lng: end[0], lat: end[1], label: 'End' },
      ]);

      this.notifyStateChange();
      return route;
    } catch (error) {
      console.error('Route request error:', error);
      return null;
    }
  }

  /**
   * Start navigation
   */
  startNavigation(): void {
    if (!this.state.route) {
      throw new Error('No route available');
    }

    this.state.isNavigating = true;
    this.state.currentStepIndex = 0;
    this.notifyStateChange();
  }

  /**
   * Stop navigation
   */
  stopNavigation(): void {
    this.state.isNavigating = false;
    // Don't clear the route - keep it visible
    // maplibreService.clearRoute();
    // maplibreService.clearWaypoints();
    this.notifyStateChange();
  }

  /**
   * Simulate vehicle movement
   */
  simulateNavigation(speedMultiplier: number = 1): void {
    this.speedMultiplier = speedMultiplier;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    if (!this.state.route || !this.state.currentLocation) {
      return;
    }

    this.simulationInterval = setInterval(() => {
      this.advanceNavigation();
    }, 1000 / speedMultiplier); // Update every second adjusted by speed
  }

  /**
   * Stop simulation
   */
  stopSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  /**
   * Advance navigation along route
   */
  private advanceNavigation(): void {
    if (!this.state.route || !this.state.currentLocation) {
      return;
    }

    // Get all steps
    const allSteps = this.getAllSteps();
    if (this.state.currentStepIndex >= allSteps.length) {
      this.stopNavigation();
      return;
    }

    const currentStep = allSteps[this.state.currentStepIndex];
    const routeGeometry = valhallaService.decodePolyline(this.state.route.geometry);

    // Advance along current step (simplified - move towards end)
    const speed = (this.speedMultiplier * 13) / 3.6; // 13 m/s default (≈47 km/h)
    const distance = (currentStep.distance * speed) / currentStep.duration;

    // Move towards next step
    const currentCoord = this.state.currentLocation.coordinates;
    const stepEndCoord = this.getStepEndCoordinate(this.state.currentStepIndex);

    if (stepEndCoord) {
      const bearing = this.calculateBearing(currentCoord, stepEndCoord);
      const movedCoord = this.moveTowardCoordinate(currentCoord, stepEndCoord, distance);

      this.state.currentLocation.coordinates = movedCoord;
      this.state.heading = bearing;
      this.state.remainingDistance -= distance;
      this.state.remainingTime -= 1;

      maplibreService.updateUserLocation(movedCoord[0], movedCoord[1]);

      // Check if reached step end
      const distanceToStepEnd = this.distanceBetween(movedCoord, stepEndCoord);
      if (distanceToStepEnd < 50) {
        this.state.currentStepIndex++;
        const nextStep = allSteps[this.state.currentStepIndex];
        if (nextStep) {
          this.emitTurn(this.stepToTurnInstruction(nextStep));
        }
      }
    }

    this.notifyStateChange();
  }

  /**
   * Get all steps from route
   */
  private getAllSteps(): Step[] {
    if (!this.state.route) return [];
    const allSteps: Step[] = [];
    this.state.route.legs.forEach((leg) => {
      allSteps.push(...(leg.steps || []));
    });
    return allSteps;
  }

  /**
   * Get end coordinate of a step
   */
  private getStepEndCoordinate(stepIndex: number): [number, number] | null {
    const allSteps = this.getAllSteps();
    if (stepIndex < allSteps.length) {
      const step = allSteps[stepIndex];
      if (step.maneuver) {
        return step.maneuver.location;
      }
    }
    return null;
  }

  /**
   * Move towards a coordinate
   */
  private moveTowardCoordinate(
    from: [number, number],
    to: [number, number],
    distance: number
  ): [number, number] {
    const bearing = this.calculateBearing(from, to);
    const distanceKm = distance / 1000;
    const lat1 = (from[1] * Math.PI) / 180;
    const lon1 = (from[0] * Math.PI) / 180;
    const bearingRad = (bearing * Math.PI) / 180;
    const R = 6371; // Earth's radius in km

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceKm / R) +
      Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
    );

    const lon2 =
      lon1 +
      Math.atan2(
        Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(lat1),
        Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
      );

    return [(lon2 * 180) / Math.PI, (lat2 * 180) / Math.PI];
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(from: [number, number], to: [number, number]): number {
    const dLon = to[0] - from[0];
    const y = Math.sin((dLon * Math.PI) / 180) * Math.cos((to[1] * Math.PI) / 180);
    const x =
      Math.cos((from[1] * Math.PI) / 180) * Math.sin((to[1] * Math.PI) / 180) -
      Math.sin((from[1] * Math.PI) / 180) *
      Math.cos((to[1] * Math.PI) / 180) *
      Math.cos((dLon * Math.PI) / 180);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  /**
   * Calculate distance between two coordinates
   */
  private distanceBetween(from: [number, number], to: [number, number]): number {
    const R = 6371000; // meters
    const dLat = ((to[1] - from[1]) * Math.PI) / 180;
    const dLon = ((to[0] - from[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from[1] * Math.PI) / 180) *
      Math.cos((to[1] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Check if user deviated from route
   */
  private checkRouteDeviation(currentCoord: [number, number]): void {
    if (!this.state.route) return;

    const isOnRoute = valhallaService.isOnRoute(currentCoord, this.state.route.geometry, 50);
    this.state.deviation = !isOnRoute;
  }

  /**
   * Convert step to turn instruction
   */
  private stepToTurnInstruction(step: Step): TurnInstruction {
    return {
      type: step.maneuver.type,
      modifier: step.maneuver.modifier,
      degrees: step.maneuver.bearing_after,
      distance: step.distance,
      duration: step.duration,
      instruction: step.instruction,
      streetName: step.name,
    };
  }

  /**
   * Emit turn instruction
   */
  private emitTurn(turn: TurnInstruction): void {
    this.turnCallbacks.forEach((callback) => callback(turn));
  }

  /**
   * Calculate arrival time
   */
  private calculateArrivalTime(durationSeconds: number): string {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + durationSeconds * 1000);
    return arrivalTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.add(callback);
    return () => {
      this.stateCallbacks.delete(callback);
    };
  }

  /**
   * Subscribe to turn instructions
   */
  onTurn(callback: TurnCallback): () => void {
    this.turnCallbacks.add(callback);
    return () => {
      this.turnCallbacks.delete(callback);
    };
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    this.stateCallbacks.forEach((callback) => callback(this.state));
  }

  /**
   * Get current state
   */
  getState(): NavigationState {
    return this.state;
  }
}

export default new NavigationManager();
