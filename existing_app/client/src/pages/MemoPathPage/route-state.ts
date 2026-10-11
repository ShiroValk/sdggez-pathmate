/** Pure route/assessment epochs. The engine supplies serializable context; token and
 * actual map-instance matching stay there. No provider, DOM, identity or persistence side effects. */
import type { RequestContext, RouteQueryOutcome, RouteSelection, RoutePlan } from './route-model';
import { validQuery,validAttempt,validProvenance } from './route-model';
export type QueryPhase = 'idle' | 'resolving' | 'loading' | 'success' | 'no-route' | 'error' | 'not-implemented';
export interface RouteState { requestId: number; phase: QueryPhase; selection: RouteSelection | null; context: RequestContext | null; outcome: RouteQueryOutcome | null; plans: RoutePlan[]; selectionVersion: number; accessibilityVersion: number }
export interface AssessmentContext { request: RequestContext; selectionVersion: number; accessibilityVersion: number; planId: string; options: Record<string,string> }
/** Fresh in-memory state only. */
export function initialRouteState(): RouteState { return { requestId: 0, phase: 'idle', selection: null, context: null, outcome: null, plans: [], selectionVersion: 0, accessibilityVersion: 0 }; }
/** Invalidate before ANY await (including location/search). Keeps selected inputs unless leaving identity/view. */
export function invalidateRoute(state: RouteState, clearInputs = false): void {
  state.requestId++; state.selectionVersion++; state.accessibilityVersion++; state.phase = 'idle'; state.context = null; state.outcome = null; state.plans = [];
  if (clearInputs) state.selection = null;
  else if (state.selection) { state.selection.selectedPlanId = null; state.selection.selectedRideOptionIds = {}; syncVersions(state); }
}
function syncVersions(state: RouteState): void { if (state.selection) { state.selection.selectionVersion = state.selectionVersion; state.selection.accessibilityVersion = state.accessibilityVersion; } }
/** Start validated query under the already-created request id. Returns immutable snapshot. */
export function beginRoute(state: RouteState, selection: RouteSelection, context: Omit<RequestContext,'query'|'requestId'>): RequestContext {
  const query = { origin: selection.origin, destination: selection.destination, mode: selection.mode, sourceMode: selection.sourceMode, sampleId: selection.sampleId };
  if (!validQuery({ ...query, requestId: state.requestId }) || typeof selection.wheelchair?.enabled !== 'boolean' || selection.wheelchair.profile !== 'general-wheelchair') throw new Error('Invalid route selection');
  state.selection = structuredClone(selection); syncVersions(state); state.phase = 'loading';
  state.context = structuredClone({ ...context, requestId: state.requestId, query });
  return structuredClone(state.context);
}
/** Full context comparison deliberately excludes UI selection/wheelchair epochs. */
export function matchesRequest(state: RouteState, context: RequestContext): boolean {
  return !!state.context && state.requestId === context.requestId && JSON.stringify(state.context) === JSON.stringify(context);
}
/** Accept current outcomes only; failures never restore old plans or change sourceMode. */
export function acceptRoute(state: RouteState, context: RequestContext, outcome: RouteQueryOutcome): boolean {
  if (!matchesRequest(state, context)) return false;
  if (outcome.requestedSourceMode !== context.query.sourceMode) return false;
  if (!validAttempt(outcome.requestAttempt)) return false;
  const source=context.query.sourceMode;
  const matchesSource=(p:RoutePlan['provenance']):boolean=>validProvenance(p)&&(source==='live'?p.kind==='live':source==='simulation'?p.kind==='simulated':p.kind==='static'&&p.subtype==='historical-replay');
  if (outcome.provenance!==null&&(!matchesSource(outcome.provenance)||(source==='live'&&outcome.requestAttempt.status!=='sent'))) return false;
  if (outcome.status==='success'&&outcome.plans.some(p=>!matchesSource(p.provenance)||JSON.stringify(p.origin)!==JSON.stringify(context.query.origin)||JSON.stringify(p.destination)!==JSON.stringify(context.query.destination))) return false;
  if (outcome.status === 'success' && (!outcome.plans.length || outcome.plans.some(p => p.requestId !== context.requestId || p.mode !== context.query.mode))) return false;
  state.outcome = outcome; state.phase = outcome.status; state.plans = outcome.status === 'success' ? outcome.plans : [];
  if (state.selection) { state.selection.selectedPlanId = null; state.selection.selectedRideOptionIds = {}; }
  if (state.plans.length) selectPlan(state, state.plans[0].id);
  return true;
}
/** Select current-batch plan; initializes valid alternatives without mutating provider result. */
export function selectPlan(state: RouteState, id: string): boolean {
  const plan = state.phase === 'success' ? state.plans.find(p => p.id === id) : null;
  if (!plan || !state.selection || plan.requestId !== state.requestId) return false;
  state.selection.selectedPlanId = id; state.selection.selectedRideOptionIds = {};
  for (const leg of plan.legs) if (leg.kind === 'ride' && leg.alternatives.length) state.selection.selectedRideOptionIds[leg.id] = leg.alternatives[0].id;
  state.selectionVersion++; state.accessibilityVersion++; syncVersions(state); return true;
}
/** Same-leg choice cannot increase ride count or initiate a provider query. */
export function selectRideOption(state: RouteState, legId: string, optionId: string): boolean {
  if (!state.selection || state.phase !== 'success') return false;
  const plan = state.plans.find(p => p.id === state.selection.selectedPlanId);
  const leg = plan?.legs.find(l => l.id === legId);
  if (!leg || !leg.alternatives.some(o => o.id === optionId)) return false;
  state.selection.selectedRideOptionIds[legId] = optionId; state.selectionVersion++; state.accessibilityVersion++; syncVersions(state); return true;
}
/** Requirement/evidence changes do not invalidate an in-flight ordinary route. */
export function setWheelchair(state: RouteState, enabled: boolean): void {
  if (typeof enabled !== 'boolean') throw new Error('Invalid wheelchair requirement');
  if (state.selection) state.selection.wheelchair.enabled = enabled;
  state.accessibilityVersion++; syncVersions(state);
}
/** Capture selection AND assessment epochs so A→B→A cannot admit the first A's reply. */
export function assessmentContext(state: RouteState): AssessmentContext | null {
  if (!state.context || !state.selection?.selectedPlanId || state.phase !== 'success') return null;
  return structuredClone({ request: state.context, selectionVersion: state.selectionVersion, accessibilityVersion: state.accessibilityVersion, planId: state.selection.selectedPlanId, options: state.selection.selectedRideOptionIds });
}
/** False on any route/selection/evidence/identity epoch change. */
export function matchesAssessment(state: RouteState, context: AssessmentContext): boolean {
  const current = assessmentContext(state); return !!current && matchesRequest(state, context.request) && JSON.stringify(current) === JSON.stringify(context);
}
