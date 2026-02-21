/**
 * Main Application
 */

import 'maplibre-gl/dist/maplibre-gl.css';
import './styles/main.scss';

import navigationManager from './services/navigation';
import maplibreService from './services/maplibre';
import geocodingService from './services/geocoding';

import { SearchBox } from './components/SearchBox';
import { NavigationPanel } from './components/NavigationPanel';
import { ControlPanel } from './components/ControlPanel';
import { RouteInputPanel } from './components/RouteInputPanel';

class NavigationApp {
  private searchBox: SearchBox | null = null;
  private navigationPanel: NavigationPanel | null = null;
  private controlPanel: ControlPanel | null = null;
  private routeInputPanel: RouteInputPanel | null = null;

  async initialize(): Promise<void> {
    try {
      // Initialize map
      const mapContainer = document.getElementById('map');
      if (!mapContainer) {
        throw new Error('Map container not found');
      }

      maplibreService.initMap({
        container: mapContainer,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: [2.3522, 48.8566], // Paris
        zoom: 12,
      });

      // Initialize UI components
      const searchContainer = document.getElementById('search-container');
      const navPanelContainer = document.getElementById('nav-panel');
      const controlPanelContainer = document.getElementById('control-panel');
      const routeInputContainer = document.getElementById('route-input-panel');

      if (searchContainer)
        this.searchBox = new SearchBox(searchContainer);
      if (navPanelContainer)
        this.navigationPanel = new NavigationPanel(navPanelContainer);
      if (controlPanelContainer)
        this.controlPanel = new ControlPanel(controlPanelContainer);
      if (routeInputContainer)
        this.routeInputPanel = new RouteInputPanel(routeInputContainer);

      // Initialize navigation
      await navigationManager.initialize();

      // Setup event listeners
      this.setupEventListeners();

      console.log('Navigation app initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize app: ' + (error as Error).message);
    }
  }

  private setupEventListeners(): void {
    // Search box
    if (this.searchBox) {
      this.searchBox.onResultSelect((query) => {
        this.handleLocationSearch(query);
      });
    }

    // Navigation state updates
    navigationManager.onStateChange((state) => {
      console.log('State changed:', { isNavigating: state.isNavigating, route: !!state.route, distance: state.remainingDistance });
      if (this.navigationPanel) {
        this.navigationPanel.updateState(state);
      }
      if (this.controlPanel) {
        this.controlPanel.updateSpeed(state.speed * 3.6); // Convert m/s to km/h
      }
    });

    // Turn instructions
    navigationManager.onTurn((turn) => {
      if (this.navigationPanel) {
        this.navigationPanel.updateTurnInstruction(turn);
      }
      this.announceInstruction(turn.instruction);
    });

    // Control panel events
    if (this.controlPanel) {
      this.controlPanel.onStartNavigation(() => {
        console.log('Start navigation clicked');
        try {
          navigationManager.startNavigation();
          console.log('startNavigation() completed');
          navigationManager.simulateNavigation(1);
          console.log('simulateNavigation() started');
          this.showNavigationPanel(true);
          console.log('Navigation panel shown');
        } catch (error) {
          console.error('Error starting navigation:', error);
        }
      });

      this.controlPanel.onStopNavigation(() => {
        navigationManager.stopNavigation();
        navigationManager.stopSimulation();
        this.showNavigationPanel(false);
      });

      this.controlPanel.onSimulate((speed) => {
        navigationManager.simulateNavigation(speed);
      });

      this.controlPanel.onRecenter(() => {
        const state = navigationManager.getState();
        if (state.currentLocation) {
          const map = maplibreService.getMap();
          map.flyTo({
            center: state.currentLocation.coordinates as [number, number],
            zoom: 17,
            duration: 1000,
          });
        }
      });

      this.controlPanel.onStyleChange((style) => {
        maplibreService.setStyle(style);
      });
    }

    // Route input panel events
    if (this.routeInputPanel) {
      this.routeInputPanel.onRoute(async (origin, destination) => {
        await this.handleRouteRequest(origin, destination);
      });
    }

    // Map click to select destination
    const map = maplibreService.getMap();
    map.on('click', async (e) => {
      const state = navigationManager.getState();
      
      // Only allow destination selection if not already navigating
      if (!state.isNavigating && state.currentLocation) {
        const destCoords: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        
        // Request route from current location to clicked point
        const route = await navigationManager.requestRoute(
          state.currentLocation.coordinates,
          destCoords
        );

        if (route) {
          this.showSuccess(`Route found: ${(route.distance / 1000).toFixed(1)} km`);
        }
      }
    });

    // Start location tracking
    navigationManager.startLocationTracking(true);
  }

  private async handleLocationSearch(query: string): Promise<void> {
    try {
      const location = await navigationManager.searchLocation(query);
      if (location) {
        const map = maplibreService.getMap();
        map.flyTo({
          center: location.coordinates as [number, number],
          zoom: 15,
          duration: 1000,
        });
        this.showSuccess(`Found: ${location.name}`);
      } else {
        this.showError('Location not found');
      }
    } catch (error) {
      console.error('Search error:', error);
      this.showError('Search failed');
    }
  }

  private async handleRouteRequest(origin: string, destination: string): Promise<void> {
    try {
      // Search for origin and destination
      const originLocation = await navigationManager.searchLocation(origin);
      const destLocation = await navigationManager.searchLocation(destination);

      if (!originLocation || !destLocation) {
        this.showError('Could not find one or both locations');
        return;
      }

      // Request route
      const route = await navigationManager.requestRoute(
        originLocation.coordinates,
        destLocation.coordinates
      );

      if (route) {
        const distance = (route.distance / 1000).toFixed(1);
        const duration = Math.round(route.duration / 60);
        this.showSuccess(`Route found: ${distance} km, ${duration} minutes`);
        
        // Show navigation panel with route info
        this.showNavigationPanel(true);
      } else {
        this.showError('Could not calculate route');
      }
    } catch (error) {
      console.error('Route request error:', error);
      this.showError('Route calculation failed');
    }
  }

  private showNavigationPanel(show: boolean): void {
    const navPanel = document.getElementById('nav-panel');
    if (navPanel) {
      if (show) {
        navPanel.classList.add('visible');
      } else {
        navPanel.classList.remove('visible');
      }
    }
  }

  private announceInstruction(instruction: string): void {
    // Simple text-to-speech announcement
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(instruction);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }

  private showSuccess(message: string): void {
    this.showNotification(message, 'success');
  }

  private showError(message: string): void {
    this.showNotification(message, 'error');
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('notification-show');
    }, 10);

    setTimeout(() => {
      notification.classList.remove('notification-show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new NavigationApp();
  app.initialize();
});
