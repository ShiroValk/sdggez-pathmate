/** Bounded real Chromium DOM validation with original synthetic route inputs.
 * CSP refuses external traffic; no real Key/GPS/account/DB, and no success is real
 * provider evidence. Uses existing esbuild + installed browser, no dependencies.
 * Temporary profile/bundle/server are owned here and removed in finally. */
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,writeFileSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';


import {browserProgram} from "./route-ui-program";

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
  child=spawn(browser,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions','--disable-gpu','--force-device-scale-factor=1','--hide-scrollbars','--window-size=390,844','--user-data-dir='+join(temporary,'profile'),'--virtual-time-budget=12000','--dump-dom','--screenshot='+join(evidence,'r2-controlled-ui.png'),url],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let html='';child.stdout?.on('data',b=>{if(html.length<1000000)html+=b.toString()});child.stderr?.resume();
  await new Promise<void>((r,j)=>{const timer=setTimeout(()=>{child?.kill();j(new Error('Bounded browser validation timeout'))},45000);child!.on('error',e=>{clearTimeout(timer);j(e)});child!.on('exit',code=>{clearTimeout(timer);if(code===0)r();else j(new Error('Browser exited '+code))})});
  if(!report)throw new Error('Browser produced no report: '+html.replace(/<[^>]*>/g,' ').slice(-800));
  const final={date:new Date().toISOString(),...report,apiRequests,externalTraffic:'Blocked by CSP; fake/absent map key; provider scripts intercepted before DOM; no real provider/GPS calls',artifact:'Current esbuild bundle of source',scope:'Synthetic DOM and engine navigation only; not real provider, account/elder API or physical accessibility'};
  writeFileSync(join(evidence,'r2-browser-validation.json'),JSON.stringify(final,null,2)+'\n');
  const checks=report.checks as {passed:boolean}[];if(report.error||checks.some(c=>!c.passed)||apiRequests!==0)throw new Error('UI assertion failed: '+String(report.error??'see report'));
  process.stdout.write(JSON.stringify({checks:checks.length,passed:checks.filter(c=>c.passed).length,apiRequests,realProviderRequests:0,evidence:'specs/003-multimodal-accessibility/evidence/r2-browser-validation.json'})+'\n');
 }finally{
  child?.kill();await new Promise<void>(r=>server.close(()=>r()));
  // Verify absolute ownership before recursive removal, using one runtime end-to-end.
  const target=resolve(temporary);if(target.startsWith(workspace+'\\')||target.startsWith(workspace+'/'))rmSync(target,{recursive:true,force:true,maxRetries:5,retryDelay:200});else {process.stderr.write('Cleanup refused outside validation workspace');process.exitCode=1;}
 }
}
main().catch(error=>{process.stderr.write(String(error.message)+'\n');process.exitCode=1});
