/**
 * Navigation Panel Component
 */

import { NavigationState, TurnInstruction } from '../types/index';

export class NavigationPanel {
  private container: HTMLElement;
  private state: NavigationState | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="navigation-panel">
        <div class="panel-header">
          <h2>Directions</h2>
        </div>
        
        <div class="route-info">
          <div class="info-item">
            <div class="label">Distance</div>
            <div class="value distance-value">--</div>
          </div>
          <div class="info-item">
            <div class="label">Duration</div>
            <div class="value duration-value">--</div>
          </div>
          <div class="info-item">
            <div class="label">Arrival</div>
            <div class="value arrival-value">--</div>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <div class="progress-text">
            <span class="progress-percentage">0%</span>
          </div>
        </div>

        <div class="instructions-section">
          <div class="current-instruction">
            <div class="instruction-icon">→</div>
            <div class="instruction-text">
              <div class="main-instruction">--</div>
              <div class="next-instruction">--</div>
            </div>
          </div>
        </div>

        <div class="steps-list">
          <h3>Turn by turn</h3>
          <div class="steps-container"></div>
        </div>
      </div>
    `;
  }

  public updateState(state: NavigationState): void {
    this.state = state;
    console.log('NavigationPanel.updateState():', { isNavigating: state.isNavigating, route: !!state.route });
    this.updateUI();
  }

  public updateTurnInstruction(instruction: TurnInstruction): void {
    const mainInst = this.container.querySelector('.main-instruction') as HTMLElement;
    const distance = this.formatDistance(instruction.distance);
    const street = instruction.streetName || 'Road';
    
    mainInst.textContent = `${instruction.instruction} on ${street}`;

    const nextInst = this.container.querySelector('.next-instruction') as HTMLElement;
    nextInst.textContent = `${distance} ahead`;

    this.updateIcon(instruction);
  }

  private updateIcon(instruction: TurnInstruction): void {
    const icon = this.container.querySelector('.instruction-icon') as HTMLElement;
    const modifiers: { [key: string]: string } = {
      'sharp left': '↙', 'left': '←', 'slight left': '↙',
      'straight': '↑',
      'slight right': '↗', 'right': '→', 'sharp right': '↘',
      'uturn': '↻',
    };
    
    icon.textContent = modifiers[instruction.modifier || ''] || '→';
  }

  private updateUI(): void {
    if (!this.state) return;

    // Update distances
    const distanceEl = this.container.querySelector('.distance-value') as HTMLElement;
    distanceEl.textContent = this.formatDistance(this.state.remainingDistance);

    const durationEl = this.container.querySelector('.duration-value') as HTMLElement;
    durationEl.textContent = this.formatDuration(this.state.remainingTime);

    const arrivalEl = this.container.querySelector('.arrival-value') as HTMLElement;
    arrivalEl.textContent = this.state.arrival_time;

    // Update progress
    if (this.state.route) {
      const progress = (
        ((this.state.route.distance - this.state.remainingDistance) / this.state.route.distance) *
        100
      );
      const progressFill = this.container.querySelector('.progress-fill') as HTMLElement;
      const progressPercent = this.container.querySelector('.progress-percentage') as HTMLElement;
      progressFill.style.width = `${progress}%`;
      progressPercent.textContent = `${Math.round(progress)}%`;
    }

    // Update deviation status
    const deviationWarning = this.container.querySelector('.deviation-warning') as HTMLElement | null;
    if (this.state.deviation && !deviationWarning) {
      const warning = document.createElement('div');
      warning.className = 'deviation-warning';
      warning.textContent = '⚠ Off route - recalculating...';
      const header = this.container.querySelector('.panel-header');
      if (header) header.appendChild(warning);
    } else if (!this.state.deviation && deviationWarning) {
      deviationWarning.remove();
    }

    // Update turn steps list when navigating
    if (this.state.isNavigating && this.state.route) {
      console.log('Calling updateTurnsList()');
      this.updateTurnsList();
    } else {
      console.log('Skipping updateTurnsList():', { isNavigating: this.state.isNavigating, hasRoute: !!this.state.route });
    }
  }

  private updateTurnsList(): void {
    const stepsContainer = this.container.querySelector('.steps-container') as HTMLElement;
    console.log('updateTurnsList() executing, stepsContainer:', !!stepsContainer, 'state:', !!this.state);
    if (!stepsContainer || !this.state) return;

    // Generate turn instructions from route
    const route = this.state.route;
    if (!route || !route.legs || route.legs.length === 0) {
      return;
    }

    const turns: any[] = [];
    let distance = 0;
    let stepIndex = 0;

    for (const leg of route.legs) {
      for (const step of leg.steps) {
        turns.push({
          index: stepIndex++,
          instruction: step.instruction || 'Continue',
          distance: distance,
          name: step.name || '',
        });
        distance += step.distance || 0;
      }
    }

    console.log('Generated turns:', turns.length, turns);

    stepsContainer.innerHTML = turns
      .map(
        (turn, idx) => `
      <div class="step-item ${idx === 0 ? 'active' : ''}">
        <div class="step-number">${idx + 1}</div>
        <div class="step-content">
          <div class="step-instruction">${turn.instruction}</div>
          <div class="step-distance">${this.formatDistance(turn.distance)}</div>
          ${turn.name ? `<div class="step-name">${turn.name}</div>` : ''}
        </div>
      </div>
    `
      )
      .join('');
    
    console.log('Steps HTML rendered:', stepsContainer.innerHTML.length, 'chars');
  }

  private formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
}
