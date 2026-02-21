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
declare const DEFAULT_CONFIG: EnvironmentConfig;
export declare const getConfig: () => EnvironmentConfig;
export declare const updateConfig: (updates: Partial<EnvironmentConfig>) => void;
export default DEFAULT_CONFIG;
//# sourceMappingURL=config.d.ts.map