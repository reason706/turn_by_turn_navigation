// Example Usage of MapLibre Valhalla Navigation System
// This file demonstrates how to use the navigation system in your code

import navigationManager from '@services/navigation';
import maplibreService from '@services/maplibre';
import geocodingService from '@services/geocoding';
import locationService from '@services/location';
import { NavigationState, TurnInstruction } from '@types/index';

// ============================================================================
// 1. INITIALIZATION
// ============================================================================

async function initializeNavigation() {
  try {
    // Initialize the system
    await navigationManager.initialize();
    
    // Initialize map
    maplibreService.initMap({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [2.3522, 48.8566], // Paris
      zoom: 12,
    });

    // Start GPS tracking
    navigationManager.startLocationTracking(true);

    console.log('Navigation system initialized');
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// ============================================================================
// 2. LOCATION SEARCH
// ============================================================================

async function searchAndNavigateTo(query: string) {
  try {
    // Search for location
    const location = await navigationManager.searchLocation(query);
    
    if (location) {
      console.log('Found location:', location.name);
      
      // Fly map to location
      const map = maplibreService.getMap();
      map.flyTo({
        center: location.coordinates,
        zoom: 15,
        duration: 1000,
      });
    } else {
      console.log('Location not found');
    }
  } catch (error) {
    console.error('Search failed:', error);
  }
}

// Example calls:
// searchAndNavigateTo('Eiffel Tower');
// searchAndNavigateTo('Statue of Liberty');
// searchAndNavigateTo('Big Ben');

// ============================================================================
// 3. ROUTE REQUEST
// ============================================================================

async function requestRoute(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
  travelMode: string = 'auto'
) {
  try {
    const route = await navigationManager.requestRoute(
      [fromLng, fromLat],
      [toLng, toLat],
      travelMode // 'auto', 'pedestrian', 'bicycle', 'taxi'
    );

    if (route) {
      console.log('Route found!');
      console.log(`Distance: ${(route.distance / 1000).toFixed(1)} km`);
      console.log(`Duration: ${(route.duration / 60).toFixed(0)} minutes`);
      console.log(`Steps: ${route.legs[0]?.steps?.length || 0}`);
    }
  } catch (error) {
    console.error('Route request failed:', error);
  }
}

// Example calls:
// requestRoute(2.35, 48.85, 2.29, 48.86, 'auto'); // Paris routes
// requestRoute(2.35, 48.85, 2.29, 48.86, 'pedestrian'); // Walking direction

// ============================================================================
// 4. STATE MANAGEMENT
// ============================================================================

function subscribeToNavigation() {
  // Listen to state changes
  navigationManager.onStateChange((state: NavigationState) => {
    console.log('Navigation State Update:');
    console.log(`  Is Navigating: ${state.isNavigating}`);
    console.log(`  Current Location: ${JSON.stringify(state.currentLocation)}`);
    console.log(`  Remaining Distance: ${state.remainingDistance}m`);
    console.log(`  Remaining Time: ${state.remainingTime}s`);
    console.log(`  Arrival Time: ${state.arrival_time}`);
    console.log(`  Off Route: ${state.deviation}`);
    console.log(`  Current Speed: ${state.speed}m/s`);

    // Update UI here
    updateUI(state);
  });

  // Listen to turn instructions
  navigationManager.onTurn((turn: TurnInstruction) => {
    console.log('Turn Instruction:');
    console.log(`  ${turn.instruction}`);
    console.log(`  Distance: ${turn.distance}m`);
    console.log(`  Modifier: ${turn.modifier}`);

    // Announce turn
    announceDirection(turn);
  });
}

function updateUI(state: NavigationState) {
  // Update your UI with state data
  document.getElementById('distance')!.textContent = 
    formatDistance(state.remainingDistance);
  
  document.getElementById('time')!.textContent = 
    formatTime(state.remainingTime);
  
  document.getElementById('arrival')!.textContent = state.arrival_time;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function announceDirection(turn: TurnInstruction) {
  // Use Web Speech API to announce
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(turn.instruction);
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }
}

// ============================================================================
// 5. NAVIGATION CONTROL
// ============================================================================

function startNavigation() {
  const state = navigationManager.getState();
  
  if (!state.route) {
    console.error('No route available. Request a route first.');
    return;
  }

  navigationManager.startNavigation();
  console.log('Navigation started!');
}

function stopNavigation() {
  navigationManager.stopNavigation();
  console.log('Navigation stopped');
}

function simulateVehicleMovement(speedMultiplier: number) {
  // speedMultiplier: 0.5 (slow), 1 (normal), 5 (fast)
  navigationManager.simulateNavigation(speedMultiplier);
  console.log(`Vehicle simulation started at ${speedMultiplier}× speed`);
}

function stopSimulation() {
  navigationManager.stopSimulation();
  console.log('Simulation stopped');
}

// Example usage:
// startNavigation();
// simulateVehicleMovement(1.5); // 1.5x speed
// stopSimulation();
// stopNavigation();

// ============================================================================
// 6. GPS LOCATION TRACKING
// ============================================================================

function setupLocationTracking() {
  locationService.startTracking(
    (update) => {
      console.log('Current Location:');
      console.log(`  Lat: ${update.coordinates.latitude}`);
      console.log(`  Lng: ${update.coordinates.longitude}`);
      console.log(`  Accuracy: ${update.accuracy}m`);
      console.log(`  Speed: ${update.speed}m/s`);
      console.log(`  Heading: ${update.heading}°`);

      // Update map marker
      maplibreService.updateUserLocation(
        update.coordinates.longitude,
        update.coordinates.latitude,
        update.accuracy
      );
    },
    (error) => {
      console.error('Location error:', error);
    }
  );
}

function stopLocationTracking() {
  locationService.stopTracking();
  console.log('Location tracking stopped');
}

// ============================================================================
// 7. GEOCODING EXAMPLES
// ============================================================================

async function geocodingExamples() {
  // Search places
  const places1 = await geocodingService.searchPlaces('Paris', undefined, 5);
  console.log('Search results:', places1);

  // Search with bounding box
  const bbox = {
    minLng: 2.0,
    minLat: 48.5,
    maxLng: 2.5,
    maxLat: 49.0,
  };
  const places2 = await geocodingService.searchPlaces('Restaurant', bbox, 10);
  console.log('Places near Paris:', places2);

  // Autocomplete
  const suggestions = await geocodingService.autocomplete('Eiff', 5);
  console.log('Autocomplete suggestions:', suggestions);

  // Reverse geocode
  const address = await geocodingService.reverseGeocode(2.35, 48.85);
  console.log('Address at coordinates:', address);
}

// ============================================================================
// 8. MAP CONTROLS
// ============================================================================

function mapControlExamples() {
  const map = maplibreService.getMap();

  // Change map style
  maplibreService.setStyle(
    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
  );

  // Fit map to route bounds
  const route = navigationManager.getState().route;
  if (route) {
    // Map automatically fits when route is added
    maplibreService.addRoute(route, true);
  }

  // Clear route
  maplibreService.clearRoute();

  // Add waypoints
  maplibreService.addWaypoints([
    { lng: 2.35, lat: 48.85, label: 'Start' },
    { lng: 2.29, lat: 48.86, label: 'Finish' },
  ]);

  // Toggle layer visibility
  maplibreService.setLayerVisibility('route-line', false);
  maplibreService.setLayerVisibility('route-line', true);

  // Fly to location
  map.flyTo({
    center: [2.35, 48.85],
    zoom: 15,
    bearing: 45,
    pitch: 30,
    duration: 2000,
  });
}

// ============================================================================
// 9. COMPLETE NAVIGATION FLOW
// ============================================================================

async function completeNavigationExample() {
  // Step 1: Initialize
  await initializeNavigation();

  // Step 2: Subscribe to events
  subscribeToNavigation();

  // Step 3: Setup location tracking
  setupLocationTracking();

  // Step 4: Search for destination
  const destination = await navigationManager.searchLocation('Eiffel Tower');
  if (!destination) {
    console.error('Destination not found');
    return;
  }

  // Step 5: Get current location
  try {
    const currentState = navigationManager.getState();
    if (!currentState.currentLocation) {
      console.error('Current location not available');
      return;
    }

    // Step 6: Request route
    const route = await navigationManager.requestRoute(
      currentState.currentLocation.coordinates,
      destination.coordinates
    );

    if (!route) {
      console.error('Could not calculate route');
      return;
    }

    // Step 7: Start navigation
    startNavigation();

    // Step 8: Simulate movement
    simulateVehicleMovement(1); // Normal speed

    // Wait 30 seconds then stop
    setTimeout(() => {
      stopSimulation();
      stopNavigation();
      stopLocationTracking();
    }, 30000);
  } catch (error) {
    console.error('Navigation flow failed:', error);
  }
}

// ============================================================================
// 10. ERROR HANDLING
// ============================================================================

async function robustNavigationExample() {
  try {
    // 1. Check browser support
    if (!locationService.checkSupport()) {
      throw new Error('Geolocation not supported in this browser');
    }

    // 2. Initialize with error handling
    await navigationManager.initialize();

    // 3. Request route with validation
    const state = navigationManager.getState();
    if (!state.currentLocation) {
      throw new Error('Could not determine current location');
    }

    const destination = await navigationManager.searchLocation('destination');
    if (!destination) {
      throw new Error('Destination not found');
    }

    const route = await navigationManager.requestRoute(
      state.currentLocation.coordinates,
      destination.coordinates
    );

    if (!route) {
      throw new Error('No route available');
    }

    // 4. Start navigation
    navigationManager.startNavigation();
    navigationManager.simulateNavigation(1);

    console.log('Navigation started successfully');
  } catch (error) {
    console.error('Navigation error:', error);
    // Show user-friendly error message
    showErrorDialog((error as Error).message);
  }
}

function showErrorDialog(message: string) {
  alert(`Navigation Error: ${message}`);
}

// ============================================================================
// 11. CUSTOM FEATURES
// ============================================================================

// Recenter map on current location
function recenterMap() {
  const state = navigationManager.getState();
  if (state.currentLocation) {
    const map = maplibreService.getMap();
    map.flyTo({
      center: state.currentLocation.coordinates,
      zoom: 17,
      duration: 1000,
    });
  }
}

// Get route summary
function getRouteSummary() {
  const state = navigationManager.getState();
  if (!state.route) {
    console.log('No route available');
    return;
  }

  return {
    distance: state.route.distance,
    duration: state.route.duration,
    legs: state.route.legs.length,
    steps: state.route.legs.reduce((sum, leg) => sum + (leg.steps?.length || 0), 0),
  };
}

// Check if off route
function checkIfOffRoute() {
  const state = navigationManager.getState();
  return state.deviation;
}

// ============================================================================
// Export for use in other files
// ============================================================================

export {
  initializeNavigation,
  searchAndNavigateTo,
  requestRoute,
  subscribeToNavigation,
  startNavigation,
  stopNavigation,
  simulateVehicleMovement,
  stopSimulation,
  setupLocationTracking,
  stopLocationTracking,
  geocodingExamples,
  mapControlExamples,
  completeNavigationExample,
  robustNavigationExample,
  recenterMap,
  getRouteSummary,
  checkIfOffRoute,
};
