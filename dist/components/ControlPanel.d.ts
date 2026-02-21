/**
 * Control Panel Component
 */
export declare class ControlPanel {
    private container;
    private callbacks;
    constructor(container: HTMLElement);
    private render;
    private setupListeners;
    setNavigating(isNavigating: boolean): void;
    updateSpeed(speedKmh: number): void;
    onStartNavigation(callback: () => void): void;
    onStopNavigation(callback: () => void): void;
    onSimulate(callback: (speed: number) => void): void;
    onRecenter(callback: () => void): void;
    onStyleChange(callback: (style: string) => void): void;
}
//# sourceMappingURL=ControlPanel.d.ts.map