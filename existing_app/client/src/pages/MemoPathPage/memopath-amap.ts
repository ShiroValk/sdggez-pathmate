import { logger } from '@/lib/logger';

const AMAP_KEY = (import.meta.env.VITE_AMAP_KEY ?? '').trim();
const REST_BASE = 'https://restapi.amap.com/v3';

export interface AMapPoint {
  lng: number;
  lat: number;
}

export interface AmpTip {
  name: string;
  district: string;
  address: string;
  location: AMapPoint | null;
}

export interface AmpRoute {
  distanceM: number;
  durationS: number;
  points: AMapPoint[];
}

export interface AMapOverlay {
  setMap(map: AMapInstance | null): void;
}

export interface AMapInstance {
  destroy(): void;
  add(overlay: AMapOverlay | AMapOverlay[]): void;
  setFitView(
    overlays?: AMapOverlay[] | null,
    immediately?: boolean,
    avoid?: [number, number, number, number],
  ): void;
  setZoom(zoom: number): void;
  setCenter(center: [number, number]): void;
}

interface AMapMapConstructor {
  new (
    container: HTMLElement,
    options?: { zoom?: number; center?: [number, number]; viewMode?: string; resizeEnable?: boolean },
  ): AMapInstance;
}

interface AMapMarkerConstructor {
  new (options: { position: [number, number]; content?: string; anchor?: string }): AMapOverlay;
}

interface AMapPolylineConstructor {
  new (options: {
    path: [number, number][];
    strokeColor?: string;
    strokeWeight?: number;
    strokeOpacity?: number;
    lineJoin?: string;
    lineCap?: string;
    showDir?: boolean;
  }): AMapOverlay;
}

interface AMapCircleConstructor {
  new (options: {
    center: [number, number];
    radius: number;
    strokeColor?: string;
    strokeOpacity?: number;
    strokeWeight?: number;
    strokeStyle?: string;
    fillColor?: string;
    fillOpacity?: number;
  }): AMapOverlay;
}

export interface AMapNamespace {
  Map: AMapMapConstructor;
  Marker: AMapMarkerConstructor;
  Polyline: AMapPolylineConstructor;
  Circle: AMapCircleConstructor;
}

declare global {
  interface Window {
    AMap?: AMapNamespace;
  }
}

interface AmpRestEnvelope {
  status?: string;
  info?: string;
  geocodes?: { location?: string }[];
  tips?: { name?: string; district?: string; address?: string | string[]; location?: string | string[] }[];
  route?: {
    paths?: { distance?: string; duration?: string; steps?: { polyline?: string }[] }[];
  };
}

let amapNamespace: AMapNamespace | null = null;
let loadPromise: Promise<AMapNamespace> | null = null;
let cachedPosition: AMapPoint | null = null;

const liveMaps: Map<HTMLElement, AMapInstance> = new Map();

export function loadAMap(): Promise<AMapNamespace> {
  if (!AMAP_KEY) return Promise.reject(new Error('AMap key is not configured (VITE_AMAP_KEY)'));
  if (amapNamespace) return Promise.resolve(amapNamespace);
  if (window.AMap) {
    amapNamespace = window.AMap;
    return Promise.resolve(amapNamespace);
  }
  if (!loadPromise) {
    loadPromise = new Promise<AMapNamespace>((resolve, reject) => {
      const script: HTMLScriptElement = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=1.4.15&key=${AMAP_KEY}`;
      const timer: number = window.setTimeout(() => {
        loadPromise = null;
        reject(new Error('AMap 載入超時'));
      }, 15000);
      script.onload = () => {
        window.clearTimeout(timer);
        if (window.AMap) {
          amapNamespace = window.AMap;
          resolve(amapNamespace);
        } else {
          loadPromise = null;
          reject(new Error('AMap 載入失敗'));
        }
      };
      script.onerror = () => {
        window.clearTimeout(timer);
        loadPromise = null;
        reject(new Error('AMap 腳本載入失敗'));
      };
      document.head.append(script);
    });
  }
  return loadPromise;
}

export function getAMapNamespace(): AMapNamespace | null {
  return amapNamespace;
}

export function isMapConfigured(): boolean { return AMAP_KEY.length > 0; }

/** Permission/position failure is unavailable, never a made-up current position. */
export function getCurrentPosition(): Promise<AMapPoint> {
  if (cachedPosition) return Promise.resolve(cachedPosition);
  return new Promise<AMapPoint>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('此瀏覽器不支援定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        cachedPosition = { lng: position.coords.longitude, lat: position.coords.latitude };
        resolve(cachedPosition);
      },
      (error: GeolocationPositionError) => {
        const reason: string = error.code === 1 ? '定位權限被拒絕' : error.code === 3 ? '裝置定位逾時' : '裝置無法提供位置';
        logger.warn(error.code === 1 ? 'position_permission_denied' : error.code === 3 ? 'position_timeout' : 'position_unavailable');
        reject(new Error(reason));
      },
      { timeout: 30000, maximumAge: 300000 },
    );
  });
}

function parseLocation(raw: unknown): AMapPoint | null {
  if (typeof raw !== 'string' || !raw.includes(',')) return null;
  const [lngRaw, latRaw] = raw.split(',');
  const lng: number = Number(lngRaw);
  const lat: number = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

async function ampRest(path: string, params: Record<string, string>): Promise<AmpRestEnvelope> {
  if (!AMAP_KEY) throw new Error('AMap key is not configured (VITE_AMAP_KEY)');
  return new Promise<AmpRestEnvelope>((resolve, reject) => {
    const callbackName = `__memoAmpCb_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const w: Window & Record<string, unknown> = window as unknown as Window & Record<string, unknown>;
    const script: HTMLScriptElement = document.createElement('script');
    const cleanup = (): void => {
      window.clearTimeout(timer);
      delete w[callbackName];
      script.remove();
    };
    const timer: number = window.setTimeout(() => {
      cleanup();
      reject(new Error('高德服務請求超時'));
    }, 10000);
    w[callbackName] = (json: AmpRestEnvelope): void => {
      cleanup();
      resolve(json);
    };
    script.onerror = (): void => {
      cleanup();
      reject(new Error('高德服務請求失敗'));
    };
    const query: URLSearchParams = new URLSearchParams({
      key: AMAP_KEY,
      output: 'JSONP',
      callback: callbackName,
      ...params,
    });
    script.src = `${REST_BASE}/${path}?${query.toString()}`;
    document.head.append(script);
  });
}

export async function geocodeAddress(address: string): Promise<AMapPoint | null> {
  try {
    const json: AmpRestEnvelope = await ampRest('geocode/geo', { address });
    if (json.status !== '1') throw new Error(json.info ?? '高德服務請求失敗');
    const first = json.geocodes?.[0];
    return parseLocation(first?.location) ?? null;
  } catch (error) {
    logger.warn('地址解析失敗', error);
    return null;
  }
}

export async function resolveHomePosition(label: string): Promise<AMapPoint | null> {
  try {
    const tips: AmpTip[] = await searchTips(label);
    const first: AmpTip | undefined = tips.find((tip: AmpTip) => tip.location !== null);
    if (first && first.location) return first.location;
  } catch (error) {
    logger.warn('地點搜索失敗', error);
  }
  return geocodeAddress(label);
}

export async function searchTips(keyword: string): Promise<AmpTip[]> {
  const json: AmpRestEnvelope = await ampRest('assistant/inputtips', {
    keywords: keyword,
    datatype: 'all',
  });
  if (json.status !== '1') throw new Error(json.info ?? '高德服務請求失敗');
  const tips: AmpTip[] = [];
  for (const tip of json.tips ?? []) {
    const name: string = typeof tip.name === 'string' ? tip.name : '';
    if (name.length === 0) continue;
    const address: string = typeof tip.address === 'string' ? tip.address : '';
    tips.push({
      name,
      district: typeof tip.district === 'string' ? tip.district : '',
      address,
      location: parseLocation(tip.location),
    });
  }
  return tips;
}

export async function planRoute(
  mode: 'walking' | 'driving',
  from: AMapPoint,
  to: AMapPoint,
): Promise<AmpRoute | null> {
  try {
    const path: string = mode === 'walking' ? 'direction/walking' : 'direction/driving';
    const json: AmpRestEnvelope = await ampRest(path, {
      origin: `${from.lng},${from.lat}`,
      destination: `${to.lng},${to.lat}`,
    });
    if (json.status !== '1') throw new Error(json.info ?? '高德服務請求失敗');
    const best = json.route?.paths?.[0];
    if (!best) return null;
    const points: AMapPoint[] = [];
    for (const step of best.steps ?? []) {
      if (typeof step.polyline !== 'string') continue;
      for (const pair of step.polyline.split(';')) {
        const point: AMapPoint | null = parseLocation(pair);
        if (point) points.push(point);
      }
    }
    return {
      distanceM: Number(best.distance ?? 0),
      durationS: Number(best.duration ?? 0),
      points,
    };
  } catch (error) {
    logger.warn('路線規劃失敗', error);
    return null;
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))}m`;
  return `${(meters / 1000).toFixed(1)}公里`;
}

export function formatDuration(seconds: number): string {
  const minutes: number = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes}分鐘`;
  return `${Math.floor(minutes / 60)}小時${minutes % 60}分鐘`;
}

export function createMap(container: HTMLElement, center: AMapPoint, zoom: number): AMapInstance {
  const ns: AMapNamespace | null = amapNamespace ?? window.AMap ?? null;
  if (!ns) throw new Error('AMap 未載入');
  const map: AMapInstance = new ns.Map(container, {
    zoom,
    center: [center.lng, center.lat],
    viewMode: '2D',
    resizeEnable: true,
  });
  liveMaps.set(container, map);
  return map;
}

export function getMapFor(container: HTMLElement): AMapInstance | null {
  return liveMaps.get(container) ?? null;
}

export function disposeMaps(): void {
  liveMaps.forEach((map: AMapInstance) => {
    try {
      map.destroy();
    } catch (error) {
      logger.warn('地圖銷毀失敗', error);
    }
  });
  liveMaps.clear();
}

export function createPositionMarker(point: AMapPoint): AMapOverlay | null {
  const ns: AMapNamespace | null = amapNamespace ?? window.AMap ?? null;
  if (!ns) return null;
  return new ns.Marker({
    position: [point.lng, point.lat],
    content: '<div class="map-pin-dot"></div>',
    anchor: 'center',
  });
}

export function createHomeMarker(point: AMapPoint): AMapOverlay | null {
  const ns: AMapNamespace | null = amapNamespace ?? window.AMap ?? null;
  if (!ns) return null;
  return new ns.Marker({
    position: [point.lng, point.lat],
    content: '<div class="map-pin-home">🏠</div>',
    anchor: 'bottom-center',
  });
}

export function createDestMarker(point: AMapPoint): AMapOverlay | null {
  const ns: AMapNamespace | null = amapNamespace ?? window.AMap ?? null;
  if (!ns) return null;
  return new ns.Marker({
    position: [point.lng, point.lat],
    content: '<div class="map-pin-dest">📍</div>',
    anchor: 'bottom-center',
  });
}

export function createRoutePolyline(points: AMapPoint[], color: string): AMapOverlay | null {
  const ns: AMapNamespace | null = amapNamespace ?? window.AMap ?? null;
  if (!ns || points.length === 0) return null;
  return new ns.Polyline({
    path: points.map((point: AMapPoint): [number, number] => [point.lng, point.lat]),
    strokeColor: color,
    strokeWeight: 7,
    strokeOpacity: 0.9,
    lineJoin: 'round',
    lineCap: 'round',
    showDir: true,
  });
}

export function createFenceCircle(center: AMapPoint, radiusM: number): AMapOverlay | null {
  const ns: AMapNamespace | null = amapNamespace ?? window.AMap ?? null;
  if (!ns) return null;
  return new ns.Circle({
    center: [center.lng, center.lat],
    radius: radiusM,
    strokeColor: '#617f2f',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    strokeStyle: 'dashed',
    fillColor: '#86a94e',
    fillOpacity: 0.12,
  });
}

export function zoomForRadius(radiusM: number): number {
  if (radiusM <= 400) return 15.5;
  if (radiusM <= 900) return 14.5;
  return 13.8;
}
