import { logger } from '@/lib/logger';
import { isPositionCacheFresh, POSITION_CACHE_TTL_MS } from './position-cache';
import { normalizeRoute, validQuery, routeError, point as routePoint } from './route-model';
import type { RouteQuery, RouteQueryOutcome, ErrorCategory, Provenance, PolylineFragment } from './route-model';
import { ROUTE_LIVE_REVIEW, simulationRoute, SIMULATION_CASES, type SimulationCase } from './route-preview-data';

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
let cachedPositionAt = 0;
let positionGeneration = 0;

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
export function getCurrentPosition(options: { forceFresh?: boolean } = {}): Promise<AMapPoint> {
  if (options.forceFresh) { positionGeneration += 1; cachedPosition = null; cachedPositionAt = 0; }
  if (cachedPosition && isPositionCacheFresh(cachedPositionAt, Date.now())) return Promise.resolve(cachedPosition);
  cachedPosition = null;
  cachedPositionAt = 0;
  const generation = positionGeneration;
  return new Promise<AMapPoint>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('此瀏覽器不支援定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position: GeolocationPosition) => {
        const point = { lng: position.coords.longitude, lat: position.coords.latitude };
        if (generation === positionGeneration) { cachedPosition = point; cachedPositionAt = Date.now(); }
        resolve(point);
      },
      (error: GeolocationPositionError) => {
        const reason: string = error.code === 1 ? '定位權限被拒絕' : error.code === 3 ? '裝置定位逾時' : '裝置無法提供位置';
        logger.warn(error.code === 1 ? 'position_permission_denied' : error.code === 3 ? 'position_timeout' : 'position_unavailable');
        reject(new Error(reason));
      },
      { timeout: 30000, maximumAge: options.forceFresh ? 0 : POSITION_CACHE_TTL_MS },
    );
  });
}

function parseLocation(raw: unknown): AMapPoint | null {
  if (typeof raw !== 'string' || !raw.includes(',')) return null;
  const parts = raw.split(',').map(part => part.trim());
  if (parts.length !== 2 || parts.some(part => part.length === 0)) return null;
  const [lngRaw, latRaw] = parts;
  const lng: number = Number(lngRaw);
  const lat: number = Number(latRaw);
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
  return { lng, lat };
}

/** Existing JSONP transport, with official output=JSON+callback. Optional cancellation
 * releases script/timer/callback; errors never log secret URLs or key values. */
async function ampRest<T = AmpRestEnvelope>(path: string, params: Record<string, string>, options: { signal?: AbortSignal; onSent?: () => void } = {}): Promise<T> {
  if (!AMAP_KEY) throw new Error('AMap key is not configured (VITE_AMAP_KEY)');
  return new Promise<T>((resolve, reject) => {
    if (options.signal?.aborted) { reject(new Error('Route cancelled')); return; }
    const callbackName = `__memoAmpCb_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    const w: Window & Record<string, unknown> = window as unknown as Window & Record<string, unknown>;
    const script: HTMLScriptElement = document.createElement('script');
    const cleanup = (): void => {
      window.clearTimeout(timer);
      delete w[callbackName];
      script.remove();
      options.signal?.removeEventListener('abort', abort);
    };
    const abort = (): void => { cleanup(); reject(new Error('Route cancelled')); };
    const timer: number = window.setTimeout(() => {
      cleanup();
      reject(new Error('高德服務請求超時'));
    }, 10000);
    w[callbackName] = (json: T): void => {
      cleanup();
      resolve(json);
    };
    script.onerror = (): void => {
      cleanup();
      reject(new Error('高德服務請求失敗'));
    };
    const query: URLSearchParams = new URLSearchParams({
      key: AMAP_KEY,
      output: 'JSON',
      callback: callbackName,
      ...params,
    });
    script.src = `${REST_BASE}/${path}?${query.toString()}`;
    options.signal?.addEventListener('abort', abort, { once: true });
    document.head.append(script);
    options.onSent?.();
  });
}

/** New frontend-only route interface. Keep legacy planRoute/formatters unchanged.
 * Validates before sending, records real attempts only on dispatch, never retries or
 * silently substitutes simulation. Account review blocks only new live route calls. */
export async function queryRoute(query: RouteQuery, options: { signal?: AbortSignal } = {}): Promise<RouteQueryOutcome> {
  if (!validQuery(query)) return routeError(query, 'invalid-input', '請明確選定有效起終點與方式');
  if (query.sourceMode === 'simulation') {
    if (!SIMULATION_CASES.includes(query.sampleId as SimulationCase)) return routeError(query, 'invalid-input', '未知模擬情境');
    return simulationRoute(query, query.sampleId as SimulationCase);
  }
  if (query.sourceMode === 'replay') return {status:'not-implemented',reason:'沒有合法完整歷史payload；001文字證據不能冒充可執行回放',mode:query.mode,sourceMode:'replay',requestedSourceMode:'replay',provenance:null,requestAttempt:{status:'not-sent',sentAt:null}};
  if (!AMAP_KEY) return routeError(query, 'config', '尚未配置高德Key');
  if (!ROUTE_LIVE_REVIEW.allowed) return routeError(query, 'config', ROUTE_LIVE_REVIEW.reason);
  let sentAt: string | null = null;
  let provenance: Provenance | null = null;
  try {
    const params: Record<string,string> = { origin:`${query.origin.point.lng},${query.origin.point.lat}`,destination:`${query.destination.point.lng},${query.destination.point.lat}`,...(query.mode==='transit'?{city:'香港',cityd:'香港',extensions:'all'}:{}) };
    const raw = await ampRest<unknown>(`direction/${query.mode==='transit'?'transit/integrated':query.mode}`,params,{signal:options.signal,onSent:()=>{sentAt=new Date().toISOString();provenance={kind:'live',provider:'高德',sourceTitle:'當次路線查詢嘗試',sourceUrl:null,referenceId:`request:${query.requestId}`,observedAt:sentAt,originalQueriedAt:null,publishedAt:null,updatedAt:null,limitations:['供應商估計不證明輪椅可達']};}});
    return normalizeRoute(raw,query,provenance!,sentAt);
  } catch(error) {
    const category:ErrorCategory=error instanceof Error&&error.message==='高德服務請求超時'?'timeout':'transport';
    return routeError(query,category,'路線查詢未完成，請重試或修改選擇',provenance,sentAt);
  }
}

/** New explicit HK public-point search. No first-result guessing or retry; quota
 * review applies before dispatch. Existing searchTips contract stays unchanged. */
export async function searchPublicRouteTips(keyword:string,signal?:AbortSignal):Promise<AmpTip[]>{
  if(typeof keyword!=='string'||!keyword.trim()||keyword.length>200)throw new Error('請輸入有效公共地點名稱');
  if(!ROUTE_LIVE_REVIEW.allowed)throw new Error(ROUTE_LIVE_REVIEW.reason);
  const json=await ampRest<AmpRestEnvelope>('assistant/inputtips',{keywords:keyword,city:'香港',citylimit:'true',datatype:'all'},{signal});
  if(json.status!=='1'||!Array.isArray(json.tips))throw new Error('公共地點搜索未完成');
  return json.tips.filter(t=>typeof t.name==='string'&&t.name.length>0&&t.name.length<=200).map(t=>({name:t.name!,district:typeof t.district==='string'?t.district:'',address:typeof t.address==='string'?t.address:'',location:parseLocation(t.location)}));
}

/** Draw only supplied valid fragments; no links across gaps or candidates. */
export function createRouteFragments(fragments: PolylineFragment[], color: string): AMapOverlay[] {
  return fragments.filter(f=>f.points.length>=2&&f.points.every(p=>routePoint(p)!==null)).map(f=>createRoutePolyline(f.points,color)).filter((o):o is AMapOverlay=>o!==null);
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
  positionGeneration += 1;
  cachedPosition = null;
  cachedPositionAt = 0;
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
