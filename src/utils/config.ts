/**
 * Environment Configuration
 */

interface EnvironmentConfig {
  valhalla: {
    baseUrl: string;
    timeout: number;
  };
  geocoding: {
    photonUrl: string;
    nominatimUrl: string;
    timeout: number;
  };
  map: {
    style: string;
    defaultCenter: [number, number];
    defaultZoom: number;
    defaultPitch: number;
    defaultBearing: number;
  };
  navigation: {
    defaultCosting: string;
    routeHighlightColor: string;
    slowSpeed: number;
    normalSpeed: number;
    fastSpeed: number;
  };
  features: {
    enableOfflineMode: boolean;
    enableTrafficLayer: boolean;
    enableVoiceAnnouncements: boolean;
    enableLocationTracking: boolean;
  };
}

const DEFAULT_CONFIG: EnvironmentConfig = {
  valhalla: {
    baseUrl: process.env.VALHALLA_URL || 'http://valhalla.openstreetmap.de',
    timeout: 10000,
  },
  geocoding: {
    photonUrl: process.env.PHOTON_URL || 'https://photon.komoot.io',
    nominatimUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
    timeout: 5000,
  },
  map: {
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    defaultCenter: [2.3522, 48.8566], // Paris
    defaultZoom: 12,
    defaultPitch: 0,
    defaultBearing: 0,
  },
  navigation: {
    defaultCosting: 'auto',
    routeHighlightColor: '#0084ff',
    slowSpeed: 30, // km/h
    normalSpeed: 50,
    fastSpeed: 80,
  },
  features: {
    enableOfflineMode: false,
    enableTrafficLayer: false,
    enableVoiceAnnouncements: true,
    enableLocationTracking: true,
  },
};

export const getConfig = (): EnvironmentConfig => {
  return DEFAULT_CONFIG;
};

export const updateConfig = (updates: Partial<EnvironmentConfig>): void => {
  Object.assign(DEFAULT_CONFIG, updates);
};

export default DEFAULT_CONFIG;
