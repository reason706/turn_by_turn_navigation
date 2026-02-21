/**
 * Control Panel Component
 */

export class ControlPanel {
  private container: HTMLElement;
  private callbacks: {
    onStartNavigation: () => void;
    onStopNavigation: () => void;
    onSimulate: (speed: number) => void;
    onRecenter: () => void;
    onStyleChange: (style: string) => void;
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.callbacks = {
      onStartNavigation: () => {},
      onStopNavigation: () => {},
      onSimulate: () => {},
      onRecenter: () => {},
      onStyleChange: () => {},
    };
    this.render();
    this.setupListeners();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="control-panel">
        <div class="control-group">
          <button class="btn btn-primary btn-start-nav" title="Start Navigation">
            ▶ Start
          </button>
          <button class="btn btn-danger btn-stop-nav" title="Stop Navigation" disabled>
            ⏹ Stop
          </button>
        </div>

        <div class="control-group">
          <button class="btn btn-secondary btn-recenter" title="Recenter Map">
            📍 Recenter
          </button>
        </div>

        <div class="control-group">
          <label for="speed-slider" class="label-text">Simulation Speed</label>
          <input
            type="range"
            id="speed-slider"
            class="speed-slider"
            min="0.5"
            max="5"
            step="0.5"
            value="1"
            disabled
          />
          <span class="speed-value">1×</span>
        </div>

        <div class="control-group">
          <label for="style-select" class="label-text">Map Style</label>
          <select id="style-select" class="style-select">
            <option value="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json">Light</option>
            <option value="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json">Voyager</option>
            <option value="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json">Dark</option>
          </select>
        </div>

        <div class="status-panel">
          <div class="status-item">
            <label>Status</label>
            <span class="status-value">Ready</span>
          </div>
          <div class="status-item">
            <label>Speed</label>
            <span class="speed-status">-- km/h</span>
          </div>
        </div>
      </div>
    `;
  }

  private setupListeners(): void {
    const startBtn = this.container.querySelector('.btn-start-nav') as HTMLButtonElement;
    const stopBtn = this.container.querySelector('.btn-stop-nav') as HTMLButtonElement;
    const recenterBtn = this.container.querySelector('.btn-recenter') as HTMLButtonElement;
    const speedSlider = this.container.querySelector('.speed-slider') as HTMLInputElement;
    const styleSelect = this.container.querySelector('.style-select') as HTMLSelectElement;

    startBtn.addEventListener('click', () => {
      this.setNavigating(true);
      this.callbacks.onStartNavigation();
    });

    stopBtn.addEventListener('click', () => {
      this.setNavigating(false);
      this.callbacks.onStopNavigation();
    });

    recenterBtn.addEventListener('click', () => {
      this.callbacks.onRecenter();
    });

    speedSlider.addEventListener('input', (e) => {
      const speed = parseFloat((e.target as HTMLInputElement).value);
      const speedValue = this.container.querySelector('.speed-value') as HTMLElement;
      speedValue.textContent = `${speed}×`;
      this.callbacks.onSimulate(speed);
    });

    styleSelect.addEventListener('change', (e) => {
      const style = (e.target as HTMLSelectElement).value;
      this.callbacks.onStyleChange(style);
    });
  }

  public setNavigating(isNavigating: boolean): void {
    const startBtn = this.container.querySelector('.btn-start-nav') as HTMLButtonElement;
    const stopBtn = this.container.querySelector('.btn-stop-nav') as HTMLButtonElement;
    const speedSlider = this.container.querySelector('.speed-slider') as HTMLInputElement;
    const statusValue = this.container.querySelector('.status-value') as HTMLElement;

    startBtn.disabled = isNavigating;
    stopBtn.disabled = !isNavigating;
    speedSlider.disabled = !isNavigating;
    statusValue.textContent = isNavigating ? 'Navigating' : 'Ready';
  }

  public updateSpeed(speedKmh: number): void {
    const speedStatus = this.container.querySelector('.speed-status') as HTMLElement;
    speedStatus.textContent = `${Math.round(speedKmh)} km/h`;
  }

  public onStartNavigation(callback: () => void): void {
    this.callbacks.onStartNavigation = callback;
  }

  public onStopNavigation(callback: () => void): void {
    this.callbacks.onStopNavigation = callback;
  }

  public onSimulate(callback: (speed: number) => void): void {
    this.callbacks.onSimulate = callback;
  }

  public onRecenter(callback: () => void): void {
    this.callbacks.onRecenter = callback;
  }

  public onStyleChange(callback: (style: string) => void): void {
    this.callbacks.onStyleChange = callback;
  }
}
