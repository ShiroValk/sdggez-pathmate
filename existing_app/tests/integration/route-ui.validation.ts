/** Bounded real Chromium DOM validation with original synthetic route inputs.
 * CSP refuses external traffic; no real Key/GPS/account/DB, and no success is real
 * provider evidence. Uses existing esbuild + installed browser, no dependencies.
 * Temporary profile/bundle/server are owned here and removed in finally. */
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';


const browserProgram=String.raw`
import {mountRoutePreview} from './client/src/pages/MemoPathPage/route-preview';
import {ROUTE_LIVE_REVIEW,simulationRoute} from './client/src/pages/MemoPathPage/route-preview-data';
import {routeError,normalizeRoute,metric} from './client/src/pages/MemoPathPage/route-model';
import {queryRoute,searchTips,planRoute,formatDistance,formatDuration} from './client/src/pages/MemoPathPage/memopath-amap';
import {mountMemoApp} from './client/src/pages/MemoPathPage/memopath-engine';
import {MEMOPATH_CSS} from './client/src/pages/MemoPathPage/memopath-styles';
// Exercise the preflight-denied branch explicitly, independent of the product's
// current user-authorized policy. The isolated bundle has only a fake test key.
ROUTE_LIVE_REVIEW.allowed=false;
// Provider scripts never enter the document. The key is an original test literal.
const nativeAppend=document.head.append.bind(document.head);let transportMode='success',lastScript=null,lastCallback=null,transportCalls=0;
document.head.append=(...nodes)=>{for(const n of nodes){if(n instanceof HTMLScriptElement&&n.src.includes('amap.com')){if(n.src.includes('webapi.amap.com')){queueMicrotask(()=>n.onerror?.(new Event('error')));continue;}transportCalls++;lastScript=n;const url=new URL(n.src);lastCallback=url.searchParams.get('callback');if(url.searchParams.get('output')!=='JSON')throw new Error('Wrong output');if(transportMode==='success')queueMicrotask(()=>window[lastCallback]({status:'1',tips:[{name:'Controlled',location:'0,0'}],route:{paths:[{distance:'0',duration:'0',steps:[]}],transits:[]}}));if(transportMode==='provider-error')queueMicrotask(()=>window[lastCallback]({status:'0',info:'Controlled provider rejection',infocode:'10003'}));continue;}nativeAppend(n);}};
const checks=[];
const check=(name,ok)=>{checks.push({name,passed:!!ok});if(!ok)throw new Error(name)};
const tick=()=>new Promise(r=>setTimeout(r,0));
const change=(root,name,value)=>{const e=root.querySelector('[data-route="'+name+'"]');e.value=value;e.dispatchEvent(new Event('change',{bubbles:true}))};
const input=(root,name,value)=>{const e=root.querySelector('[data-route="'+name+'"]');e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}))};
const click=(root,name)=>root.querySelector('[data-route="'+name+'"]').click();
let epoch={identityGeneration:1,elderGeneration:1,viewGeneration:1,mapGeneration:1,screen:'tripMap',viewRole:'elder',elderId:'',demoMode:true};
let queries=0,locateCalls=0,pending=null,delayed=false,denied=false,positionPending=null,delayPosition=false;
const root=document.querySelector('#preview');
const deps={language:'cantonese',context:()=>({...epoch}),current:()=>true,
 locate:async()=>{locateCalls++;if(delayPosition){delayPosition=false;return new Promise(resolve=>{positionPending=resolve})}if(denied)throw new Error('Controlled location denied');return {lng:0,lat:0}},
 search:async()=>[{name:'Same name',location:{lng:0,lat:0}},{name:'Same name',location:{lng:1,lat:1}}],
 query:async(q)=>{queries++;if(delayed){delayed=false;return new Promise((resolve,reject)=>{pending={q,resolve,reject}})}return q.sourceMode==='simulation'?simulationRoute(q,q.sampleId):queryRoute(q)}
};
async function main(){
 const controller=mountRoutePreview(root,deps);
 check('initial live selection makes no provider or location request',queries===0&&locateCalls===0);
 change(root,'source','simulation');await tick();
 check('explicit simulation gives synthetic routes/line/steps',root.querySelectorAll('[data-route-result] svg polyline').length>0&&root.textContent.includes('非真實香港'));
 const q0=queries,id=controller.state.requestId,plans=controller.state.plans,batch=JSON.stringify(plans);
 change(root,'plan',plans[1].id);change(root,'plan',plans[0].id);await tick();
 check('A-B-A does not query or mutate provider batch',queries===q0&&controller.state.requestId===id&&JSON.stringify(plans)===batch);
 change(root,'mode','transit');await tick();check('transit ordered access/transfer/egress and two rides',controller.state.plans[0].transferCount===1&&root.querySelectorAll('[data-route="option"]').length===2);
 const before=queries;const option=root.querySelector('[data-route="option"]');option.value=option.options[1].value;option.dispatchEvent(new Event('change',{bubbles:true}));await tick();
 option.value=option.options[0].value;option.dispatchEvent(new Event('change',{bubbles:true}));await tick();check('same-leg alternatives roundtrip do not query/increase transfers',queries===before&&controller.state.plans[0].transferCount===1);
 const wheel=root.querySelector('[data-route="wheelchair"]');wheel.checked=true;wheel.dispatchEvent(new Event('change',{bubbles:true}));await tick();
 check('wheelchair toggle never re-queries',queries===before);
 for(const scenario of ['partial','insufficient','no-date','expired','conflict','barrier','staff','complete']){change(root,'scenario',scenario);await tick();const c=root.querySelector('[data-accessibility]');check('accessibility boundary '+scenario,!!c&&c.textContent.length>0&&c.querySelector('[data-source-kind="simulated"]')!==null);if(scenario==='barrier')check('known barrier visibly disclosed',c.textContent.includes('階梯'));if(scenario==='staff')check('staff not-booked condition visible',c.textContent.includes('未預約'));if(scenario==='complete')check('confirmed simulation remains labelled',c.textContent.includes('已確認符合要求')&&c.textContent.includes('非真實香港'));}
 change(root,'scenario','no-route');await tick();check('no-route removes old lines/summary/conclusion',!root.querySelector('[data-route-result] svg')&&root.querySelector('[data-route-result]').textContent==='');
 change(root,'scenario','error');await tick();check('error does not create simulated success',controller.state.phase==='error'&&root.querySelector('[data-route-result]').textContent==='');
 change(root,'scenario','partial');await tick();
 delayed=true;change(root,'mode','walking');const old=pending;check('waiting synchronously clears old line/steps/conclusion',root.querySelector('[data-route-result]').textContent==='');
 change(root,'mode','driving');await tick();const currentText=root.querySelector('[data-route-result]').textContent;old.resolve(simulationRoute(old.q,'partial'));await tick();check('late success cannot overwrite latest mode',controller.state.selection.mode==='driving'&&root.querySelector('[data-route-result]').textContent===currentText);
 delayed=true;change(root,'mode','walking');const oldError=pending;change(root,'mode','transit');await tick();oldError.reject(new Error('Controlled late error'));await tick();check('late failure cannot overwrite current success',controller.state.phase==='success');
 for(const key of ['identityGeneration','elderGeneration','viewGeneration','mapGeneration']){delayed=true;click(root,'run');const late=pending;epoch[key]++;late.resolve(simulationRoute(late.q,'partial'));await tick();check('context isolation '+key,root.querySelector('[data-route-result]').textContent==='');}
 for(const key of ['demoMode','viewRole','elderId']){delayed=true;click(root,'run');const late=pending;epoch[key]=key==='demoMode'?!epoch[key]:epoch[key]+'changed';late.reject(new Error('Controlled late context error'));await tick();check('context isolation '+key,root.querySelector('[data-route-result]').textContent==='');}
 delayed=true;click(root,'run');const oldSource=pending;change(root,'source','replay');await tick();oldSource.resolve(simulationRoute(oldSource.q,'partial'));await tick();check('source switch isolates old simulated response',controller.state.phase==='not-implemented'&&root.querySelector('[data-route-result]').textContent==='');
check('missing legal replay remains explicitly not implemented',controller.state.phase==='not-implemented'&&root.textContent.includes('payload'));
 change(root,'source','live');await tick();for(const [n,v] of [['origin-label','Public A'],['origin-point','0,0'],['destination-label','Public B'],['destination-point','1,1']])input(root,n,v);click(root,'run');await tick();check('live preflight failure remains live/not-sent/no fabricated success',controller.state.outcome?.status==='error'&&controller.state.outcome.provenance===null&&controller.state.selection.sourceMode==='live'&&root.querySelector('[data-route-result]').textContent==='');
 delayPosition=true;click(root,'device');change(root,'mode','transit');await tick();positionPending({lng:2,lat:2});await tick();check('mode switch rejects late GPS and preserves typed origin',root.querySelector('[data-route="origin-point"]').value==='0,0'&&controller.state.phase==='error');
 denied=true;click(root,'device');await tick();check('position denied preserves editable public inputs',root.querySelector('[data-route="destination-label"]').value==='Public B'&&root.textContent.includes('Controlled location denied'));denied=false;
 input(root,'origin-label','Same name');click(root,'search-origin');await tick();check('same-name candidates require explicit selection',root.querySelectorAll('[data-route="candidate"]').length===2&&queries>0);root.querySelector('[data-route="candidate"][data-index="1"]').click();check('explicit candidate selects chosen coordinate including legal zero elsewhere',root.querySelector('[data-route="origin-point"]').value==='1,1');
 input(root,'destination-point','bad');click(root,'run');await tick();check('missing coordinates rejected without success',controller.state.phase==='error'&&root.querySelector('[data-route-result]').textContent==='');
 delayed=true;change(root,'source','simulation');const leaving=pending;controller.dispose();leaving.resolve(simulationRoute(leaving.q,'partial'));await tick();check('dispose rejects late route',root.textContent==='');root.replaceChildren();
 // Transport is exercised only against intercepted scripts and original fake responses.
 const tips=await searchTips('Controlled');check('legacy search JSON callback parses legal zero',tips[0]?.location?.lng===0);
 const legacy=await planRoute('walking',{lng:0,lat:0},{lng:1,lat:1});check('legacy planRoute shape and formatter policies retained',legacy?.distanceM===0&&typeof formatDistance(0)==='string'&&typeof formatDuration(0)==='string');
 check('success releases JSON callback/script',!window[lastCallback]&&!lastScript.isConnected);
 const q={requestId:900,origin:{id:'a',label:'Controlled A',point:{lng:0,lat:0},selectionOrigin:'explicit-public-sample'},destination:{id:'b',label:'Controlled B',point:{lng:1,lat:1},selectionOrigin:'explicit-public-sample'},mode:'walking',sourceMode:'live',sampleId:null};
 ROUTE_LIVE_REVIEW.allowed=true;
 const success=await queryRoute(q);check('controlled sent success carries live attempt without being real evidence',success.status==='success'&&success.requestAttempt.status==='sent'&&success.provenance.kind==='live');
 transportMode='provider-error';const failed=await queryRoute(q);check('controlled provider failure remains live sent failure',failed.status==='error'&&failed.category==='quota'&&failed.requestAttempt.status==='sent'&&failed.provenance.kind==='live');
 transportMode='hold';const aborted=new AbortController();const inFlight=queryRoute(q,{signal:aborted.signal});aborted.abort();const cancelled=await inFlight;check('abort releases script callback and returns sent failure',cancelled.status==='error'&&cancelled.requestAttempt.status==='sent'&&!window[lastCallback]&&!lastScript.isConnected);
 const realTimer=window.setTimeout.bind(window);let bound=0;window.setTimeout=(callback,delay,...args)=>{if(delay===10000){bound=delay;delay=20;}return realTimer(callback,delay,...args)};const timed=await queryRoute(q);window.setTimeout=realTimer;check('bounded timeout releases callback script',bound===10000&&timed.status==='error'&&timed.category==='timeout'&&!window[lastCallback]&&!lastScript.isConnected);
 ROUTE_LIVE_REVIEW.allowed=false;transportMode='success';
 // Real engine navigation with deliberately absent map key and external CSP.
 const legacyRouteRegression=async(name)=>{
  ROUTE_LIVE_REVIEW.allowed=true;
  for(const [field,value] of [['origin-label','Controlled public origin'],['origin-point','0,0'],['destination-label','Controlled public destination'],['destination-point','1,1']])input(engineRoot,field,value);
  transportMode='provider-error';click(engineRoot,'run');await tick();check(name+' live error clears all old output',engineRoot.querySelector('[data-route-result]').textContent===''&&engineRoot.querySelector('[data-route-status]').textContent.includes('查詢失敗'));
  transportMode='success';click(engineRoot,'run');await tick();check(name+' explicit retry succeeds with retained endpoints despite absent geometry',!!engineRoot.querySelector('[data-route-result] [data-source-kind="live"]')&&engineRoot.querySelector('[data-route="origin-point"]').value==='0,0');
  transportMode='hold';click(engineRoot,'run');await tick();const late=window[lastCallback],callback=lastCallback;engineRoot.querySelector('[data-back]').click();await tick();late({status:'1',route:{paths:[{distance:'999',duration:'999',steps:[]}]}});await tick();check(name+' leave aborts callback and clears route page',!window[callback]&&!engineRoot.querySelector('[data-route-result]'));
  transportMode='success';ROUTE_LIVE_REVIEW.allowed=false;
 };
 const engineRoot=document.querySelector('#app');const disposeEngine=mountMemoApp(engineRoot,'');engineRoot.querySelector('[data-role="elder"]')?.click();engineRoot.querySelector('[data-action="frontDemo"]').click();await tick();
 const homeSearch=engineRoot.querySelector('[data-field="homeSearch"]');homeSearch.value='Controlled public';homeSearch.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,350));
 check('legacy home search displays controlled JSON callback candidate',!!engineRoot.querySelector('[data-homepick]'));
 engineRoot.querySelector('[data-homepick]').click();await tick();
 check('legacy home search keeps walking default and explicit zero destination',engineRoot.querySelector('[data-route="mode"]').value==='walking'&&engineRoot.querySelector('[data-route="destination-point"]').value==='0,0');
 await legacyRouteRegression('legacy home search navigation');
 engineRoot.querySelector('[data-placego]').click();await tick();check('legacy frequent place preserves driving default',engineRoot.querySelector('[data-route="mode"]').value==='driving');await legacyRouteRegression('legacy frequent place navigation');
 engineRoot.querySelector('[data-go="elderSettings"]').click();await tick();engineRoot.querySelector('[data-action="switchToFamily"]').click();await tick();engineRoot.querySelector('[data-go="schedule"]').click();await tick();engineRoot.querySelector('[data-navdest]').click();await tick();check('legacy scheduled destination preserves driving text draft',engineRoot.querySelector('[data-route="mode"]').value==='driving'&&engineRoot.querySelector('[data-route="destination-label"]').value.length>0&&engineRoot.querySelector('[data-route="destination-point"]').value==='');await legacyRouteRegression('legacy scheduled navigation');
 engineRoot.querySelector('[data-back]').click();await tick();engineRoot.querySelector('[data-go="elderMap"]').click();await tick();engineRoot.querySelector('[data-action="routeHome"]').click();await tick();
 check('legacy home navigation offers scrollable walking inputs without map/GPS prerequisite',!!engineRoot.querySelector('.route-preview-page')&&engineRoot.querySelector('[data-route="mode"]').value==='walking'&&engineRoot.querySelector('[data-route="destination-label"]').value.length>0&&engineRoot.querySelector('[data-route="destination-point"]').value==='');
 await legacyRouteRegression('legacy return home navigation');disposeEngine();engineRoot.replaceChildren();
 const disposeEntry=mountMemoApp(engineRoot,'');engineRoot.querySelector('[data-role="elder"]').click();engineRoot.querySelector('[data-action="frontDemo"]').click();await tick();engineRoot.querySelector('[data-go="tripMap"]').click();await tick();check('real engine exposes three-mode entry without requiring GPS',engineRoot.querySelector('[data-route="mode"]').options.length===3);
 change(engineRoot,'source','simulation');await tick();check('engine explicit simulation visible with independent static links',engineRoot.querySelector('[data-source-kind="simulated"]')&&engineRoot.querySelectorAll('.route-facilities [data-source-kind="static"]').length===3);
 engineRoot.querySelector('[data-back]').click();await tick();check('engine nav/back clears preview and old outcome',!engineRoot.querySelector('[data-route-result]'));
 // Exercise the actual old search handlers with the same isolated JSONP adapter.
 // No save/confirm action is used; all place/trip drafts stay in page memory.
 const searchRegression=async(field,panel,pick)=>{
  const enter=async(value)=>{const el=engineRoot.querySelector('[data-field="'+field+'"]');el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>setTimeout(r,330));};
  transportMode='success';await enter('Controlled public');check(field+' search success',!!engineRoot.querySelector('[data-'+pick+']'));
  transportMode='provider-error';await enter('Retained input');check(field+' failure retains input and clears candidates',engineRoot.querySelector('[data-field="'+field+'"]').value==='Retained input'&&!engineRoot.querySelector('[data-'+pick+']')&&engineRoot.querySelector(field==='placeSearch'?'[data-placesearch-status]':'[data-'+panel+']').textContent.length>0);
  transportMode='hold';await enter('Old controlled query');const late=window[lastCallback];transportMode='success';await enter('Current controlled query');late({status:'1',tips:[{name:'Old late candidate',location:'1,1'}]});await tick();
  check(field+' retry succeeds and late candidate is isolated',!!engineRoot.querySelector('[data-'+pick+']')&&!engineRoot.querySelector('[data-'+panel+']').textContent.includes('Old late candidate'));
 };
 await searchRegression('homeSearch','homesuggest','homepick');
 engineRoot.querySelector('[data-go="elderSettings"]').click();await tick();engineRoot.querySelector('[data-action="switchToFamily"]').click();await tick();engineRoot.querySelector('[data-go="schedule"]').click();await tick();engineRoot.querySelector('[data-action="newTrip"]').click();await tick();await searchRegression('destination','destsuggest','destpick');
 engineRoot.querySelector('[data-back]').click();await tick();engineRoot.querySelector('[data-go="safety"]').click();await tick();engineRoot.querySelector('[data-action="addPlace"]').click();await tick();await searchRegression('placeSearch','placesuggest','placepick');
 disposeEntry();engineRoot.replaceChildren();
 const disposeSearch=mountMemoApp(engineRoot,'');engineRoot.querySelector('[data-role="elder"]').click();engineRoot.querySelector('[data-action="frontDemo"]').click();await tick();engineRoot.querySelector('[data-go="tripMap"]').click();await tick();ROUTE_LIVE_REVIEW.allowed=true;
 input(engineRoot,'origin-label','Controlled public');click(engineRoot,'search-origin');await tick();check('route public search uses actual controlled JSON callback adapter',!!engineRoot.querySelector('[data-route="candidate"]'));
 transportMode='provider-error';click(engineRoot,'search-origin');await tick();check('route public search error retains name and clears candidates',engineRoot.querySelector('[data-route="origin-label"]').value==='Controlled public'&&!engineRoot.querySelector('[data-route="candidate"]')&&engineRoot.querySelector('[data-route-status]').textContent.includes('查詢失敗'));
 transportMode='hold';click(engineRoot,'search-origin');await tick();const searchLate=window[lastCallback],searchCallback=lastCallback;transportMode='success';input(engineRoot,'origin-label','Current public');click(engineRoot,'search-origin');await tick();searchLate({status:'1',tips:[{name:'Old late search',location:'1,1'}]});await tick();check('route public search retry and abort isolate late callback',!window[searchCallback]&&!!engineRoot.querySelector('[data-route="candidate"]')&&!engineRoot.querySelector('[data-route-candidates]').textContent.includes('Old late search'));
 disposeSearch();engineRoot.replaceChildren();ROUTE_LIVE_REVIEW.allowed=false;
 // Final exportable limited story: simulated transit+partial, no field/full real sample.
 const final=mountRoutePreview(root,{...deps,language:'cantonese'});change(root,'source','simulation');await tick();change(root,'mode','transit');await tick();const w=root.querySelector('[data-route="wheelchair"]');w.checked=true;w.dispatchEvent(new Event('change',{bubbles:true}));await tick();
 check('all displayed route/evidence/facility items have source types',Array.from(root.querySelectorAll('article')).every(a=>a.hasAttribute('data-source-kind')));
 root.querySelector('[data-route="mode"]').focus();check('native control accepts keyboard focus',document.activeElement===root.querySelector('[data-route="mode"]'));
 check('narrow screen has no horizontal page overflow',document.documentElement.scrollWidth<=window.innerWidth);
 document.querySelector('.memopath-stage').style.cssText='display:block;padding:12px;min-height:0';engineRoot.style.display='none';root.style.width='100%';document.body.style.cssText='margin:0;width:390px;max-width:100%';document.querySelector('#summary').style.cssText='font-size:16px;overflow-wrap:anywhere;margin:12px';
 document.querySelector('#summary').textContent='受控模擬驗證：不含真實供應商或實地證據';
 check('final preview fits 390px viewport',root.getBoundingClientRect().right<=390);
 const displayedItems=Array.from(root.querySelectorAll('[data-route-result] article, [data-accessibility] article > div, .route-facilities article'));
 const report={sourceLabels:{displayedItems:displayedItems.length,labelledItems:displayedItems.filter(a=>a.hasAttribute('data-source-kind')).length,scope:'Currently displayed synthetic route/conclusion/evidence and static link cards; not unexecuted live/replay'},viewportWidth:window.innerWidth,previewBounds:root.getBoundingClientRect().toJSON(),kind:'controlled-browser-simulation',checks,queries,locationControls:locateCalls,realProviderRequests:0,realConfirmedSamples:0,requiredFieldVisits:0,requiredLongTermMaintenance:0};
 await fetch('/report',{method:'POST',body:JSON.stringify(report)});
}
main().catch(async error=>{document.querySelector('#summary').textContent='FAILED: '+error.message;await fetch('/report',{method:'POST',body:JSON.stringify({kind:'controlled-browser-simulation',checks,error:error.message})})});
`;

async function main():Promise<void>{
 const browser=process.env.ROUTE_VALIDATION_BROWSER??['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
 if(!browser)throw new Error('Installed Chromium browser unavailable; UI verification remains not-run');
 const workspace=resolve('.local-validation');mkdirSync(workspace,{recursive:true});const temporary=mkdtempSync(join(workspace,'route-ui-'));
 const evidence=resolve('../specs/003-multimodal-accessibility/evidence');mkdirSync(evidence,{recursive:true});
 let report:Record<string,unknown>|null=null;let apiRequests=0;let child:ReturnType<typeof spawn>|null=null;
 const server=createServer(async(req,res)=>{
  const path=new URL(req.url??'/','http://127.0.0.1').pathname;
  res.setHeader('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  if(path==='/report'&&req.method==='POST'){const chunks:Buffer[]=[];for await(const c of req)chunks.push(Buffer.from(c));report=JSON.parse(Buffer.concat(chunks).toString());res.end('ok');return;}
  if(path.startsWith('/api/'))apiRequests++;
  if(path==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(readFileSync(join(temporary,'bundle.js')));return;}
  if(path==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Explicit controlled route validation</title></head><body><h1 id="summary">Explicit controlled simulation; no real provider/GPS/account</h1><div class="memopath-stage"><main id="preview" style="width:360px;max-width:100%"></main><main id="app"></main></div><script src="/bundle.js"></script></body></html>');return;}
  res.writeHead(404);res.end('not found');
 });
 try{
  await build({stdin:{contents:browserProgram,resolveDir:process.cwd(),sourcefile:'route-controlled-validation.ts'},bundle:true,format:'iife',platform:'browser',outfile:join(temporary,'bundle.js'),define:{'import.meta.env':JSON.stringify({VITE_AMAP_KEY:'CONTROLLED_NONSECRET_TEST_KEY',PROD:false,DEV:true})},logLevel:'silent'});
  // Bundle styles as a separate local stylesheet by injecting original CSS safely.
  const css=(await import('../../client/src/pages/MemoPathPage/memopath-styles')).MEMOPATH_CSS;
  const bundle=readFileSync(join(temporary,'bundle.js'),'utf8');writeFileSync(join(temporary,'bundle.js'),'const routeStyle=document.createElement("style");routeStyle.textContent='+JSON.stringify(css)+';document.head.append(routeStyle);\n'+bundle);
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw new Error('No loopback port');
  const url='http://127.0.0.1:'+address.port+'/';
  child=spawn(browser,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-gpu','--force-device-scale-factor=1','--hide-scrollbars','--window-size=390,844','--user-data-dir='+join(temporary,'profile'),'--virtual-time-budget=12000','--dump-dom','--screenshot='+join(evidence,'browser-simulation.png'),url],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let html='';child.stdout?.on('data',b=>{if(html.length<1000000)html+=b.toString()});child.stderr?.resume();
  await new Promise<void>((r,j)=>{const timer=setTimeout(()=>{child?.kill();j(new Error('Bounded browser validation timeout'))},45000);child!.on('error',e=>{clearTimeout(timer);j(e)});child!.on('exit',code=>{clearTimeout(timer);if(code===0)r();else j(new Error('Browser exited '+code))})});
  if(!report)throw new Error('Browser produced no report: '+html.replace(/<[^>]*>/g,' ').slice(-800));
  const final={date:new Date().toISOString(),...report,apiRequests,externalTraffic:'Blocked by CSP; fake/absent map key; provider scripts intercepted before DOM; no real provider/GPS calls',artifact:'Current esbuild bundle of source',scope:'Synthetic DOM and engine navigation only; not real provider, account/elder API or physical accessibility'};
  writeFileSync(join(evidence,'browser-validation.json'),JSON.stringify(final,null,2)+'\n');
  const checks=report.checks as {passed:boolean}[];if(report.error||checks.some(c=>!c.passed)||apiRequests!==0)throw new Error('UI assertion failed: '+String(report.error??'see report'));
  process.stdout.write(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,apiRequests,realProviderRequests:0,evidence:'specs/003-multimodal-accessibility/evidence/browser-validation.json'})+'\n');
 }finally{
  child?.kill();await new Promise<void>(r=>server.close(()=>r()));
  // Verify absolute ownership before recursive removal, using one runtime end-to-end.
  const target=resolve(temporary);if(target.startsWith(workspace+'\\')||target.startsWith(workspace+'/'))rmSync(target,{recursive:true,force:true,maxRetries:5,retryDelay:200});else {process.stderr.write('Cleanup refused outside validation workspace');process.exitCode=1;}
 }
}
main().catch(error=>{process.stderr.write(String(error.message)+'\n');process.exitCode=1});
