/** Same-page ordinary navigation. Endpoints come from explicit search, public
 * presets or device permission; coordinates and synthetic scenarios are never UI.
 * All inputs/results are RAM, await paths match identity/view/request epochs, and
 * dispose aborts transport before releasing DOM. Engine owns the real AMap. */
import type {Endpoint,RouteMode,RouteQuery,RouteQueryOutcome,RoutePresentation,RequestContext,RoutePoint,Evidence} from './route-model';
import {point,presentRoute,routeError} from './route-model';
import {initialRouteState,invalidateRoute,beginRoute,matchesRequest,acceptRoute,selectPlan,selectRideOption,setWheelchair} from './route-state';
import {evaluateAccessibility} from './route-accessibility';
import {FACILITY_LINKS,PUBLIC_ROUTE_PLACES} from './route-preview-data';
interface Dependencies {
 query:(q:RouteQuery,options:{signal:AbortSignal})=>Promise<RouteQueryOutcome>;
 locate:()=>Promise<RoutePoint>;
 search?:(keyword:string,signal:AbortSignal)=>Promise<{name:string;location:RoutePoint|null;district?:string;address?:string}[]>;
 context:()=>Omit<RequestContext,'requestId'|'query'>;
 current:()=>boolean;
 draw?:(p:RoutePresentation|null)=>void;
 /** Applicable approved evidence only. No content is inferred from source links. */
 evidence?:(p:RoutePresentation)=>Evidence[];
 language:'cantonese'|'mandarin'|'english';
}
const COPY={
 title:['導航','导航','Navigation'],origin:['起點','起点','Origin'],destination:['目的地','目的地','Destination'],
 walking:['步行','步行','Walk'],driving:['駕車','驾车','Drive'],transit:['公交','公交','Transit'],
 plan:['查看路線','查看路线','Show route'],retry:['重試路線','重试路线','Retry route'],device:['用我的位置','用我的位置','Use my location'],
 wheelchair:['需要輪椅出行資訊','需要轮椅出行信息','Wheelchair information'],
 idle:['請選起點與目的地','请选择起点与目的地','Select origin and destination'],resolving:['正在取得位置…','正在获取位置…','Finding your location…'],loading:['正在規劃路線…','正在规划路线…','Planning route…'],
 'no-route':['暫時找不到此方式路線，請改地點或方式','暂时找不到此方式路线，请改地点或方式','No route for this mode; change places or mode'],
 error:['查詢未完成，請重試或修改地點','查询未完成，请重试或修改地点','Query failed; retry or change places'],unknown:['資料未提供','资料未提供','Not provided'],
 partial:['僅部分路段有依據，未能確認全程輪椅可達','仅部分路段有依据，无法确认全程轮椅可达','Partial evidence; full wheelchair access is unconfirmed'],
 insufficient:['無障礙資料不足，未能確認全程輪椅可達','无障碍资料不足，无法确认全程轮椅可达','Insufficient evidence to confirm full wheelchair access'],
 confirmed:['已確認符合一般輪椅需求','已确认符合一般轮椅需求','Confirmed against general wheelchair requirements'],
 steps:['查看詳細指引','查看详细指引','Show detailed directions'],options:['此段其他線路','此段其他线路','Other lines for this leg'],plans:['選擇路線方案','选择路线方案','Choose route plan'],
 access:['步行到上車站','步行到上车站','Walk to boarding stop'],egress:['下車後步行','下车后步行','Walk after alighting'],transferWalk:['換乘接駁','换乘接驳','Transfer walk'],
 walk:['步行','步行','Walk'],drive:['駕車','驾车','Drive'],ride:['乘車','乘车','Ride'],
 sources:['資料來源與限制','资料来源与限制','Sources and limitations'],gaps:['查看依據與缺口','查看依据与缺口','Evidence and gaps'],
 barrier:['已知障礙','已知障碍','Known barrier'],staff:['需要協助（未預約）','需要协助（未预约）','Assistance required (not booked)'],
 searchOrigin:['搜尋起點','搜索起点','Search origin'],searchDestination:['搜尋目的地','搜索目的地','Search destination'],
 searching:['正在搜尋地點…','正在搜索地点…','Searching places…'],
 choose:['選常用公共地點','选常用公共地点','Choose a public place'],selected:['已選定','已选定','Selected'],
 map:['路線地圖','路线地图','Route map'],mapRetry:['重試地圖','重试地图','Retry map'],
 min:['分鐘','分钟','min'],hour:['小時','小时','hr'],metre:['米','米','m'],km:['公里','公里','km'],transfers:['次換乘','次换乘','transfers'],
 street:['街道','街道','Street'],crossing:['過路處','过路处','Crossing'],entrance:['出入口','出入口','Entrance'],'lift-ramp':['升降機／斜道','升降机／坡道','Lift/ramp'],'station-platform':['車站／月台','车站／站台','Station/platform'],vehicle:['車輛','车辆','Vehicle'],boarding:['上車','上车','Boarding'],alighting:['下車','下车','Alighting'],transfer:['換乘','换乘','Transfer'],'drop-off':['下客點','下客点','Drop-off'],parking:['停車','停车','Parking'],
 'no-date':['日期未知','日期未知','Date unknown'],expired:['資料已過期','资料已过期','Expired evidence'],conflicting:['資料有衝突','资料有冲突','Conflicting evidence'],conditional:['須先確認可獲協助','须先确认可获协助','Confirm assistance availability'],unavailable:['協助不可用','协助不可用','Assistance unavailable'],'applicable-confirmed':['協助條件有依據','协助条件有依据','Assistance conditions evidenced'],
};
function escape(value:unknown):string{return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
/** Public preset IDs are validated at selection; these are inputs, never routes. */
export function publicRouteEndpoint(id:string):Endpoint|null{const p=PUBLIC_ROUTE_PLACES.find(p=>p.id===id);return p&&point(p.point)?{id:p.id,label:p.label,point:{...p.point},selectionOrigin:'explicit-public-sample'}:null;}
/** Null remains missing, legal zero remains zero; estimates use readable units. */
export function readableRouteMetric(value:number|null,kind:'distance'|'duration',language:'cantonese'|'mandarin'|'english'):string{
 const i=language==='english'?2:language==='mandarin'?1:0;
 if(value===null||!Number.isFinite(value)||value<0)return COPY.unknown[i];
 if(kind==='distance')return value>=1000?`${(value/1000).toFixed(1)} ${COPY.km[i]}`:`${Math.round(value)} ${COPY.metre[i]}`;
 const minutes=Math.ceil(value/60);return minutes>=60?`${Math.floor(minutes/60)} ${COPY.hour[i]}${minutes%60?` ${minutes%60} ${COPY.min[i]}`:''}`:`${minutes} ${COPY.min[i]}`;
}

/** Mount the ordinary page; no automatic GPS or route call. Changing a valid
 * mode re-queries, while plan/option/requirements only present the current batch. */
export function mountRoutePreview(root:HTMLElement,deps:Dependencies,initial?:{origin?:Endpoint;destination?:Endpoint;mode?:RouteMode}){
 const rs=initialRouteState();let alive=true,abort:AbortController|null=null,mode:RouteMode=initial?.mode??'walking',wheelchair=false;
 let origin:Endpoint|null=initial?.origin??null,destination:Endpoint|null=initial?.destination??null;
 let originLabel=origin?.label??'',destLabel=destination?.label??'',candidateTarget:'origin'|'destination'='origin';
 let candidates:{name:string;location:RoutePoint|null;district?:string;address?:string}[]=[];
 const i=deps.language==='english'?2:deps.language==='mandarin'?1:0,t=(key:string):string=>COPY[key as keyof typeof COPY]?.[i]??COPY.unknown[i];
 const current=():boolean=>alive&&root.isConnected&&deps.current();
 const presetOptions=PUBLIC_ROUTE_PLACES.map(p=>`<option value="${escape(p.id)}">${escape(p.label)}</option>`).join('');
 const placeControl=(target:'origin'|'destination',label:string,value:string):string=>`<div class="route-place"><label>${label}<input data-route="${target}-label" maxlength="200" value="${escape(value)}" placeholder="${label}" autocomplete="off"/></label><div class="route-place-actions"><select data-route="${target}-preset" aria-label="${label}：${t('choose')}"><option value="">${t('choose')}</option>${presetOptions}</select><button type="button" data-route="search-${target}">${t(target==='origin'?'searchOrigin':'searchDestination')}</button></div><p class="route-selected" data-selected="${target}"></p></div>`;
 root.classList.add('route-preview');root.hidden=false;
 root.innerHTML=`${placeControl('destination',t('destination'),destLabel)}${placeControl('origin',t('origin'),originLabel)}<button type="button" data-route="device">${t('device')}</button><div data-route-candidates></div><div class="route-mode-buttons" role="group" aria-label="${t('title')}">${(['walking','driving','transit'] as RouteMode[]).map(m=>`<button type="button" data-route="mode" data-mode="${m}" aria-pressed="${m===mode}">${t(m)}</button>`).join('')}</div><button type="button" class="route-plan-button" data-route="run">${t('plan')}</button><label class="route-wheelchair"><input type="checkbox" data-route="wheelchair"/>${t('wheelchair')}</label><p data-route-status role="status" aria-live="polite"></p><div class="route-map" data-route-map role="region" aria-label="${t('map')}"></div><div class="route-map-feedback"><p data-route-map-status role="status"></p><button type="button" data-route="map-retry" hidden>${t('mapRetry')}</button></div><div data-route-result></div>`;
 const status=root.querySelector<HTMLElement>('[data-route-status]')!,result=root.querySelector<HTMLElement>('[data-route-result]')!,candidateBox=root.querySelector<HTMLElement>('[data-route-candidates]')!;
 function syncInputs():void{
  root.querySelector<HTMLInputElement>('[data-route="origin-label"]')!.value=originLabel;root.querySelector<HTMLInputElement>('[data-route="destination-label"]')!.value=destLabel;
  for(const [target,end] of [['origin',origin],['destination',destination]] as const){root.querySelector<HTMLElement>(`[data-selected="${target}"]`)!.textContent=end?`${t('selected')}：${end.label}`:'';root.querySelector<HTMLSelectElement>(`[data-route="${target}-preset"]`)!.value=end&&PUBLIC_ROUTE_PLACES.some(p=>p.id===end.id)?end.id:'';}
  for(const button of root.querySelectorAll<HTMLButtonElement>('[data-route="mode"]'))button.setAttribute('aria-pressed',String(button.dataset.mode===mode));
 }
 /** Invalidate before any endpoint search, position request or transport starts. */
 function clear():void{abort?.abort();abort=null;invalidateRoute(rs);deps.draw?.(null);result.replaceChildren();candidates=[];candidateBox.replaceChildren();status.textContent=t('idle');}
 function fail(category:'invalid-input'|'position-denied'|'position-timeout'|'position-unavailable',message:string):void{rs.phase='error';rs.outcome={status:'error',category,message,requestedSourceMode:'live',provenance:null,requestAttempt:{status:'not-sent',sentAt:null}};display();}
 function display():void{
  if(!current())return;const o=rs.outcome;status.textContent=rs.phase==='success'?'':t(rs.phase==='not-implemented'?'error':rs.phase as keyof typeof COPY);
  root.querySelector<HTMLButtonElement>('[data-route="run"]')!.textContent=rs.phase==='error'||rs.phase==='no-route'?t('retry'):t('plan');
  if(o?.status==='error'){status.textContent=t('error')+' · '+o.message;return;}
  if(rs.phase!=='success'||!rs.selection)return;
  const original=rs.plans.find(p=>p.id===rs.selection!.selectedPlanId);if(!original)return;
  const p=presentRoute(original,rs.selectionVersion,rs.selection.selectedRideOptionIds),metric=(value:number|null,kind:'distance'|'duration')=>readableRouteMetric(value,kind,deps.language);
  result.innerHTML=`<article data-source-kind="live"><h2>${escape(p.destination.label)}</h2><p class="route-summary"><strong>${escape(metric(p.durationS,'duration'))}</strong><span>${escape(metric(p.distanceM,'distance'))}</span><span>${t(mode)}${mode==='transit'?` · ${p.transferCount??t('unknown')} ${t('transfers')}`:''}</span></p>${rs.plans.length>1?`<label>${t('plans')}<select data-route="plan">${rs.plans.map((plan,j)=>`<option value="${escape(plan.id)}" ${plan.id===p.id?'selected':''}>${t('title')} ${j+1} · ${metric(plan.durationS,'duration')}</option>`).join('')}</select></label>`:''}<div data-accessibility></div><details class="route-directions"><summary>${t('steps')}</summary><ol>${p.legs.map(l=>`<li><b>${t(l.kind==='unknown'?'unknown':l.kind)}${l.kind==='walk'&&l.role!=='route'&&l.role!=='unknown'?` · ${t(l.role==='access'?'access':l.role==='egress'?'egress':'transferWalk')}`:''}</b>${l.kind==='ride'?`<p>${escape(l.alternatives.find(o=>o.id===p.selectedRideOptionIds[l.id])?.name??l.alternatives[0]?.name??t('unknown'))}</p><p>${escape(l.entrance.name??t('unknown'))} → ${escape(l.exit.name??t('unknown'))}</p>${l.alternatives.length>1?`<label>${t('options')}<select data-route="option" data-leg="${escape(l.id)}">${l.alternatives.map(o=>`<option value="${escape(o.id)}" ${o.id===p.selectedRideOptionIds[l.id]?'selected':''}>${escape(o.name??t('unknown'))}</option>`).join('')}</select></label>`:''}`:''}<ol>${l.steps.length?l.steps.map(s=>`<li>${escape(s.instruction??t('unknown'))}</li>`).join(''):`<li>${t('unknown')}</li>`}</ol></li>`).join('')}</ol></details><details class="route-sources"><summary>${t('sources')}</summary><p>${escape(p.provenance.provider)} · ${escape(new Date(p.provenance.observedAt).toLocaleString('zh-HK',{timeZone:'Asia/Hong_Kong'}))}</p><p>${i===2?'Public presets are input shortcuts, not verified entrances.':'公共預設僅為選點快捷方式，並非核驗入口。'}</p>${p.geometry.coverage!=='provided'?`<p>${i===2?'Some route geometry is missing.':'部分路線幾何未提供。'}</p>`:''}${p.completeness.missingFields.length?`<p>${t('unknown')} (${p.completeness.missingFields.length})</p>`:''}<div data-source-kind="static"><p>${i===2?'Official links only; applicable facility content and source dates are unavailable.':'官方來源連結；尚未載入適用設施內容，來源日期未提供。'}</p>${FACILITY_LINKS.map(f=>`<p><a href="${escape(f.url)}" target="_blank" rel="noopener noreferrer">${escape(f.title)}</a></p>`).join('')}</div></details></article>`;
  deps.draw?.(p);
  if(wheelchair){const evidence=deps.evidence?.(p)??[],c=evaluateAccessibility(p,rs.selection,evidence);root.querySelector('[data-accessibility]')!.innerHTML=`<div class="route-accessibility" data-source-kind="static"><p>${t(c.status)}</p>${c.knownBarriers.map(b=>`<p class="route-obstacle">${t('barrier')}：${escape(b)}</p>`).join('')}${c.assistanceConditions.map(s=>`<p class="route-obstacle">${t('staff')}：${escape(s.replace(/ \(([^;]+); not-booked\)$/,(_,availability)=>' · '+t(availability)))}</p>`).join('')}<details><summary>${t('gaps')}</summary><p>${i===2?'Ordinary routing does not guarantee wheelchair access.':'普通路線不保證輪椅可達。'}</p>${evidence.filter(e=>c.evidenceIds.includes(e.id)).map(e=>`<p>${escape(e.claim)} · ${escape(e.provenance.sourceTitle)} · ${escape(e.dateAssessment.published?.value??t('unknown'))} / ${escape(e.dateAssessment.reviewedAt)}</p>`).join('')}<ul>${c.gaps.map(g=>`<li>${t(g.component)}：${t('unknown')}</li>`).join('')}${c.freshnessWarnings.map(w=>`<li>${t(w.slice(w.lastIndexOf(': ')+2))}</li>`).join('')}</ul></details></div>`;}
 }
 async function run(device=false):Promise<void>{
  clear();const id=rs.requestId,epoch=JSON.stringify(deps.context()),still=()=>current()&&rs.requestId===id&&JSON.stringify(deps.context())===epoch;
  if(device){rs.phase='resolving';status.textContent=t('resolving');try{const valid=point(await deps.locate());if(!still())return;if(!valid)throw new Error(t('unknown'));origin={id:'device',label:t('device'),point:valid,selectionOrigin:'device'};originLabel=origin.label;syncInputs();}catch(error){if(!still())return;const message=error instanceof Error?error.message:t('unknown');fail(message==='定位權限被拒絕'?'position-denied':message==='裝置定位逾時'?'position-timeout':'position-unavailable',message);return;}}
  if(!origin||!destination||!point(origin.point)||!point(destination.point)){fail('invalid-input',t('idle'));return;}
  const context=beginRoute(rs,{origin,destination,mode,sourceMode:'live',sampleId:null,wheelchair:{enabled:wheelchair,profile:'general-wheelchair'},selectedPlanId:null,selectedRideOptionIds:{},selectionVersion:rs.selectionVersion,accessibilityVersion:rs.accessibilityVersion},deps.context());
  abort=new AbortController();display();
  try{const o=await deps.query({...context.query,requestId:context.requestId},{signal:abort.signal});if(still()&&matchesRequest(rs,context)&&acceptRoute(rs,context,o))display();}
  catch(error){if(still()&&acceptRoute(rs,context,routeError({...context.query,requestId:context.requestId},'unknown',error instanceof Error?error.message:t('unknown'))))display();}
 }
 async function search(target:'origin'|'destination'):Promise<void>{
  clear();const id=rs.requestId,epoch=JSON.stringify(deps.context());candidateTarget=target;abort=new AbortController();const label=target==='origin'?originLabel:destLabel;
  if(!label.trim()||label.length>200){fail('invalid-input',t('idle'));return;}status.textContent=t('searching');
  try{if(!deps.search)throw new Error(t('unknown'));const tips=await deps.search(label,abort.signal);if(!current()||id!==rs.requestId||epoch!==JSON.stringify(deps.context()))return;candidates=tips.filter(tip=>typeof tip.name==='string'&&tip.name.trim().length>0&&tip.name.length<=200&&point(tip.location));candidateBox.innerHTML=candidates.length?candidates.map((tip,j)=>`<button type="button" data-route="candidate" data-index="${j}"><b>${escape(tip.name)}</b><small>${escape(tip.district??'')} ${escape(tip.address??'')}</small></button>`).join(''):t('unknown');status.textContent=t('idle');}
  catch(error){if(current()&&id===rs.requestId&&epoch===JSON.stringify(deps.context()))status.textContent=t('error')+' · '+(error instanceof Error?error.message:t('unknown'));}
 }
 function input(event:Event):void{const el=event.target;if(!(el instanceof HTMLInputElement))return;if(el.dataset.route==='origin-label'){originLabel=el.value;origin=null;}else if(el.dataset.route==='destination-label'){destLabel=el.value;destination=null;}else return;clear();syncInputs();}
 function change(event:Event):void{const el=event.target;if(!(el instanceof HTMLSelectElement||el instanceof HTMLInputElement))return;const name=el.dataset.route;
  if(name==='wheelchair'&&el instanceof HTMLInputElement){wheelchair=el.checked;setWheelchair(rs,wheelchair);display();return;}
  if(name==='plan'){if(selectPlan(rs,el.value)){deps.draw?.(null);display();}return;}
  if(name==='option'){if(selectRideOption(rs,el.dataset.leg??'',el.value)){deps.draw?.(null);display();}return;}
  if(name==='origin-preset'||name==='destination-preset'){const end=publicRouteEndpoint(el.value);clear();if(name==='origin-preset'){origin=end;originLabel=end?.label??'';}else{destination=end;destLabel=end?.label??'';}syncInputs();}
 }
 function click(event:Event):void{const target=event.target;if(!(target instanceof Element))return;const el=target.closest<HTMLElement>('[data-route]'),name=el?.dataset.route;
  if(name==='run')void run();else if(name==='device')void run(true);else if(name==='map-retry'){const selected=rs.plans.find(p=>p.id===rs.selection?.selectedPlanId);deps.draw?.(selected&&rs.selection?presentRoute(selected,rs.selectionVersion,rs.selection.selectedRideOptionIds):null);}
  else if(name==='mode'&&['walking','driving','transit'].includes(el!.dataset.mode??'')){mode=el!.dataset.mode as RouteMode;syncInputs();if(origin&&destination)void run();else clear();}
  else if(name==='search-origin')void search('origin');else if(name==='search-destination')void search('destination');
  else if(name==='candidate'){const tip=candidates[Number(el!.dataset.index)],valid=point(tip?.location);if(!tip||!valid)return;const target=candidateTarget,end:Endpoint={id:`search:${valid.lng},${valid.lat}`,label:tip.name,point:valid,selectionOrigin:'public-search'};clear();if(target==='origin'){origin=end;originLabel=end.label;}else{destination=end;destLabel=end.label;}syncInputs();}
 }
 root.addEventListener('input',input);root.addEventListener('change',change);root.addEventListener('click',click);syncInputs();status.textContent=t('idle');
 return {run,clear,dispose:():void=>{alive=false;clear();invalidateRoute(rs,true);origin=null;destination=null;root.removeEventListener('input',input);root.removeEventListener('change',change);root.removeEventListener('click',click);root.replaceChildren();},setDestination:(end:Endpoint,nextMode:RouteMode='walking'):void=>{clear();destination=point(end.point)?structuredClone(end):null;destLabel=destination?.label??'';mode=nextMode;syncInputs();},setDestinationDraft:(label:string,nextMode:RouteMode='walking'):void=>{clear();destination=null;destLabel=label;mode=nextMode;syncInputs();},state:rs};
}
