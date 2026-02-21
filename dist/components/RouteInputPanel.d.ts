/**
 * Route Input Panel Component
 * Allows user to input origin and destination
 */
export declare class RouteInputPanel {
    private container;
    private originInput;
    private destInput;
    private originSuggestions;
    private destSuggestions;
    private onRequestRoute;
    private originSearchTimeout;
    private destSearchTimeout;
    private currentLocation;
    constructor(container: HTMLElement);
    private initializeLocation;
    private render;
    private setupListeners;
    private performSearch;
    setOrigin(location: string): void;
    setDestination(location: string): void;
    getOrigin(): string;
    getDestination(): string;
    clear(): void;
    onRoute(callback: (origin: string, destination: string) => void): void;
}
//# sourceMappingURL=RouteInputPanel.d.ts.map