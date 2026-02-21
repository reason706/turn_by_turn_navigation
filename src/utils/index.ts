/**
 * Utility Functions
 */

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate bearing between two points
 */
export function calculateBearing(
  from: [number, number],
  to: [number, number]
): number {
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
 * Calculate distance between two points
 */
export function calculateDistance(
  from: [number, number],
  to: [number, number]
): number {
  const R = 6371000; // Earth's radius in meters
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
 * Decode polyline (Google algorithm)
 */
export function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0,
    lat = 0,
    lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push([lng / 1e5, lat / 1e5]);
  }

  return poly;
}

/**
 * Encode polyline (Google algorithm)
 */
export function encodePolyline(points: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const [lng, lat] of points) {
    const dlat = Math.round((lat - prevLat) * 1e5);
    const dlng = Math.round((lng - prevLng) * 1e5);

    encoded += encodeValue(dlat);
    encoded += encodeValue(dlng);

    prevLat = lat;
    prevLng = lng;
  }

  return encoded;
}

/**
 * Encode a single value
 */
function encodeValue(value: number): string {
  value = value < 0 ? ~(value << 1) : (value << 1);
  let encoded = '';

  while (value >= 0x20) {
    encoded += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }

  encoded += String.fromCharCode(value + 63);
  return encoded;
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

/**
 * Get current time in readable format
 */
export function getCurrentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate ETA from current time and duration
 */
export function calculateETA(durationSeconds: number): string {
  const now = new Date();
  const etaTime = new Date(now.getTime() + durationSeconds * 1000);

  return etaTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Parse turn modifier to human-readable direction
 */
export function parseTurnModifier(modifier?: string): string {
  const modifierMap: { [key: string]: string } = {
    'uturn': 'Make a U-turn',
    'sharp right': 'Sharp right',
    'right': 'Turn right',
    'slight right': 'Slight right',
    'straight': 'Go straight',
    'slight left': 'Slight left',
    'left': 'Turn left',
    'sharp left': 'Sharp left',
  };

  return modifierMap[modifier || ''] || 'Continue';
}

/**
 * Check if coordinates are valid
 */
export function isValidCoordinates(coords: [number, number]): boolean {
  const [lng, lat] = coords;
  return Math.abs(lng) <= 180 && Math.abs(lat) <= 90;
}

/**
 * Get browser geolocation with promise
 */
export function getGeolocation(options?: PositionOptions): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => reject(error),
        options
      );
    }
  });
}

/**
 * Check if device supports orientation
 */
export function supportsOrientation(): boolean {
  return 'DeviceOrientationEvent' in window;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lng: number, lat: number, decimals: number = 4): string {
  return `${lat.toFixed(decimals)}, ${lng.toFixed(decimals)}`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse URL query parameters
 */
export function getQueryParams(): { [key: string]: string } {
  const params: { [key: string]: string } = {};
  const searchParams = new URLSearchParams(window.location.search);

  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return params;
}
