/** Bounded actual SQL/HTTP browser fixture. Only protected DATABASE_URL_TEST and
 * this run's random accounts are used. CSP denies provider traffic explicitly;
 * it never fabricates route success. Public route simulation remains user-selected.
 * Finish via the owned control file; deadline/finally cleans accounts and services.
 */
import {createServer} from 'node:http';
import {createServer as createPortProbe} from 'node:net';
import {existsSync,mkdirSync,readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {api,fixtureAccount,startTestServer,testDatabase} from './helpers';

async function main(){
 const smoke=process.argv.includes('--smoke');
 const control=resolve('.local-validation/route-identity-control.json'),state=resolve('.local-validation/route-identity-state.json');
 mkdirSync('.local-validation',{recursive:true});if(existsSync(control)||existsSync(state))throw Error('An owned fixture is already present; finish it first');
 const db=testDatabase();let server:Awaited<ReturnType<typeof startTestServer>>|null=null;const keys=[fixtureAccount('route_family'),fixtureAccount('route_elder')];
 const counts:Record<string,number>={};let relay:ReturnType<typeof createServer>|null=null;
 try{
  await db`SELECT 1`;
  // Refuse an existing listener rather than mistake another server for ours.
  const probe=createPortProbe();await new Promise<void>((ready,reject)=>{probe.once('error',reject);probe.listen(3104,'127.0.0.1',()=>probe.close(()=>ready()));});
  server=await startTestServer(3104);
  const upstreamBase=server.base;
  const registered=[];
  for(const [i,account] of keys.entries()){
   const r=await api(server.base,'/auth/register',{method:'POST',body:{account,password:'Synthetic123!',role:i?'elder':'family',elder:{name:'本次合成路線長者'}}});assert.equal(r.status,201);registered.push(r.body);
  }
  const elder=(await api(server.base,'/elders',{token:registered[0].token})).body.items[0];
  const invite=await api(server.base,'/care-links/invitations',{method:'POST',token:registered[0].token,body:{elderId:elder.id,elderAccount:keys[1]}});assert.equal(invite.status,201);
  assert.equal((await api(server.base,'/care-links/accept',{method:'POST',token:registered[1].token,body:{code:invite.body.code,confirm:true}})).status,201);
  relay=createServer(async(req,res)=>{
   // Explicit controlled provider failure on this fixture, never an account or
   // route API proxy in the product. Real local business responses pass through.
   res.setHeader('content-security-policy',"script-src 'self'; connect-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'");
   const pathname=new URL(req.url??'/','http://127.0.0.1').pathname;const key=(req.method??'GET')+' '+pathname;counts[key]=(counts[key]??0)+1;
   try{const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const headers=new Headers();for(const name of ['content-type','x-memopath-token']){const value=req.headers[name];if(typeof value==='string')headers.set(name,value);}
    const upstream=await fetch(upstreamBase+(req.url??'/'),{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined,signal:AbortSignal.timeout(15000)});
    res.writeHead(upstream.status,{'content-type':upstream.headers.get('content-type')??'application/octet-stream'});res.end(Buffer.from(await upstream.arrayBuffer()));
   }catch{res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({message:'Actual isolated service unavailable'}));}
  });
  await new Promise<void>((ready,reject)=>{relay!.once('error',reject);relay!.listen(3105,'127.0.0.1',ready);});writeFileSync(control,JSON.stringify({finish:smoke}));const deadline=Date.now()+12*60*1000;
  while(Date.now()<deadline){writeFileSync(state,JSON.stringify({base:'http://127.0.0.1:3105',accounts:keys,counts}));let finish=false;try{finish=JSON.parse(readFileSync(control,'utf8')).finish===true;}catch{/* bounded transient control write */}if(finish)break;await new Promise(r=>setTimeout(r,250));}
 }finally{
  if(relay){relay.closeAllConnections();await new Promise<void>(r=>relay!.close(()=>r()));}await server?.close();
  try{
   const owned=await db`SELECT id FROM memopath_account WHERE account_key IN ${db(keys)}`;
   for(const row of owned)await db`DELETE FROM memopath_elder WHERE owner_account_id=${row.id}`;
   for(const row of owned){await db`DELETE FROM memopath_setting WHERE account_id=${row.id}`;await db`DELETE FROM memopath_account WHERE id=${row.id}`;}
   const remaining=await db`SELECT count(*)::int AS count FROM memopath_account WHERE account_key IN ${db(keys)}`;assert.equal(remaining[0].count,0);
  }finally{await db.end({timeout:5});}
  for(const p of [control,state])if(existsSync(p))unlinkSync(p);
  const evidence=resolve('../specs/003-multimodal-accessibility/evidence/'+(smoke?'identity-fixture-smoke-cleanup.json':'identity-fixture-cleanup.json'));writeFileSync(evidence,JSON.stringify({date:new Date().toISOString(),kind:smoke?'actual-fixture-startup-cleanup-smoke':'actual-test-SQL-HTTP-owned-fixture',remainingAccounts:0,servicesStopped:[3104,3105],providerTraffic:'CSP explicitly blocked',counts,developmentDatabaseChanged:false,newMigrations:0},null,2)+'\n');
 }
}
main().catch(()=>{console.error('Actual isolated route identity fixture failed; no credentials logged');process.exitCode=1;});
