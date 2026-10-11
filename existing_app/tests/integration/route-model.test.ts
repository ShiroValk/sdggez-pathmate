/** Provider-shaped synthetic inputs exercise parsing only, never real HK coverage. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoute, presentRoute, splitPolyline, validProvenance, validAttempt } from '../../client/src/pages/MemoPathPage/route-model';
import type { RouteQuery, Provenance } from '../../client/src/pages/MemoPathPage/route-model';
const endpoint = {id:'public',label:'Public',point:{lng:0,lat:0},selectionOrigin:'explicit-public-sample' as const};
const query:RouteQuery={origin:endpoint,destination:endpoint,mode:'walking',sourceMode:'simulation',sampleId:'test',requestId:1};
const provenance:Provenance={kind:'simulated',provider:'Synthetic',sourceTitle:'Synthetic',sourceUrl:null,referenceId:'test',observedAt:new Date().toISOString(),originalQueriedAt:null,publishedAt:null,updatedAt:null,limitations:['Synthetic only']};
test('zero preserved; missing steps/metrics explicit and provider errors never no-route',()=>{
 const o=normalizeRoute({status:'1',route:{paths:[{distance:'0',duration:[],steps:[{instruction:'<script>bad</script>',polyline:'0,0;1,1;bad;2,2;3,3'}]}]}},query,provenance);
 assert.equal(o.status,'success');if(o.status!=='success')return; const p=o.plans[0];assert.equal(p.distanceM,0);assert.equal(p.durationS,null);assert.equal(p.geometry.fragments.length,2);assert.equal(p.geometry.coverage,'partial');assert.ok(p.completeness.missingFields.length);
 assert.equal(normalizeRoute({status:'0',info:'bad'},query,provenance).status,'error');
 assert.equal(normalizeRoute({status:'1',route:{paths:[]}},query,provenance).status,'no-route');
 for(const route of [{}, {paths:null},{paths:[{}]},{paths:'bad'}]) assert.equal(normalizeRoute({status:'1',route},query,provenance).status,'error');
});
test('geometry never bridges malformed points or absent steps; isolated points are not lines',()=>{
 assert.equal(splitPolyline('0,0;bad;1,1','leg',0,null).length,0);
 assert.equal(splitPolyline('0,0;1,1;bad;2,2;3,3','leg',0,null).length,2);
 assert.equal(splitPolyline('','leg',0,null).length,0);
});
test('transit segment alternatives are one ride; transfer order and selected totals truthful',()=>{
 const walk={distance:'1',duration:'1',steps:[{instruction:'Synthetic walk',polyline:'0,0;1,1'}]};
 const line=(name:string)=>({name,departure_stop:{name:'from',location:'1,1'},arrival_stop:{name:'to',location:'2,2'},distance:'10',duration:'20',polyline:'1,1;2,2'});
 const raw={status:'1',route:{distance:'999',transits:[{distance:'30',duration:'60',walking_distance:'3',segments:[{walking:walk,bus:{buslines:[line('E42'),line('E42C')]}},{walking:walk,bus:{buslines:[line('S64')]}},{walking:walk}]}]}};
 const o=normalizeRoute(raw,{...query,mode:'transit'},provenance);assert.equal(o.status,'success');if(o.status!=='success')return;
 const p=o.plans[0];assert.equal(p.transferCount,1);assert.equal(p.distanceM,30);assert.deepEqual(p.legs.filter(l=>l.kind==='walk').map(l=>l.role),['access','transfer','egress']);
 const ride=p.legs.find(l=>l.kind==='ride')!;assert.equal(ride.alternatives.length,2);
 const before=JSON.stringify(p);const view=presentRoute(p,2,{[ride.id]:ride.alternatives[1].id});assert.equal(view.transferCount,1);assert.equal(view.durationS,null);assert.equal(view.distanceM,23);assert.equal(view.metricBasis,'derived-complete');assert.equal(JSON.stringify(p),before);
 assert.throws(()=>presentRoute(p,3,{[ride.id]:'foreign'}));
});
test('unknown ride ordering yields warning/unknown count; outer distance is not transit total',()=>{
 const o=normalizeRoute({status:'1',route:{distance:'999',transits:[{segments:[{bus:{buslines:[{name:'Bus'}]},railway:{name:'Rail'}}]}]}},{...query,mode:'transit'},provenance);
 assert.equal(o.status,'success');if(o.status!=='success')return;assert.equal(o.plans[0].distanceM,null);assert.equal(o.plans[0].transferCount,null);assert.ok(o.plans[0].completeness.unsupportedParts.length);
});
test('source and attempts retain distinctions; replay requires original timestamp',()=>{
 assert.equal(validProvenance(provenance),true);assert.equal(validProvenance({...provenance,kind:'static',subtype:'historical-replay'}),false);
 assert.equal(validAttempt({status:'not-sent',sentAt:'2026-10-11'}),false);assert.equal(validAttempt({status:'sent',sentAt:null}),false);
});
