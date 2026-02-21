/**
 * Navigation Panel Component
 */
import { NavigationState, TurnInstruction } from '../types/index';
export declare class NavigationPanel {
    private container;
    private state;
    constructor(container: HTMLElement);
    private render;
    updateState(state: NavigationState): void;
    updateTurnInstruction(instruction: TurnInstruction): void;
    private updateIcon;
    private updateUI;
    private updateTurnsList;
    private formatDistance;
    private formatDuration;
}
//# sourceMappingURL=NavigationPanel.d.ts.map