/** Synthetic pure-state tests; do not call providers, use GPS, tokens or a database. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialRouteState, invalidateRoute, beginRoute, matchesRequest, setWheelchair, acceptRoute, selectPlan, selectRideOption, assessmentContext, matchesAssessment } from '../../client/src/pages/MemoPathPage/route-state';
import { routeError, validQuery, point, metric } from '../../client/src/pages/MemoPathPage/route-model';
import type { RouteSelection, RoutePlan, Provenance } from '../../client/src/pages/MemoPathPage/route-model';
import { simulationRoute } from './route-test-data';
const endpoint = { id: 'public', label: 'Public', point: { lng: 0, lat: 0 }, selectionOrigin: 'explicit-public-sample' as const };
const selection: RouteSelection = { origin: endpoint, destination: endpoint, mode: 'transit', sourceMode: 'simulation', sampleId: 'test', wheelchair: {enabled:true,profile:'general-wheelchair'}, selectedPlanId:null, selectedRideOptionIds:{}, selectionVersion:0,accessibilityVersion:0 };
const epoch = { identityGeneration:1,elderGeneration:1,viewGeneration:1,mapGeneration:1,screen:'tripMap',viewRole:'elder',elderId:'',demoMode:true };
const provenance: Provenance = {kind:'simulated',provider:'Synthetic test',sourceTitle:'Synthetic test',sourceUrl:null,referenceId:'test',observedAt:new Date().toISOString(),originalQueriedAt:null,publishedAt:null,updatedAt:null,limitations:['Not a real route']};
function setup() { const s=initialRouteState(); invalidateRoute(s); const c=beginRoute(s,selection,epoch); return {s,c}; }
function plans(requestId:number):RoutePlan[] { return ['A','B'].map(id=>({id,providerPlanIndex:0,requestId,mode:'transit',origin:endpoint,destination:endpoint,provenance,distanceM:null,durationS:null,totalWalkingM:null,metricBasis:'unknown',legs:[],geometry:{fragments:[],coverage:'none',missingParts:[]},transferCount:null,completeness:{missingFields:[],unsupportedParts:[],warnings:[]}})); }
test('zero is legal; missing/coerced metrics and unknown enums rejected',()=>{
  assert.deepEqual(point('0,0'),{lng:0,lat:0}); for(const v of ['',[],false,null,-1,NaN,Infinity]) assert.equal(metric(v),null);
  assert.equal(metric('0'),0); assert.equal(point(',0'),null); assert.equal(point('181,0'),null);
  assert.equal(validQuery({...selection,requestId:1}),true); assert.equal(validQuery({...selection,requestId:1,mode:'taxi'}),false);
});
test('request acquired before resolution; all old success/error contexts rejected',()=>{
  const {s,c}=setup(); assert.equal(c.requestId,1); invalidateRoute(s); assert.equal(matchesRequest(s,c),false);
  assert.equal(acceptRoute(s,c,routeError({...c.query,requestId:c.requestId},'transport','Synthetic failure')),false); assert.equal(s.outcome,null);
});
test('each identity/view/map/source epoch participates; same-screen return is a new epoch',()=>{
  const {s,c}=setup(); for(const k of ['identityGeneration','elderGeneration','viewGeneration','mapGeneration'] as const) assert.equal(matchesRequest(s,{...c,[k]:c[k]+1}),false);
  assert.equal(matchesRequest(s,{...c,demoMode:false}),false); assert.equal(matchesRequest(s,{...c,query:{...c.query,sourceMode:'live'}}),false);
});
test('loading wheelchair toggle does not strand ordinary request',()=>{
  const {s,c}=setup(); setWheelchair(s,false); assert.equal(matchesRequest(s,c),true);
  assert.equal(acceptRoute(s,c,{status:'success',plans:plans(c.requestId),provenance,warnings:[],requestedSourceMode:'simulation',requestAttempt:{status:'not-sent',sentAt:null}}),true);
  assert.equal(s.phase,'success'); assert.equal(s.selection?.wheelchair.enabled,false);
});
test('A→B→A keeps immutable batch/request and rejects first assessment even with equal IDs',()=>{
  const {s,c}=setup(); const batch=plans(c.requestId); acceptRoute(s,c,{status:'success',plans:batch,provenance,warnings:[],requestedSourceMode:'simulation',requestAttempt:{status:'not-sent',sentAt:null}});
  const first=assessmentContext(s)!; const before=JSON.stringify(batch); assert.equal(selectPlan(s,'B'),true); assert.equal(selectPlan(s,'A'),true);
  assert.equal(s.requestId,c.requestId); assert.equal(JSON.stringify(batch),before); assert.equal(matchesAssessment(s,first),false);
  assert.equal(selectPlan(s,'outside'),false); assert.equal(selectRideOption(s,'outside','outside'),false);
  const current=assessmentContext(s)!; setWheelchair(s,true); assert.equal(matchesAssessment(s,current),false);
});
test('preflight failure has no invented source/time and preserves requested source',()=>{
  const {s,c}=setup(); const q={...c.query,sourceMode:'live' as const,requestId:c.requestId};
  for(const category of ['config','invalid-input','position-denied','quota'] as const){const o=routeError(q,category,'Controlled'); assert.equal(o.provenance,null);assert.deepEqual(o.requestAttempt,{status:'not-sent',sentAt:null});assert.equal(o.requestedSourceMode,'live');}
  invalidateRoute(s,true); assert.equal(s.selection,null); assert.equal(s.plans.length,0);
});
test('current request never accepts mismatched source or endpoints',()=>{
 const {s,c}=setup();const outcome={status:'success' as const,plans:plans(c.requestId),provenance,warnings:[],requestedSourceMode:'simulation' as const,requestAttempt:{status:'not-sent' as const,sentAt:null}};
 assert.equal(acceptRoute(s,c,{...outcome,provenance:{...provenance,kind:'live'}}),false);
 const foreign=structuredClone(outcome);foreign.plans[0].destination.point.lng=9;assert.equal(acceptRoute(s,c,foreign),false);
 assert.equal(acceptRoute(s,c,outcome),true);
});

test('every query/context field rejects a foreign reply without changing current state',()=>{
 const {s,c}=setup();const before=JSON.stringify(s);
 const contexts=[{...c,screen:'home'},{...c,viewRole:'family'},{...c,elderId:'another'},
  {...c,query:{...c.query,sampleId:'other'}},{...c,query:{...c.query,mode:'walking' as const}},
  {...c,query:{...c.query,origin:{...endpoint,point:{lng:1,lat:0}}}},
  {...c,query:{...c.query,destination:{...endpoint,point:{lng:0,lat:1}}}}];
 for(const foreign of contexts){assert.equal(acceptRoute(s,foreign,routeError({...foreign.query,requestId:foreign.requestId},'transport','Controlled late failure')),false);assert.equal(JSON.stringify(s),before);}
});

test('a new query rejects old success, no-route and failure; retry uses current inputs',()=>{
 const {s,c}=setup();const old=simulationRoute({...c.query,requestId:c.requestId},'partial');
 invalidateRoute(s);const next=beginRoute(s,{...selection,mode:'walking',destination:{...endpoint,label:'Changed',point:{lng:2,lat:1}}},epoch);
 const snapshot=JSON.stringify(s);
 for(const outcome of [old,{status:'no-route' as const,provenance,requestedSourceMode:'simulation' as const,requestAttempt:{status:'not-sent' as const,sentAt:null}},routeError({...c.query,requestId:c.requestId},'timeout','Controlled')]){
  assert.equal(acceptRoute(s,c,outcome),false);assert.equal(JSON.stringify(s),snapshot);
 }
 assert.equal(next.query.mode,'walking');assert.equal(next.query.destination.point.lng,2);
 assert.equal(acceptRoute(s,next,simulationRoute({...next.query,requestId:next.requestId},'no-route')),true);
 assert.equal(s.phase,'no-route');assert.deepEqual(s.plans,[]);assert.equal(s.selection?.selectedPlanId,null);
});

test('same-leg option roundtrip preserves batch and rejects old assessment',()=>{
 const {s,c}=setup();const outcome=simulationRoute({...c.query,requestId:c.requestId},'partial');assert.equal(acceptRoute(s,c,outcome),true);
 const leg=s.plans[0].legs.find(l=>l.alternatives.length>1)!;const before=JSON.stringify(s.plans);const first=assessmentContext(s)!;
 for(const option of [leg.alternatives[1],leg.alternatives[0]])assert.equal(selectRideOption(s,leg.id,option.id),true);
 assert.equal(s.requestId,c.requestId);assert.equal(JSON.stringify(s.plans),before);assert.equal(matchesAssessment(s,first),false);
 assert.equal(matchesAssessment(s,assessmentContext(s)!),true);
});

test('sent live failure retains attempt while malformed attempt is rejected',()=>{
 const s=initialRouteState();invalidateRoute(s);const c=beginRoute(s,{...selection,sourceMode:'live',sampleId:null},epoch);
 const now=new Date().toISOString();const live:Provenance={...provenance,kind:'live'};
 const failure=routeError({...c.query,requestId:c.requestId},'provider','Controlled rejection',live,now);
 assert.equal(acceptRoute(s,c,{...failure,requestAttempt:{status:'sent',sentAt:null}}),false);
 assert.equal(acceptRoute(s,c,failure),true);assert.equal(s.phase,'error');assert.deepEqual(s.plans,[]);
 assert.equal(s.selection?.sourceMode,'live');assert.equal(s.outcome?.provenance?.kind,'live');
});
