/** Conservative, pure wheelchair evidence evaluation. No field verification, bookings,
 * provider requests or TTL assumptions. Exact facility existence is not an accessible route. */
import {record,textField,validProvenance} from './route-model';
import type {Component,SourceDate,DateAssessment,Evidence,RouteSelection,RoutePresentation,AccessibilityConclusion} from './route-model';
const components:Component[]=['street','crossing','entrance','lift-ramp','station-platform','vehicle','boarding','alighting','access','transfer','egress','drop-off','parking'];
const iso=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(s=>typeof s==='string'&&s.length<=2000);
/** Preserve source precision/timezone; reject impossible or ambiguous datetime dates. */
function validDate(value:unknown):boolean{if(value===null)return true;const d=record(value);return (d.precision==='date'&&typeof d.value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d.value)&&iso(d.value)&&new Date(d.value).toISOString().slice(0,10)===d.value&&(d.timezone==='Asia/Hong_Kong'||d.timezone==='UTC'||d.timezone===null))||(d.precision==='datetime'&&iso(d.value)&&typeof d.value==='string'&&/(Z|[+-]\d{2}:\d{2})$/.test(d.value)&&(d.timezone===null||!!textField(d.timezone)));}
/** Validate every nested evidence field before using claims; unknown input is not evidence. */
export function validEvidence(value:unknown):value is Evidence{
 const e=record(value),a=record(e.assistance),d=record(e.dateAssessment),u=record(e.usageReview),s=record(e.subject);
 return !!textField(e.id,200)&&validProvenance(e.provenance)&&['exact-leg','exact-facility','background','unmatched'].includes(String(e.matchLevel))&&Object.keys(s).every(k=>['stationId','facilityId','entrance','legId','rideOptionId','routeSampleId'].includes(k)&&!!textField(s[k],200))&&Array.isArray(e.scopeComponents)&&e.scopeComponents.every(c=>components.includes(c))&&!!textField(e.claim,2000)&&strings(e.conditions)&&strings(e.limitations)&&(e.conflictGroup===null||!!textField(e.conflictGroup))&&(e.knownBarrier===null||!!textField(e.knownBarrier))&&typeof a.required==='boolean'&&['staff-portable-ramp','other'].includes(String(a.type))&&typeof a.instructions==='string'&&a.instructions.length<=2000&&strings(a.availabilityEvidenceIds)&&['applicable-confirmed','conditional','unknown','unavailable'].includes(String(a.availability))&&a.bookingStatus==='not-booked'&&[d.published,d.updated,d.validFrom,d.validUntil].every(validDate)&&iso(d.reviewedAt)&&['known-date','no-date','expired','conflicting'].includes(String(d.status))&&typeof d.basisNotes==='string'&&iso(u.checkedAt)&&typeof u.allowed==='boolean'&&typeof u.notes==='string';
}
function time(d:SourceDate|null,end=false):number|null{
 if(!d)return null;if(d.precision==='datetime')return Date.parse(d.value);
 // Date-only Hong Kong bounds use local start/end. Unknown timezone cannot establish validity.
 if(d.timezone===null)return null;return Date.parse(`${d.value}T${end?'23:59:59.999':'00:00:00.000'}${d.timezone==='Asia/Hong_Kong'?'+08:00':'Z'}`);
}
/** Expiry follows stated validity only, never a made-up age limit. */
export function assessDate(date:DateAssessment,now:string):DateAssessment{
 const current=Date.parse(now),until=time(date.validUntil,true);
 const status=date.status==='conflicting'?'conflicting':until!==null&&until<current?'expired':!date.published&&!date.updated?'no-date':'known-date';
 return {...date,status};
}
function applicable(e:Evidence,p:RoutePresentation):boolean{
 const s=e.subject;if(s.routeSampleId&&s.routeSampleId!==p.provenance.referenceId)return false;
 if(s.rideOptionId&&!Object.values(p.selectedRideOptionIds).includes(s.rideOptionId))return false;
 if(e.matchLevel==='exact-leg')return !!s.legId&&p.legs.some(l=>l.id===s.legId);
 if(e.matchLevel==='exact-facility')return !!s.facilityId&&[p.origin.id,p.destination.id].includes(s.facilityId);
 return false;
}
/** Evaluate all necessary per-leg obligations, retaining dates/conflicts/barriers and
 * assistance gaps. Simulation is allowed only on a simulated route and stays labelled. */
export function evaluateAccessibility(p:RoutePresentation,selection:RouteSelection,raw:unknown[],now=new Date().toISOString()):AccessibilityConclusion{
 const simulated=p.provenance.kind==='simulated';const conclusion:AccessibilityConclusion={profile:'general-wheelchair',enabled:selection.wheelchair.enabled,requestId:p.requestId,selectionVersion:selection.selectionVersion,accessibilityVersion:selection.accessibilityVersion,routePlanId:p.id,selectedRideOptionIds:{...p.selectedRideOptionIds},evaluatedAt:now,evidenceIds:[],status:'insufficient',supportedComponents:[],gaps:[],knownBarriers:[],assistanceConditions:[],freshnessWarnings:[],simulated};
 if(!selection.wheelchair.enabled)return conclusion;
 const required:{legId:string|null;facilityId?:string;component:Component}[]=[];
 for(const l of p.legs){const kinds:Component[]=l.kind==='walk'?['street','crossing']:l.kind==='ride'?['station-platform','vehicle','boarding','alighting']:l.kind==='drive'?['drop-off','parking']:['street','crossing','station-platform','vehicle','boarding','alighting'];for(const component of kinds)required.push({legId:l.id,component});if(l.kind==='walk'&&['access','transfer','egress'].includes(l.role))required.push({legId:l.id,component:l.role as Component});}
 required.push({legId:p.legs[0]?.id??null,facilityId:p.origin.id,component:'entrance'},{legId:p.legs.at(-1)?.id??null,facilityId:p.destination.id,component:'entrance'});if(!p.legs.length)required.push({legId:null,component:'street'},{legId:null,component:'crossing'});
 const accepted=raw.filter(validEvidence).filter(e=>e.usageReview.allowed&&applicable(e,p)&&(simulated||e.provenance.kind!=='simulated'));
 const support:Evidence[]=[],confirmed:Evidence[]=[];
 for(const e of accepted){const d=assessDate(e.dateAssessment,now);conclusion.evidenceIds.push(e.id);
  if(e.knownBarrier)conclusion.knownBarriers.push(e.knownBarrier);
  if(e.assistance.required)conclusion.assistanceConditions.push(`${e.assistance.instructions} (${e.assistance.availability}; not-booked)`);
  if(d.status!=='known-date'||e.conflictGroup)conclusion.freshnessWarnings.push(`${e.id}: ${e.conflictGroup?'conflicting':d.status}`);
  if(d.status==='expired'||d.status==='conflicting'||e.conflictGroup)continue;
  support.push(e);conclusion.supportedComponents.push(...e.scopeComponents);
  const from=time(d.validFrom),until=time(d.validUntil,true),current=Date.parse(now);
  const assistance=!e.assistance.required||(e.assistance.availability==='applicable-confirmed'&&e.assistance.availabilityEvidenceIds.length>0&&e.assistance.availabilityEvidenceIds.every(id=>accepted.some(other=>{const start=time(other.dateAssessment.validFrom),end=time(other.dateAssessment.validUntil,true);return other.id===id&&other.assistance.availability==='applicable-confirmed'&&!other.conflictGroup&&!other.knownBarrier&&assessDate(other.dateAssessment,now).status==='known-date'&&start!==null&&end!==null&&start<=current&&end>=current;})));
  if(from!==null&&until!==null&&from<=current&&until>=current&&d.status==='known-date'&&assistance&&!e.knownBarrier)confirmed.push(e);
 }
 for(const obligation of required){const enough=confirmed.some(e=>e.scopeComponents.includes(obligation.component)&&(e.matchLevel==='exact-leg'&&obligation.legId!==null&&e.subject.legId===obligation.legId||obligation.facilityId!==undefined&&e.matchLevel==='exact-facility'&&e.subject.facilityId===obligation.facilityId));if(!enough)conclusion.gaps.push({component:obligation.component,reason:`${obligation.legId??'endpoint'}: applicable current evidence / assistance unavailable`});}
 conclusion.supportedComponents=[...new Set(conclusion.supportedComponents)];
 conclusion.status=!conclusion.gaps.length&&!conclusion.knownBarriers.length&&!conclusion.freshnessWarnings.length?'confirmed':support.length?'partial':'insufficient';
 return conclusion;
}
