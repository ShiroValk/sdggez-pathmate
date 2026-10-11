/** Frontend route contracts and trust-boundary helpers. No DOM, storage, identity or
 * provider calls. Nullable fields require runtime validation even without strictNullChecks. */
export type RouteMode = 'walking' | 'driving' | 'transit';
export type SourceMode = 'live' | 'replay' | 'simulation';
export interface RoutePoint { lng: number; lat: number }
export interface Endpoint { id: string; label: string; point: RoutePoint; selectionOrigin: 'public-search' | 'device' | 'explicit-public-sample' }
export interface WheelchairRequirement { enabled: boolean; profile: 'general-wheelchair' }
export interface Provenance {
  kind: 'live' | 'static' | 'simulated'; subtype?: 'facility-summary' | 'historical-replay';
  provider: string; sourceTitle: string; sourceUrl: string | null; referenceId: string | null;
  observedAt: string; originalQueriedAt: string | null; publishedAt: string | null;
  updatedAt: string | null; limitations: string[];
}
export interface ImplementationStatus { status: 'implemented' | 'not-implemented' | 'deferred'; reason: string }
export interface MissingField { path: string; reason: 'not-provided' | 'invalid' | 'unsupported' }
export interface QuerySnapshot { origin: Endpoint; destination: Endpoint; mode: RouteMode; sourceMode: SourceMode; sampleId: string | null }
export interface RouteSelection extends QuerySnapshot {
  wheelchair: WheelchairRequirement; selectedPlanId: string | null; selectedRideOptionIds: Record<string, string>;
  selectionVersion: number; accessibilityVersion: number;
}
export interface RequestContext {
  requestId: number; query: QuerySnapshot; identityGeneration: number; elderGeneration: number;
  viewGeneration: number; mapGeneration: number; screen: string; viewRole: string; elderId: string; demoMode: boolean;
}
export interface RouteQuery extends QuerySnapshot { requestId: number }
export interface RequestAttempt { status: 'not-sent' | 'sent'; sentAt: string | null }
export type ErrorCategory = 'invalid-input' | 'config' | 'position-denied' | 'position-timeout' | 'position-unavailable' | 'transport' | 'timeout' | 'provider' | 'permission' | 'quota' | 'invalid-response' | 'unknown';
interface OutcomeBase { requestedSourceMode: SourceMode; requestAttempt: RequestAttempt }
export type RouteQueryOutcome = OutcomeBase & (
  { status: 'success'; plans: RoutePlan[]; provenance: Provenance; warnings: string[] } |
  { status: 'no-route'; provenance: Provenance } |
  { status: 'error'; category: ErrorCategory; message: string; provenance: Provenance | null } |
  { status: 'not-implemented'; reason: string; mode: RouteMode; sourceMode: SourceMode; provenance: null }
);
export interface PolylineFragment { legId: string; stepIndex: number; optionId: string | null; points: RoutePoint[]; fragmentIndex: number }
export interface RouteStep { order: number; instruction: string | null; road: string | null; distanceM: number | null; durationS: number | null; geometry: PolylineFragment[] }
export interface RouteStop { name: string | null; id: string | null; point: RoutePoint | null }
export interface RideOption {
  id: string; providerLineId: string | null; name: string | null; transportType: string | null;
  departureStop: RouteStop; arrivalStop: RouteStop; distanceM: number | null; durationS: number | null;
  geometry: PolylineFragment[]; viaStops: RouteStop[]; sourceIndex: number;
}
export interface RouteLeg {
  id: string; order: number; providerSegmentIndex: number; kind: 'walk' | 'drive' | 'ride' | 'unknown';
  role: 'access' | 'transfer' | 'egress' | 'route' | 'unknown'; distanceM: number | null; durationS: number | null;
  steps: RouteStep[]; geometry: PolylineFragment[]; missingFields: MissingField[];
  entrance: RouteStop; exit: RouteStop; alternatives: RideOption[];
}
export interface RoutePlan {
  id: string; providerPlanIndex: number; requestId: number; mode: RouteMode; origin: Endpoint; destination: Endpoint;
  provenance: Provenance; distanceM: number | null; durationS: number | null; totalWalkingM: number | null;
  metricBasis: 'provider' | 'derived-complete' | 'unknown'; legs: RouteLeg[];
  geometry: { fragments: PolylineFragment[]; coverage: 'provided' | 'partial' | 'none'; missingParts: string[] };
  transferCount: number | null; completeness: { missingFields: MissingField[]; unsupportedParts: string[]; warnings: string[] };
}
export interface RoutePresentation extends RoutePlan {
  selectionVersion: number; selectedPlanId: string; selectedRideOptionIds: Record<string, string>;
}
export type Component = 'street' | 'crossing' | 'entrance' | 'lift-ramp' | 'station-platform' | 'vehicle' | 'boarding' | 'alighting' | 'access' | 'transfer' | 'egress' | 'drop-off' | 'parking';
export interface SourceDate { value: string; precision: 'date' | 'datetime'; timezone: string | null }
export interface DateAssessment {
  published: SourceDate | null; updated: SourceDate | null; validFrom: SourceDate | null; validUntil: SourceDate | null;
  reviewedAt: string; status: 'known-date' | 'no-date' | 'expired' | 'conflicting'; basisNotes: string;
}
export interface Assistance {
  required: boolean; type: 'staff-portable-ramp' | 'other'; instructions: string;
  availabilityEvidenceIds: string[]; availability: 'applicable-confirmed' | 'conditional' | 'unknown' | 'unavailable'; bookingStatus: 'not-booked';
}
export interface Evidence {
  id: string; provenance: Provenance;
  subject: { stationId?: string; facilityId?: string; entrance?: string; legId?: string; rideOptionId?: string; routeSampleId?: string };
  matchLevel: 'exact-leg' | 'exact-facility' | 'background' | 'unmatched'; scopeComponents: Component[];
  claim: string; conditions: string[]; assistance: Assistance; dateAssessment: DateAssessment;
  conflictGroup: string | null; knownBarrier: string | null; limitations: string[];
  usageReview: { checkedAt: string; allowed: boolean; notes: string };
}
export interface AccessibilityConclusion {
  profile: 'general-wheelchair'; enabled: boolean; requestId: number; selectionVersion: number; accessibilityVersion: number;
  routePlanId: string; selectedRideOptionIds: Record<string, string>; evaluatedAt: string; evidenceIds: string[];
  status: 'confirmed' | 'partial' | 'insufficient'; supportedComponents: Component[]; gaps: { component: Component; reason: string }[];
  knownBarriers: string[]; assistanceConditions: string[]; freshnessWarnings: string[]; simulated: boolean;
}
export interface DeliveryScopeRow {
  requirementId: string; featureSlice: string; implementationStatus: ImplementationStatus; sourceKinds: Provenance['kind'][];
  verificationStatus: 'passed' | 'failed' | 'not-run' | 'blocked' | 'accepted-deferred'; evidenceIds: string[];
  reason: string; impact: string; followupConditions: string;
}

/** Objects only; arrays/null never masquerade as provider records. */
export function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
/** Nonempty bounded text; consumers must render as text or escape HTML. */
export function textField(value: unknown, max = 1000): string | null { return typeof value === 'string' && value.trim().length > 0 && value.length <= max ? value.trim() : null; }
/** Parse finite nonnegative numbers without coercing arrays, booleans or blank to zero. */
export function metric(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || value.trim() === '')) return null;
  const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : null;
}
/** Validate coordinate objects/string pairs, preserving legal zero. */
export function point(value: unknown): RoutePoint | null {
  const r = typeof value === 'string' ? value.split(',') : null;
  if (r && (r.length !== 2 || r.some(s => s.trim() === ''))) return null;
  const o = record(value); const values = r ?? [o.lng, o.lat];
  if (values.some(v => (typeof v !== 'number' && typeof v !== 'string') || String(v).trim() === '')) return null;
  const [lng, lat] = values.map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90 ? { lng, lat } : null;
}
/** Validate public/local inputs before query construction; rejects unknown enum values. */
export function validQuery(value: unknown): value is RouteQuery {
  const q = record(value);
  const endpoint = (v: unknown): boolean => { const e = record(v); return !!textField(e.id, 200) && !!textField(e.label, 200) && !!point(e.point) && ['public-search', 'device', 'explicit-public-sample'].includes(String(e.selectionOrigin)); };
  return endpoint(q.origin) && endpoint(q.destination) && typeof q.mode === 'string' && ['walking', 'driving', 'transit'].includes(q.mode) && typeof q.sourceMode === 'string' && ['live', 'replay', 'simulation'].includes(q.sourceMode) && Number.isSafeInteger(q.requestId) && Number(q.requestId) > 0 && (q.sampleId === null || !!textField(q.sampleId, 200));
}
/** Validate source independently of route mode/demo identity. */
export function validProvenance(value: unknown): value is Provenance {
  const p = record(value);
  return ['live', 'static', 'simulated'].includes(String(p.kind)) && (p.kind !== 'static' || ['facility-summary', 'historical-replay'].includes(String(p.subtype))) && !!textField(p.provider) && !!textField(p.sourceTitle) && typeof p.observedAt === 'string' && Number.isFinite(Date.parse(p.observedAt)) && (p.sourceUrl === null || (typeof p.sourceUrl === 'string' && /^https:\/\//.test(p.sourceUrl))) && (p.referenceId === null || !!textField(p.referenceId)) && (p.sourceUrl !== null || p.referenceId !== null) && [p.originalQueriedAt,p.publishedAt,p.updatedAt].every(v => v === null || (typeof v === 'string' && Number.isFinite(Date.parse(v)))) && (p.subtype !== 'historical-replay' || p.originalQueriedAt !== null) && Array.isArray(p.limitations) && p.limitations.every(v => !!textField(v));
}
/** Preflight errors have no invented provider source or time. */
export function routeError(query: RouteQuery, category: ErrorCategory, message: string, provenance: Provenance | null = null, sentAt: string | null = null): RouteQueryOutcome {
  return { status: 'error', category, message, provenance, requestedSourceMode: query.sourceMode, requestAttempt: { status: sentAt === null ? 'not-sent' : 'sent', sentAt } };
}
/** Reject invented sent times and invalid completion/source states at the adapter boundary. */
export function validAttempt(value: unknown): value is RequestAttempt {
  const a = record(value); return (a.status === 'not-sent' && a.sentAt === null) || (a.status === 'sent' && typeof a.sentAt === 'string' && Number.isFinite(Date.parse(a.sentAt)));
}
/** Completion status is independent of live/static/simulated; deferred needs a reason. */
export function validImplementationStatus(value: unknown): value is ImplementationStatus {
  const s = record(value); return ['implemented','not-implemented','deferred'].includes(String(s.status)) && typeof s.reason === 'string' && s.reason.length <= 1000 && (s.status === 'implemented' || s.reason.trim().length > 0);
}

/** Split provider geometry at every invalid point; never connect across a hole. */
export function splitPolyline(raw: unknown, legId: string, stepIndex: number, optionId: string | null): PolylineFragment[] {
  if (typeof raw !== 'string' || raw.length > 500000) return [];
  const fragments: PolylineFragment[] = []; let points: RoutePoint[] = [];
  const flush = (): void => { if (points.length >= 2) fragments.push({legId,stepIndex,optionId,points,fragmentIndex:fragments.length}); points=[]; };
  for (const pair of raw.split(';')) { const p=point(pair); if(p) points.push(p); else flush(); } flush(); return fragments;
}
const emptyStop = (): RouteStop => ({name:null,id:null,point:null});
function stop(raw: unknown): RouteStop { const s=record(raw); return { name:textField(s.name),id:textField(s.id,200),point:point(s.location) }; }
function missing(raw: unknown, path: string, gaps: MissingField[]): number | null { const n=metric(raw);if(n===null)gaps.push({path,reason:raw===undefined||raw===null?'not-provided':'invalid'});return n; }
function geometry(raw: unknown, legId:string, stepIndex:number, optionId:string|null,gaps:MissingField[]):PolylineFragment[]{
  const result=splitPolyline(raw,legId,stepIndex,optionId);
  if(typeof raw!=='string'||!result.length)gaps.push({path:`${legId}.geometry.${stepIndex}`,reason:raw===undefined?'not-provided':'invalid'});
  else if(raw.split(';').some(p=>!point(p)))gaps.push({path:`${legId}.geometry.${stepIndex}`,reason:'invalid'});
  return result;
}
function steps(raw:unknown,legId:string,gaps:MissingField[]):RouteStep[]{
 if(!Array.isArray(raw)){gaps.push({path:`${legId}.steps`,reason:'not-provided'});return [];}
 if(!raw.length)gaps.push({path:`${legId}.steps`,reason:'not-provided'});
 return raw.map((v,i)=>{const s=record(v);const instruction=textField(s.instruction);if(!instruction)gaps.push({path:`${legId}.steps.${i}.instruction`,reason:'not-provided'});return {order:i,instruction,road:textField(s.road),distanceM:missing(s.distance,`${legId}.steps.${i}.distance`,gaps),durationS:missing(s.duration,`${legId}.steps.${i}.duration`,gaps),geometry:geometry(s.polyline,legId,i,null,gaps)};});
}
function baseLeg(id:string,order:number,index:number,kind:RouteLeg['kind']):RouteLeg {return {id,order,providerSegmentIndex:index,kind,role:kind==='drive'?'route':'unknown',distanceM:null,durationS:null,steps:[],geometry:[],missingFields:[],entrance:emptyStop(),exit:emptyStop(),alternatives:[]};}
function walkLeg(raw:unknown,id:string,order:number,index:number,kind:'walk'|'drive'):RouteLeg {
 const r=record(raw),l=baseLeg(id,order,index,kind);l.steps=steps(r.steps,id,l.missingFields);l.geometry=l.steps.flatMap(s=>s.geometry);
 l.distanceM=missing(r.distance,`${id}.distance`,l.missingFields);l.durationS=missing(r.duration,`${id}.duration`,l.missingFields);return l;
}
function option(raw:unknown,id:string,legId:string,index:number,gaps:MissingField[],rail=false):RideOption|null{
 const r=record(raw);if(!Object.keys(r).length)return null;
 const o:RideOption={id,providerLineId:textField(r.id,200),name:textField(r.name),transportType:textField(r.type)??(rail?'rail':null),departureStop:stop(r.departure_stop),arrivalStop:stop(r.arrival_stop),distanceM:missing(r.distance,`${id}.distance`,gaps),durationS:missing(r.duration,`${id}.duration`,gaps),geometry:geometry(r.polyline,legId,index,id,gaps),viaStops:Array.isArray(r.via_stops)?r.via_stops.map(stop):[],sourceIndex:index};
 if(!o.name)gaps.push({path:`${id}.name`,reason:'not-provided'});for(const key of ['departureStop','arrivalStop'] as const)if(!o[key].name)gaps.push({path:`${id}.${key}.name`,reason:'not-provided'});return o;
}
function transitLegs(raw:unknown,id:string,gaps:MissingField[],unsupported:string[]):RouteLeg[]{
 if(!Array.isArray(raw)){gaps.push({path:`${id}.segments`,reason:'not-provided'});return [];}
 const result:RouteLeg[]=[];
 for(let i=0;i<raw.length;i++){
  const s=record(raw[i]),walk=record(s.walking),bus=record(s.bus),rail=record(s.railway);
  if(Object.keys(walk).length)result.push(walkLeg(walk,`${id}:walk:${i}`,result.length,i,'walk'));
  const lines=Array.isArray(bus.buslines)?bus.buslines:[];const hasRail=Object.keys(rail).length>0;
  const unknown=(!Object.keys(s).length)||(Object.keys(bus).length>0&&!Array.isArray(bus.buslines))||(lines.length>0&&hasRail)||['taxi','coach'].some(k=>Object.keys(record(s[k])).length>0);
  if(unknown){const l=baseLeg(`${id}:unknown:${i}`,result.length,i,'unknown');l.missingFields.push({path:l.id,reason:'unsupported'});result.push(l);unsupported.push(l.id);continue;}
  const candidates=hasRail?[rail]:lines;
  if(candidates.length){const l=baseLeg(`${id}:ride:${i}`,result.length,i,'ride');l.alternatives=candidates.map((r,j)=>option(r,`${l.id}:option:${j}`,l.id,j,l.missingFields,hasRail)).filter((r):r is RideOption=>r!==null);
   if(!l.alternatives.length){l.kind='unknown';unsupported.push(l.id);}else{const first=l.alternatives[0];l.distanceM=first.distanceM;l.durationS=first.durationS;l.geometry=first.geometry;l.entrance=first.departureStop;l.exit=first.arrivalStop;}result.push(l);
  }else if(!Object.keys(walk).length){const l=baseLeg(`${id}:unknown:${i}`,result.length,i,'unknown');result.push(l);unsupported.push(l.id);}
 }
 const rides=result.filter(l=>l.kind==='ride').map(l=>l.order);
 for(const l of result)if(l.kind==='walk')l.role=!rides.length?'route':l.order<rides[0]?'access':l.order>rides[rides.length-1]?'egress':'transfer';
 if(rides.length){if(!result.some(l=>l.role==='access'))gaps.push({path:`${id}.access`,reason:'not-provided'});if(!result.some(l=>l.role==='egress'))gaps.push({path:`${id}.egress`,reason:'not-provided'});}
 return result;
}
/** Provider normalization: errors and malformed/missing arrays never become no-route.
 * Individual damaged plans are isolated; successful partial plans expose every gap.
 * No network, inferred routing, identity or HTML rendering here. */
export function normalizeRoute(raw:unknown,query:RouteQuery,provenance:Provenance,sentAt:string|null=null):RouteQueryOutcome{
 if(!validQuery(query)||!validProvenance(provenance))return routeError(query,'invalid-input','Invalid route query/source');
 const json=record(raw);if(json.status!=='1')return routeError(query,json.status==='0'?'provider':'invalid-response','Provider returned no valid success status',provenance,sentAt);
 const route=record(json.route),collection=query.mode==='transit'?route.transits:route.paths;
 if(!Array.isArray(collection))return routeError(query,'invalid-response','Route collection not provided or malformed',provenance,sentAt);
 const base={requestedSourceMode:query.sourceMode,requestAttempt:{status:sentAt===null?'not-sent' as const:'sent' as const,sentAt}};
 if(!collection.length)return {status:'no-route',provenance,...base};
 const plans:RoutePlan[]=[],warnings:string[]=[];
 collection.forEach((v,index)=>{
  const r=record(v);if(!Object.keys(r).length||!['distance','duration','steps','segments'].some(k=>k in r)){warnings.push(`Invalid plan ${index}`);return;}
  const id=`${query.requestId}:plan:${index}`,gaps:MissingField[]=[],unsupported:string[]=[];
  const legs=query.mode==='transit'?transitLegs(r.segments,id,gaps,unsupported):[walkLeg(r,`${id}:leg:0`,0,0,query.mode==='walking'?'walk':'drive')];
  if(query.mode==='walking')legs[0].role='route';
  let distanceM=missing(r.distance,`${id}.distance`,gaps),basis:RoutePlan['metricBasis']=distanceM===null?'unknown':'provider';
  if(distanceM===null&&legs.length&&legs.every(l=>l.kind!=='unknown'&&l.distanceM!==null)){distanceM=legs.reduce((sum,l)=>sum+l.distanceM!,0);basis='derived-complete';}
  const durationS=missing(r.duration,`${id}.duration`,gaps),allGaps=[...gaps,...legs.flatMap(l=>l.missingFields)];
  const fragments=legs.flatMap(l=>l.geometry),missingParts=allGaps.filter(g=>g.path.includes('geometry')||g.path.includes('steps')||g.path.includes('segments')).map(g=>g.path);
  const plan:RoutePlan={id,providerPlanIndex:index,requestId:query.requestId,mode:query.mode,origin:structuredClone(query.origin),destination:structuredClone(query.destination),provenance:structuredClone(provenance),distanceM,durationS,totalWalkingM:query.mode==='transit'?metric(r.walking_distance):null,metricBasis:basis,legs,geometry:{fragments,coverage:!fragments.length?'none':missingParts.length||unsupported.length?'partial':'provided',missingParts},transferCount:query.mode!=='transit'?0:legs.length&&legs.every(l=>l.kind!=='unknown')?Math.max(0,legs.filter(l=>l.kind==='ride').length-1):null,completeness:{missingFields:allGaps,unsupportedParts:unsupported,warnings:[]}};
  plans.push(plan);
 });
 return plans.length?{status:'success',plans,provenance,warnings,...base}:routeError(query,'invalid-response','No parseable route plans',provenance,sentAt);
}
/** Derive chosen alternative without modifying original provider batch. Totals from a
 * different selection are discarded; ETA is never guessed by adding ride times. */
export function presentRoute(plan:RoutePlan,selectionVersion:number,options:Record<string,string>):RoutePresentation{
 const p=structuredClone(plan);let changed=false;
 for(const [legId,optionId] of Object.entries(options)){const leg=p.legs.find(l=>l.id===legId);const option=leg?.alternatives.find(o=>o.id===optionId);if(!leg||!option)throw new Error('Option not in selected plan');if(leg.alternatives[0]?.id!==optionId)changed=true;
  leg.distanceM=option.distanceM;leg.durationS=option.durationS;leg.geometry=option.geometry;leg.entrance=option.departureStop;leg.exit=option.arrivalStop;
 }
 if(changed){p.durationS=null;p.distanceM=p.legs.length&&p.legs.every(l=>l.kind!=='unknown'&&l.distanceM!==null)?p.legs.reduce((n,l)=>n+l.distanceM!,0):null;p.metricBasis=p.distanceM===null?'unknown':'derived-complete';p.completeness.missingFields.push({path:'selection.duration',reason:'not-provided'});if(p.distanceM===null)p.completeness.missingFields.push({path:'selection.distance',reason:'not-provided'});}
 p.geometry.fragments=p.legs.flatMap(l=>l.geometry);p.geometry.coverage=p.geometry.fragments.length?(p.geometry.missingParts.length||p.completeness.unsupportedParts.length?'partial':'provided'):'none';
 return {...p,selectionVersion,selectedPlanId:plan.id,selectedRideOptionIds:{...options}};
}
