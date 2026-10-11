/** DOM route preview owned by MemoPath engine. Inputs/results stay in page memory.
 * Dependencies allow explicit browser test control without production fake-success hooks.
 * dispose invalidates before removing resources; all await/catch paths check context. */
import type {Endpoint,RouteMode,SourceMode,RouteQuery,RouteQueryOutcome,RoutePresentation,RequestContext,RoutePoint} from './route-model';
import {point,presentRoute,routeError} from './route-model';
import {initialRouteState,invalidateRoute,beginRoute,matchesRequest,acceptRoute,selectPlan,selectRideOption,setWheelchair,assessmentContext,matchesAssessment} from './route-state';
import {evaluateAccessibility,assessDate} from './route-accessibility';
import {FACILITY_LINKS,SIMULATION_ENDPOINTS,SIMULATION_CASES,simulationEvidence,type SimulationCase} from './route-preview-data';
interface Dependencies {
 query:(q:RouteQuery,options:{signal:AbortSignal})=>Promise<RouteQueryOutcome>;
 locate:()=>Promise<RoutePoint>;
 search?:(keyword:string,signal:AbortSignal)=>Promise<{name:string;location:RoutePoint|null}[]>;
 context:()=>Omit<RequestContext,'requestId'|'query'>;
 current:()=>boolean;
 draw?:(p:RoutePresentation|null)=>void;
 language:'cantonese'|'mandarin'|'english';
}
const COPY={
 title:['出行方式與無障礙提示','出行方式与无障碍提示','Travel modes and accessibility'],
 origin:['起點名稱','起点名称','Origin name'],destination:['終點名稱','终点名称','Destination name'],coords:['經度,緯度（明確公共點）','经度,纬度（明确公共点）','Longitude,latitude (explicit public point)'],
 walking:['步行','步行','Walking'],driving:['駕車','驾车','Driving'],transit:['公交','公交','Transit'],
 live:['真實查詢','真实查询','Live query'],replay:['歷史回放','历史回放','Historical replay'],simulation:['顯式模擬','显式模拟','Explicit simulation'],
 plan:['規劃／重試','规划／重试','Plan / retry'],device:['用本機定位作起點','用本机定位作起点','Use device as origin'],wheelchair:['一般輪椅需求（資訊評估）','一般轮椅需求（信息评估）','General wheelchair information'],
 idle:['請明確選定起終點','请明确选定起终点','Select explicit endpoints'],resolving:['取得本機起點中','正在获取本机起点','Resolving device origin'],loading:['查詢中','查询中','Loading'],
 'no-route':['找不到此方式路線','找不到此方式路线','No route for this mode'],error:['查詢失敗','查询失败','Query failed'],'not-implemented':['未完成／暫緩','未完成／暂缓','Not implemented / deferred'],
 unknown:['資料未提供','资料未提供','Not provided'],partial:['僅部分路段有依據','仅部分路段有依据','Only partial evidence'],insufficient:['資訊不足，無法確認','信息不足，无法确认','Insufficient information'],confirmed:['已確認符合要求','已确认符合要求','Confirmed against requirements'],
 simulationNote:['模擬：非真實香港返回、非核驗入口、非全程可達證據','模拟：非真实香港返回、非核验入口、非全程可达证据','SIMULATED: not a real HK response, verified entrance, or accessibility evidence'],
 distance:['距離','距离','Distance'],duration:['時間','时间','Duration'],invalidData:['資料無效','资料无效','Invalid data'],unsupported:['未支援資料','未支持资料','Unsupported data'],
 missing:['缺口／限制','缺口／限制','Gaps / limitations'],steps:['有序指引','有序指引','Ordered instructions'],options:['同段備選','同段备选','Same-leg alternatives'],plans:['完整方案','完整方案','Complete plans'],transfer:['換乘次數','换乘次数','Transfers'],access:['首段接駁','首段接驳','Access walk'],egress:['末段接駁','末段接驳','Egress walk'],route:['路段','路段','Route leg'],walk:['步行段','步行段','Walking leg'],drive:['駕車段','驾车段','Driving leg'],ride:['乘車段','乘车段','Ride leg'],
 source:['所選來源','所选来源','Selected source'],notSent:['尚未調用供應商','尚未调用供应商','Provider not called'],attempt:['真實查詢嘗試失敗','真实查询尝试失败','Live query attempt failed'],
 facilities:['靜態來源連結（未載入設施內容）','静态来源链接（未加载设施内容）','Static source links (facility content not imported)'],facilityGap:['再利用許可／適用入口與日期未核實；不支持目前路段確認','再利用许可／适用入口与日期未核实；不支持当前路段确认','Reuse permission, applicable entrance and dates unverified; no current-leg confirmation'],
 date:['來源日期／查閱日期','来源日期／查阅日期','Source date / reviewed date'],barriers:['已知障礙','已知障碍','Known barriers'],staff:['職員協助條件（未預約）','职员协助条件（未预约）','Staff assistance conditions (not booked)'],geometry:['供應資料幾何示意（無底圖；不證明可達）','供应资料几何示意（无底图；不证明可达）','Provided geometry sketch (no basemap; not accessibility proof)'],
 invalid:['請輸入有效坐標並明確選定公共起終點','请输入有效坐标并明确选定公共起终点','Enter valid coordinates and explicitly select public endpoints'],
 searchLive:['公共點搜尋只用於真實查詢；請先選擇真實來源','公共点搜索只用于真实查询；请先选择真实来源','Public-point search requires selecting live query first'],
 scenario:['模擬情境','模拟情境','Simulation scenario'],
 'no-date':['來源日期未知','来源日期未知','Source date unknown'],expired:['來源已過期','来源已过期','Source expired'],conflict:['來源有衝突','来源有冲突','Conflicting sources'],barrier:['已知障礙','已知障碍','Known barrier'],complete:['完整模擬分支','完整模拟分支','Complete synthetic branch'],
 searchOrigin:['搜尋公共起點','搜索公共起点','Search public origin'],searchDestination:['搜尋公共終點','搜索公共终点','Search public destination'],
};
function escape(value:unknown):string{return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
/** Current geometry as separate SVG fragments; never concatenate legs or fill holes. */
function sketch(p:RoutePresentation):string{
 const fragments=p.geometry.fragments,points=fragments.flatMap(f=>f.points);if(!points.length)return '';
 const minX=Math.min(...points.map(p=>p.lng)),maxX=Math.max(...points.map(p=>p.lng)),minY=Math.min(...points.map(p=>p.lat)),maxY=Math.max(...points.map(p=>p.lat));
 return `<svg viewBox="0 0 320 150" role="img" aria-label="${escape(p.provenance.kind)} geometry">${fragments.map(f=>`<polyline points="${f.points.map(p=>`${10+(p.lng-minX)/Math.max(maxX-minX,0.00001)*300},${140-(p.lat-minY)/Math.max(maxY-minY,0.00001)*130}`).join(' ')}" fill="none" stroke="#456a37" stroke-width="4"/>`).join('')}</svg>`;
}
/** Mount interactive preview; defaults to live selection without automatic calls.
 * Simulation requires an explicit source choice. Keyboard controls are native inputs/selects. */
export function mountRoutePreview(root:HTMLElement,deps:Dependencies,initial?:{destination:Endpoint;mode?:RouteMode}){
 const rs=initialRouteState();let alive=true,abort:AbortController|null=null,mode:RouteMode=initial?.mode??'driving',source:SourceMode='live',scenario:SimulationCase='partial',wheelchair=false;
 let origin:Endpoint|null=null,destination:Endpoint|null=initial?.destination??null;
 let originLabel='',originCoords='',destLabel=destination?.label??'',destCoords=destination?`${destination.point.lng},${destination.point.lat}`:'';
 const index=deps.language==='english'?2:deps.language==='mandarin'?1:0;
 const t=(key:keyof typeof COPY):string=>COPY[key][index];
 const componentLabel=(component:string):string=>({street:['街道','街道','Street'],crossing:['過路處','过路处','Crossing'],entrance:['入口','入口','Entrance'],'lift-ramp':['升降機／斜道','升降机／坡道','Lift / ramp'],'station-platform':['車站／月台','车站／站台','Station / platform'],vehicle:['車輛','车辆','Vehicle'],boarding:['上車','上车','Boarding'],alighting:['下車','下车','Alighting'],'drop-off':['落客點','下客点','Drop-off'],parking:['停車','停车','Parking']} as Record<string,string[]>)[component]?.[index]??t(component as keyof typeof COPY);
 const missingLabel=(path:string):string=>t(path.includes('duration')?'duration':path.includes('distance')?'distance':path.includes('geometry')?'geometry':path.includes('access')?'access':path.includes('egress')?'egress':path.includes('steps')?'steps':'unknown');
 const preflight=(category:'invalid-input'|'position-denied'|'position-timeout'|'position-unavailable',message:string):void=>{rs.phase='error';rs.outcome={status:'error',category,message,requestedSourceMode:source,provenance:null,requestAttempt:{status:'not-sent',sentAt:null}};display();};
 const current=():boolean=>alive&&root.isConnected&&deps.current();
 const options=(values:string[],selected:string,labels:(v:string)=>string):string=>values.map(v=>`<option value="${escape(v)}" ${v===selected?'selected':''}>${escape(labels(v))}</option>`).join('');
 root.classList.add('route-preview');root.hidden=false;
 root.innerHTML=`<h2>${t('title')}</h2><div class="route-controls"><label>${t('source')}<select data-route="source">${options(['live','replay','simulation'],source,v=>t(v as SourceMode))}</select></label><label>${t('title')}<select data-route="mode">${options(['walking','driving','transit'],mode,v=>t(v as RouteMode))}</select></label></div><div data-simulation-controls hidden><label>${t('scenario')}<select data-route="scenario">${options(SIMULATION_CASES,scenario,v=>t(v as keyof typeof COPY))}</select></label></div><div class="route-controls"><label>${t('origin')}<input data-route="origin-label" maxlength="200" value="${escape(originLabel)}"/></label><label>${t('coords')}<input data-route="origin-point" maxlength="80" value="${escape(originCoords)}"/></label><label>${t('destination')}<input data-route="destination-label" maxlength="200" value="${escape(destLabel)}"/></label><label>${t('coords')}<input data-route="destination-point" maxlength="80" value="${escape(destCoords)}"/></label></div><div class="route-controls"><button type="button" data-route="device">${t('device')}</button><button type="button" data-route="run">${t('plan')}</button><label><input type="checkbox" data-route="wheelchair"/>${t('wheelchair')}</label></div><div data-route-status role="status" aria-live="polite"></div><div data-route-result></div><div class="route-facilities"><h3>${t('facilities')}</h3>${FACILITY_LINKS.map(f=>`<article data-source-kind="static" data-implementation="deferred"><a href="${escape(f.url)}" target="_blank" rel="noopener noreferrer">${escape(f.title)}</a><p>${t('facilityGap')}</p><small>${t('date')}: ${t('unknown')} / 2026-10-11</small></article>`).join('')}</div>`;
 const status=root.querySelector<HTMLElement>('[data-route-status]')!,result=root.querySelector<HTMLElement>('[data-route-result]')!;
 const searchControls=document.createElement('div');searchControls.className='route-controls';searchControls.innerHTML=`<button type="button" data-route="search-origin">${t('searchOrigin')}</button><button type="button" data-route="search-destination">${t('searchDestination')}</button><div data-route-candidates></div>`;status.before(searchControls);
 let candidates:{name:string;location:RoutePoint|null}[]=[];let candidateTarget:'origin'|'destination'='origin';
 function clear():void{abort?.abort();abort=null;invalidateRoute(rs);deps.draw?.(null);result.replaceChildren();candidates=[];root.querySelector('[data-route-candidates]')?.replaceChildren();status.textContent=t('loading');}
 function inputs():boolean{
  const a=point(originCoords),b=point(destCoords);origin=a&&originLabel.trim()?{id:`public:${originCoords}`,label:originLabel.trim(),point:a,selectionOrigin:'explicit-public-sample'}:null;
  destination=b&&destLabel.trim()?{id:`public:${destCoords}`,label:destLabel.trim(),point:b,selectionOrigin:'explicit-public-sample'}:null;return !!origin&&!!destination;
 }
 function display():void{
  if(!current())return;const o=rs.outcome;
  const badge=`${t('source')}: ${t(source)}${source==='simulation'?` — ${t('simulationNote')}`:''}`;
  status.textContent=badge+' · '+(rs.phase==='success'?'':t(rs.phase as keyof typeof COPY));
  if(o?.status==='error'){status.textContent+=' · '+(o.requestAttempt.status==='sent'?t('attempt'):t('notSent'))+' · '+o.category+' · '+o.message;return;}
  if(o?.status==='not-implemented'){status.textContent+=' · '+o.reason;return;}
  if(rs.phase!=='success'||!rs.selection)return;
  const original=rs.plans.find(p=>p.id===rs.selection!.selectedPlanId);if(!original)return;
  const p=presentRoute(original,rs.selectionVersion,rs.selection.selectedRideOptionIds);
  const metric=(v:number|null,unit:string):string=>v===null?t('unknown'):`${Math.round(v)} ${unit}`;
  result.innerHTML=`<article data-source-kind="${p.provenance.kind}"><p class="route-source">${source==='simulation'?t('simulationNote'):`${escape(p.provenance.provider)} · ${escape(p.provenance.observedAt)}`}</p><label>${t('plans')}<select data-route="plan">${options(rs.plans.map(p=>p.id),p.id,v=>`${t('plans')} ${rs.plans.findIndex(p=>p.id===v)+1}`)}</select></label><h3>${escape(p.origin.label)} → ${escape(p.destination.label)}</h3><p>${t(mode)} · ${metric(p.distanceM,'m')} · ${metric(p.durationS,'s')} · ${t('transfer')}: ${p.transferCount??t('unknown')}</p><p>${t('geometry')} · ${p.geometry.coverage==='provided'?t('steps'):t('missing')}</p>${sketch(p)}<h3>${t('steps')}</h3><ol>${p.legs.map(l=>`<li>${t(l.kind==='unknown'?'unknown':l.kind)}${l.kind==='walk'?` · ${t(l.role==='unknown'?'unknown':l.role)}`:''}${l.kind==='ride'?`<label>${t('options')}<select data-route="option" data-leg="${escape(l.id)}">${options(l.alternatives.map(o=>o.id),p.selectedRideOptionIds[l.id]??l.alternatives[0]?.id??'',v=>l.alternatives.find(o=>o.id===v)?.name??t('unknown'))}</select></label><p>${escape(l.entrance.name??t('unknown'))} → ${escape(l.exit.name??t('unknown'))}</p>`:''}<ol>${l.steps.length?l.steps.map(s=>`<li>${escape(s.instruction??t('unknown'))}</li>`).join(''):`<li>${t('unknown')}</li>`}</ol></li>`).join('')}</ol>${p.completeness.missingFields.length?`<details><summary>${t('missing')} (${p.completeness.missingFields.length})</summary><ul>${p.completeness.missingFields.map(m=>`<li>${escape(missingLabel(m.path))}: ${t(m.reason==='invalid'?'invalidData':m.reason==='unsupported'?'unsupported':'unknown')}</li>`).join('')}</ul></details>`:''}<div data-accessibility></div></article>`;
  deps.draw?.(p);
  if(wheelchair){const context=assessmentContext(rs);const evidence=source==='simulation'?simulationEvidence(p,scenario):[];const c=evaluateAccessibility(p,rs.selection,evidence);
   if(context&&matchesAssessment(rs,context)){root.querySelector('[data-accessibility]')!.innerHTML=`<article data-source-kind="${c.simulated?'simulated':'static'}"><h3>${c.simulated?t('simulationNote')+' · ':''}${t(c.status)}</h3>${c.knownBarriers.length?`<p>${t('barriers')}: ${c.knownBarriers.map(escape).join('; ')}</p>`:''}${c.assistanceConditions.length?`<p>${t('staff')}: ${c.assistanceConditions.map(escape).join('; ')}</p>`:''}<p>${t('missing')}</p><ul>${c.gaps.map(g=>`<li>${t('route')} ${Math.max(1,p.legs.findIndex(l=>g.reason.startsWith(l.id+':'))+1)} · ${escape(componentLabel(g.component))}: ${t('unknown')}</li>`).join('')}</ul><p>${c.freshnessWarnings.length?t('missing'):''}</p>${evidence.map(e=>`<div data-source-kind="simulated"><b>${t('route')} ${p.legs.findIndex(l=>l.id===e.subject.legId)+1} · ${escape(e.claim)}</b><p>${t('date')}: ${t(assessDate(e.dateAssessment,c.evaluatedAt).status==='known-date'?'date':assessDate(e.dateAssessment,c.evaluatedAt).status==='no-date'?'no-date':assessDate(e.dateAssessment,c.evaluatedAt).status==='expired'?'expired':'conflict')} · ${escape(e.dateAssessment.published?.value??t('unknown'))} / ${escape(e.dateAssessment.reviewedAt)}</p><p>${escape(e.scopeComponents.map(componentLabel).join(', '))} · ${escape(e.limitations.join('; '))}</p></div>`).join('')}</article>`;}
  }
 }
 async function run(device=false):Promise<void>{
  if(device&&source!=='live'){status.textContent=t('searchLive');return;}
  clear();const id=rs.requestId,epoch=JSON.stringify(deps.context());const still=():boolean=>current()&&rs.requestId===id&&JSON.stringify(deps.context())===epoch;
  if(source==='replay'){rs.phase='not-implemented';rs.outcome={status:'not-implemented',reason:index===2?'No licensed complete historical payload; a text summary is not a real replay':index===1?'没有合法完整历史payload；不能将文字摘要构造为真实回放':'沒有合法完整歷史payload；不能將文字摘要構造為真實回放',mode,sourceMode:source,requestedSourceMode:source,requestAttempt:{status:'not-sent',sentAt:null},provenance:null};display();return;}
  if(source==='simulation'){origin=structuredClone(SIMULATION_ENDPOINTS.origin);destination=structuredClone(SIMULATION_ENDPOINTS.destination);originLabel=origin.label;originCoords=`${origin.point.lng},${origin.point.lat}`;destLabel=destination.label;destCoords=`${destination.point.lng},${destination.point.lat}`;syncInputs();}
  else inputs();
  if(device){rs.phase='resolving';status.textContent=t('resolving');try{const p=await deps.locate();if(!still())return;const valid=point(p);if(!valid)throw new Error('Invalid device position');origin={id:'device',label:t('device'),point:valid,selectionOrigin:'device'};originLabel=origin.label;originCoords=`${p.lng},${p.lat}`;syncInputs();}catch(error){if(!still())return;const message=error instanceof Error?error.message:t('unknown');preflight(message==='定位權限被拒絕'?'position-denied':message==='裝置定位逾時'?'position-timeout':'position-unavailable',message);return;}}
  if(!origin||!destination){preflight('invalid-input',t('invalid'));return;}
  const selection={origin,destination,mode,sourceMode:source,sampleId:source==='simulation'?scenario:null,wheelchair:{enabled:wheelchair,profile:'general-wheelchair' as const},selectedPlanId:null,selectedRideOptionIds:{},selectionVersion:rs.selectionVersion,accessibilityVersion:rs.accessibilityVersion};
  const context=beginRoute(rs,selection,deps.context()),q={...context.query,requestId:context.requestId};abort=new AbortController();display();
  try{const o=await deps.query(q,{signal:abort.signal});if(still()&&matchesRequest(rs,context)&&acceptRoute(rs,context,o))display();}
  catch(error){if(still()&&acceptRoute(rs,context,routeError(q,'unknown',error instanceof Error?error.message:t('unknown'))))display();}
 }
 function syncInputs():void{for(const [name,value] of [['origin-label',originLabel],['origin-point',originCoords],['destination-label',destLabel],['destination-point',destCoords]])root.querySelector<HTMLInputElement>(`[data-route="${name}"]`)!.value=value;}
 function input(event:Event):void{const el=event.target;if(!(el instanceof HTMLInputElement))return;const name=el.dataset.route;if(name==='origin-label')originLabel=el.value;else if(name==='origin-point')originCoords=el.value;else if(name==='destination-label')destLabel=el.value;else if(name==='destination-point')destCoords=el.value;else return;clear();status.textContent=t('idle');}
 function change(event:Event):void{const el=event.target;if(!(el instanceof HTMLSelectElement||el instanceof HTMLInputElement))return;const name=el.dataset.route;
  if(name==='wheelchair'&&el instanceof HTMLInputElement){wheelchair=el.checked;setWheelchair(rs,wheelchair);display();return;}
  if(name==='plan'){if(selectPlan(rs,el.value)){result.replaceChildren();deps.draw?.(null);display();}return;}
  if(name==='option'){if(selectRideOption(rs,el.dataset.leg??'',el.value)){result.replaceChildren();deps.draw?.(null);display();}return;}
  if(name==='mode'&&['walking','driving','transit'].includes(el.value)){mode=el.value as RouteMode;void run();}
  if(name==='source'&&['live','replay','simulation'].includes(el.value)){source=el.value as SourceMode;root.querySelector<HTMLElement>('[data-simulation-controls]')!.hidden=source!=='simulation';if(source!=='simulation'){origin=null;destination=initial?.destination??null;originLabel='';originCoords='';destLabel=destination?.label??'';destCoords=destination?`${destination.point.lng},${destination.point.lat}`:'';syncInputs();}void run();}
  if(name==='scenario'&&SIMULATION_CASES.includes(el.value as SimulationCase)){scenario=el.value as SimulationCase;void run();}
 }
 async function search(target:'origin'|'destination'):Promise<void>{if(source!=='live'){status.textContent=t('searchLive');return;}clear();const id=rs.requestId,epoch=JSON.stringify(deps.context());candidateTarget=target;abort=new AbortController();try{if(!deps.search)throw new Error(t('unknown'));const tips=await deps.search(target==='origin'?originLabel:destLabel,abort.signal);if(!current()||id!==rs.requestId||epoch!==JSON.stringify(deps.context()))return;candidates=tips.filter(tip=>tip.location!==null&&point(tip.location)!==null);status.textContent=t('idle');root.querySelector('[data-route-candidates]')!.innerHTML=candidates.length?candidates.map((tip,i)=>`<button type="button" data-route="candidate" data-index="${i}">${escape(tip.name)} (${escape(tip.location!.lng)},${escape(tip.location!.lat)})</button>`).join(''):t('unknown');}catch(error){if(current()&&id===rs.requestId&&epoch===JSON.stringify(deps.context()))status.textContent=t('error')+' · '+(error instanceof Error?error.message:t('unknown'));}}
 function click(event:Event):void{const target=event.target;if(!(target instanceof Element))return;const el=target.closest<HTMLElement>('[data-route]');if(el?.dataset.route==='run')void run();if(el?.dataset.route==='device')void run(true);if(el?.dataset.route==='search-origin')void search('origin');if(el?.dataset.route==='search-destination')void search('destination');if(el?.dataset.route==='candidate'){const tip=candidates[Number(el.dataset.index)];if(!tip?.location)return;const target=candidateTarget;clear();if(target==='origin'){originLabel=tip.name;originCoords=`${tip.location.lng},${tip.location.lat}`;}else{destLabel=tip.name;destCoords=`${tip.location.lng},${tip.location.lat}`;}syncInputs();inputs();status.textContent=t('idle');}}
 root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('click',click);status.textContent=t('idle');
 return {run,clear,dispose:():void=>{alive=false;clear();invalidateRoute(rs,true);origin=null;destination=null;originLabel='';originCoords='';destLabel='';destCoords='';root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('click',click);root.replaceChildren();},setDestination:(end:Endpoint,nextMode:RouteMode='walking'):void=>{clear();destination=end;destLabel=end.label;destCoords=`${end.point.lng},${end.point.lat}`;mode=nextMode;source='live';root.querySelector<HTMLSelectElement>('[data-route="mode"]')!.value=mode;root.querySelector<HTMLSelectElement>('[data-route="source"]')!.value=source;root.querySelector<HTMLElement>('[data-simulation-controls]')!.hidden=true;syncInputs();status.textContent=t('idle');},setDestinationDraft:(label:string,nextMode:RouteMode='walking'):void=>{clear();destination=null;destLabel=label;destCoords='';mode=nextMode;source='live';root.querySelector<HTMLSelectElement>('[data-route="mode"]')!.value=mode;root.querySelector<HTMLSelectElement>('[data-route="source"]')!.value=source;syncInputs();status.textContent=t('invalid');},state:rs};
}
