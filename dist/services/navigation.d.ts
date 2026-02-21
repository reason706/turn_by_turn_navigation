/**
 * Navigation Manager
 * Main orchestrator for the navigation system
 */
import { NavigationState, Location, Route, TurnInstruction } from '../types/index';
type StateChangeCallback = (state: NavigationState) => void;
type TurnCallback = (turn: TurnInstruction) => void;
declare class NavigationManager {
    private state;
    private stateCallbacks;
    private turnCallbacks;
    private currentHeading;
    private speedMultiplier;
    private simulationInterval;
    constructor();
    /**
     * Initialize navigation system
     */
    initialize(): Promise<void>;
    /**
     * Start listening to location updates
     */
    startLocationTracking(continuous?: boolean): void;
    /**
     * Stop location tracking
     */
    stopLocationTracking(): void;
    /**
     * Handle location update from device
     */
    private handleLocationUpdate;
    /**
     * Search for a location
     */
    searchLocation(query: string): Promise<Location | null>;
    /**
     * Request route between two locations
     */
    requestRoute(start: [number, number], end: [number, number], costing?: string): Promise<Route | null>;
    /**
     * Start navigation
     */
    startNavigation(): void;
    /**
     * Stop navigation
     */
    stopNavigation(): void;
    /**
     * Simulate vehicle movement
     */
    simulateNavigation(speedMultiplier?: number): void;
    /**
     * Stop simulation
     */
    stopSimulation(): void;
    /**
     * Advance navigation along route
     */
    private advanceNavigation;
    /**
     * Get all steps from route
     */
    private getAllSteps;
    /**
     * Get end coordinate of a step
     */
    private getStepEndCoordinate;
    /**
     * Move towards a coordinate
     */
    private moveTowardCoordinate;
    /**
     * Calculate bearing between two points
     */
    private calculateBearing;
    /**
     * Calculate distance between two coordinates
     */
    private distanceBetween;
    /**
     * Check if user deviated from route
     */
    private checkRouteDeviation;
    /**
     * Convert step to turn instruction
     */
    private stepToTurnInstruction;
    /**
     * Emit turn instruction
     */
    private emitTurn;
    /**
     * Calculate arrival time
     */
    private calculateArrivalTime;
    /**
     * Subscribe to state changes
     */
    onStateChange(callback: StateChangeCallback): () => void;
    /**
     * Subscribe to turn instructions
     */
    onTurn(callback: TurnCallback): () => void;
    /**
     * Notify state change
     */
    private notifyStateChange;
    /**
     * Get current state
     */
    getState(): NavigationState;
}
declare const _default: NavigationManager;
export default _default;
//# sourceMappingURL=navigation.d.ts.map