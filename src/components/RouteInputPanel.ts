/**
 * Route Input Panel Component
 * Allows user to input origin and destination
 */

import geocodingService from '../services/geocoding';
import locationService from '../services/location';

interface LocationSuggestion {
  name: string;
  address?: string;
  coordinates?: [number, number];
}

export class RouteInputPanel {
  private container: HTMLElement;
  private originInput: HTMLInputElement;
  private destInput: HTMLInputElement;
  private originSuggestions: HTMLDivElement;
  private destSuggestions: HTMLDivElement;
  private onRequestRoute: (origin: string, destination: string) => void = () => {};
  private originSearchTimeout: NodeJS.Timeout | null = null;
  private destSearchTimeout: NodeJS.Timeout | null = null;
  private currentLocation: [number, number] | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.originInput = container.querySelector('.origin-input') as HTMLInputElement;
    this.destInput = container.querySelector('.dest-input') as HTMLInputElement;
    this.originSuggestions = container.querySelector('.origin-suggestions') as HTMLDivElement;
    this.destSuggestions = container.querySelector('.dest-suggestions') as HTMLDivElement;
    this.setupListeners();
    this.initializeLocation();
  }

  private async initializeLocation(): Promise<void> {
    try {
      const pos = await locationService.getCurrentPosition();
      this.currentLocation = [pos.coordinates[0], pos.coordinates[1]] as [number, number];
    } catch (error) {
      console.error('Could not get initial location:', error);
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="route-input-panel">
        <div class="route-input-header">
          <h3>Plan Route</h3>
        </div>

        <div class="route-inputs">
          <div class="input-group">
            <div class="label-wrapper">
              <label class="input-label">From</label>
              <button class="btn-use-location origin-use-location" title="Use current location">
                📍 Current
              </button>
            </div>
            <div class="input-wrapper">
              <input
                type="text"
                class="origin-input"
                placeholder="Enter starting location..."
                aria-label="Origin location"
              />
              <div class="origin-suggestions"></div>
            </div>
          </div>

          <button class="swap-locations" title="Swap origin and destination">
            ⇅
          </button>

          <div class="input-group">
            <div class="label-wrapper">
              <label class="input-label">To</label>
              <button class="btn-use-location dest-use-location" title="Use current location">
                📍 Current
              </button>
            </div>
            <div class="input-wrapper">
              <input
                type="text"
                class="dest-input"
                placeholder="Enter destination..."
                aria-label="Destination location"
              />
              <div class="dest-suggestions"></div>
            </div>
          </div>
        </div>

        <button class="btn btn-route-request" title="Request route">
          Get Directions
        </button>
      </div>
    `;
  }

  private setupListeners(): void {
    const swapBtn = this.container.querySelector('.swap-locations') as HTMLButtonElement;
    const requestBtn = this.container.querySelector('.btn-route-request') as HTMLButtonElement;
    const originUseLocBtn = this.container.querySelector('.origin-use-location') as HTMLButtonElement;
    const destUseLocBtn = this.container.querySelector('.dest-use-location') as HTMLButtonElement;

    // Origin input search
    this.originInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value.length > 2) {
        if (this.originSearchTimeout) {
          clearTimeout(this.originSearchTimeout);
        }
        this.originSearchTimeout = setTimeout(() => {
          this.performSearch(value, 'origin');
        }, 300);
      } else {
        this.originSuggestions.innerHTML = '';
        this.originSuggestions.style.display = 'none';
      }
    });

    // Destination input search
    this.destInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value.trim();
      if (value.length > 2) {
        if (this.destSearchTimeout) {
          clearTimeout(this.destSearchTimeout);
        }
        this.destSearchTimeout = setTimeout(() => {
          this.performSearch(value, 'destination');
        }, 300);
      } else {
        this.destSuggestions.innerHTML = '';
        this.destSuggestions.style.display = 'none';
      }
    });

    // Swap locations
    swapBtn.addEventListener('click', () => {
      const temp = this.originInput.value;
      this.originInput.value = this.destInput.value;
      this.destInput.value = temp;
      this.originSuggestions.innerHTML = '';
      this.destSuggestions.innerHTML = '';
    });

    // Use current location for origin
    originUseLocBtn.addEventListener('click', async () => {
      try {
        const pos = await locationService.getCurrentPosition();
        this.currentLocation = [pos.coordinates[0], pos.coordinates[1]] as [number, number];
        const address = await geocodingService.reverseGeocode(pos.coordinates[0], pos.coordinates[1]);
        this.originInput.value = address || `${pos.coordinates[1].toFixed(4)}, ${pos.coordinates[0].toFixed(4)}`;
        this.originSuggestions.innerHTML = '';
      } catch (error) {
        console.error('Error getting location:', error);
        alert('Could not get your current location');
      }
    });

    // Use current location for destination
    destUseLocBtn.addEventListener('click', async () => {
      try {
        const pos = await locationService.getCurrentPosition();
        const address = await geocodingService.reverseGeocode(pos.coordinates[0], pos.coordinates[1]);
        this.destInput.value = address || `${pos.coordinates[1].toFixed(4)}, ${pos.coordinates[0].toFixed(4)}`;
        this.destSuggestions.innerHTML = '';
      } catch (error) {
        console.error('Error getting location:', error);
        alert('Could not get your current location');
      }
    });

    // Request route
    requestBtn.addEventListener('click', () => {
      if (this.originInput.value && this.destInput.value) {
        this.onRequestRoute(this.originInput.value, this.destInput.value);
      }
    });

    // Allow Enter key to request route
    this.destInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.originInput.value && this.destInput.value) {
        this.onRequestRoute(this.originInput.value, this.destInput.value);
      }
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target !== this.originInput) {
        this.originSuggestions.style.display = 'none';
      }
      if (e.target !== this.destInput) {
        this.destSuggestions.style.display = 'none';
      }
    });
  }

  private async performSearch(query: string, type: 'origin' | 'destination'): Promise<void> {
    try {
      const container = type === 'origin' ? this.originSuggestions : this.destSuggestions;
      
      // Show loading state
      container.innerHTML = '<div class="suggestion-loading">Searching...</div>';
      container.style.display = 'block';

      const results = await geocodingService.searchPlaces(query);
      
      if (results && results.length > 0) {
        container.innerHTML = results
          .slice(0, 5)
          .map(
            (result, idx) => `
          <div class="suggestion" data-index="${idx}">
            <div class="suggestion-name">${result.name}</div>
            <div class="suggestion-address">${result.address || ''}</div>
          </div>
        `
          )
          .join('');

        container.querySelectorAll('.suggestion').forEach((el) => {
          el.addEventListener('click', () => {
            const index = parseInt((el as HTMLElement).dataset.index || '0');
            const selected = results[index];
            if (type === 'origin') {
              this.originInput.value = selected.name;
              this.originSuggestions.style.display = 'none';
              this.originSuggestions.innerHTML = '';
            } else {
              this.destInput.value = selected.name;
              this.destSuggestions.style.display = 'none';
              this.destSuggestions.innerHTML = '';
            }
          });
        });
      } else {
        container.innerHTML = '<div class="suggestion-empty">No results found</div>';
      }
    } catch (error) {
      console.error('Search error:', error);
      const container = type === 'origin' ? this.originSuggestions : this.destSuggestions;
      container.innerHTML = '<div class="suggestion-error">Search failed</div>';
    }
  }

  public setOrigin(location: string): void {
    this.originInput.value = location;
  }

  public setDestination(location: string): void {
    this.destInput.value = location;
  }

  public getOrigin(): string {
    return this.originInput.value;
  }

  public getDestination(): string {
    return this.destInput.value;
  }

  public clear(): void {
    this.originInput.value = '';
    this.destInput.value = '';
    this.originSuggestions.innerHTML = '';
    this.destSuggestions.innerHTML = '';
  }

  public onRoute(callback: (origin: string, destination: string) => void): void {
    this.onRequestRoute = callback;
  }
}
