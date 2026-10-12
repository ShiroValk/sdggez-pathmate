/** Test-only synthetic routes/evidence. Never imported by product. */
import {normalizeRoute} from "../../client/src/pages/MemoPathPage/route-model";
import type {RouteQuery,RouteQueryOutcome,Provenance,Evidence,RoutePresentation} from "../../client/src/pages/MemoPathPage/route-model";
export type SimulationCase='partial'|'insufficient'|'no-date'|'expired'|'conflict'|'barrier'|'staff'|'complete'|'no-route'|'error';
export const SIMULATION_CASES:SimulationCase[]=['partial','insufficient','no-date','expired','conflict','barrier','staff','complete','no-route','error'];
/** Original illustrative coordinates, explicitly NOT validated public endpoints. */
export const SIMULATION_ENDPOINTS={origin:{id:'simulation-origin',label:'模擬尖東附近起點（非核驗入口）',point:{lng:114.177,lat:22.300},selectionOrigin:'explicit-public-sample' as const},destination:{id:'simulation-destination',label:'模擬文化設施終點（非核驗入口）',point:{lng:114.181,lat:22.302},selectionOrigin:'explicit-public-sample' as const}};
/** Persistent label carried by every synthetic plan/evidence rather than demoMode. */
export function simulationProvenance(sampleId:string,now=new Date().toISOString()):Provenance{return {kind:'simulated',provider:'PathMate original simulation',sourceTitle:'原創模擬情境',sourceUrl:null,referenceId:sampleId,observedAt:now,originalQueriedAt:null,publishedAt:null,updatedAt:null,limitations:['非真實供應商返回、非核驗公共入口、非實地或全程可達證據']};}
/** Build provider-shaped test/demo input on demand, not a reconstructed historical route. */
export function simulationRoute(query:RouteQuery,scenario:SimulationCase):RouteQueryOutcome{
 const provenance=simulationProvenance(query.sampleId??'simulation');
 const step={instruction:'模擬：沿示意道路前行',distance:'100',duration:'120',polyline:'114.177,22.300;114.178,22.301'};
 const walking={distance:'100',duration:'120',steps:[step]};
 const line=(name:string)=>({name,departure_stop:{name:'模擬上車站',location:'114.178,22.301'},arrival_stop:{name:'模擬下車站',location:'114.180,22.302'},distance:'200',duration:'180',polyline:'114.178,22.301;114.180,22.302'});
 const path={distance:'400',duration:'480',steps:[step,{...step,instruction:'模擬：到達終點',polyline:'114.180,22.302;114.181,22.302'}]};
 const raw=scenario==='error'?{status:'0',info:'Controlled simulated failure'}:{status:'1',route:query.mode==='transit'?{transits:scenario==='no-route'?[]:[{distance:'700',duration:'900',walking_distance:'300',segments:[{walking,bus:{buslines:[line('模擬A'),line('模擬A備選')]}},{walking,bus:{buslines:[line('模擬B')]}},{walking}]}]}:{paths:scenario==='no-route'?[]:[path,{...path,distance:'500',duration:'600'}]}};
 return normalizeRoute(raw,query,provenance);
}
/** Generate only simulated evidence bound to the selected plan/leg. Source-time
 * absence/conflict/expiry and staff conditions remain explicit. No production claims. */
export function simulationEvidence(plan:RoutePresentation,scenario:SimulationCase,now=new Date().toISOString()):Evidence[]{
 if(['insufficient','no-route','error'].includes(scenario))return [];
 const start={value:now.slice(0,10),precision:'date' as const,timezone:'Asia/Hong_Kong'},end={value:new Date(Date.parse(now)+86400000).toISOString().slice(0,10),precision:'date' as const,timezone:'Asia/Hong_Kong'};
 const evidence:Evidence[]=plan.legs.map((leg,i)=>({id:`simulation-evidence:${i}`,provenance:simulationProvenance(plan.provenance.referenceId??'simulation',now),subject:{legId:leg.id,routeSampleId:plan.provenance.referenceId??'simulation',...(leg.kind==='ride'?{rideOptionId:plan.selectedRideOptionIds[leg.id]}:{})},matchLevel:'exact-leg',scopeComponents:scenario==='complete'?(leg.kind==='ride'?['station-platform','vehicle','boarding','alighting']:leg.kind==='drive'?['drop-off','parking','entrance']:['street','crossing','entrance',...(leg.role==='access'||leg.role==='transfer'||leg.role==='egress'?[leg.role]:[])]):['entrance'],claim:'模擬局部依據，非真實設施資料',conditions:['僅驗證提示邏輯'],assistance:{required:scenario==='staff',type:'staff-portable-ramp',instructions:scenario==='staff'?'模擬：需職員提供斜板，尚未確認可獲得性':'',availabilityEvidenceIds:[],availability:scenario==='staff'?'conditional':'unknown',bookingStatus:'not-booked'},dateAssessment:{published:scenario==='no-date'?null:start,updated:null,validFrom:scenario==='no-date'?null:start,validUntil:scenario==='no-date'?null:scenario==='expired'?{...start,value:'2020-01-01'}:end,reviewedAt:now,status:scenario==='conflict'?'conflicting':'known-date',basisNotes:'原創模擬有效期，不用於真實來源'},conflictGroup:scenario==='conflict'?'simulated-conflict':null,knownBarrier:scenario==='barrier'?'模擬：此環節有階梯':null,limitations:['非真實可達證據'],usageReview:{checkedAt:now,allowed:true,notes:'Original simulation'}}));
 return scenario==='complete'?evidence:evidence.slice(0,1);
}
