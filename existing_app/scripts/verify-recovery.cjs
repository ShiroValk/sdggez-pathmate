/** Recovery rehearsal creates only new synthetic test/recovery databases.
 * Keeps the upgraded source/fault archive and old recovery point separate;
 * never reconnects the user's app or imports post-upgrade data into old schema.
 */
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {randomUUID,scryptSync}=require('node:crypto');
const {spawnSync,spawn}=require('node:child_process');
const postgres=require('postgres'),c=require('./config.cjs');
const root=path.resolve(__dirname,'..');let stage='configuration';let child;
async function stop(){if(child&&child.exitCode===null&&child.signalCode===null){const wait=new Promise(resolve=>child.once('exit',resolve));child.kill();await wait;}}
function command(args,env){const result=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:120000});if(result.error||result.status!==0)throw new Error('Rehearsal command failed');return result.stdout.trim();}
async function run(){
 c.loadEnvironment(root);const cfg=c.readConfig(process.env,{requireTestDatabase:true});const suffix=randomUUID().replaceAll('-','');
 const sourceName='pathmate_recovery_'+suffix+'_test',restoreName='pathmate_restore_rehearsal_'+suffix.slice(0,24);
 const url=new URL(cfg.DATABASE_URL_TEST);url.pathname='/'+sourceName;
 const admin=postgres(cfg.DATABASE_URL_TEST,{max:1});let db;
 const env={...process.env,DATABASE_URL:url.toString()};const archive='.local-backups/recovery_'+suffix+'_0000.dump';
 const faultArchive='.local-backups/recovery_'+suffix+'_0001.dump';
 try{
  stage='initialize new 0000 fixture';await admin.unsafe('CREATE DATABASE "'+sourceName+'"');command(['scripts/db.cjs','migrate','--to','0000'],env);
  db=postgres(url.toString(),{max:1});const account=randomUUID(),elder=randomUUID(),salt=randomUUID().replaceAll('-','');const key='recovery_'+suffix;
  const passwordHash=salt+':'+scryptSync('Synthetic123!',salt,64,{N:16384,r:8,p:1}).toString('hex');
  await db`INSERT INTO memopath_account(id,account_key,password_hash,role,display_name,session_token_hash,session_expires_at) VALUES(${account},${key},${passwordHash},'family','Recovery synthetic',${'b'.repeat(64)},now()+interval '1 day')`;
  await db`INSERT INTO memopath_elder(id,owner_account_id,name,nickname,relation,gender,address,phone,emergency_phone) VALUES(${elder},${account},'Recovery elder','','','','Synthetic recovery address','','')`;
  await db`INSERT INTO memopath_place(elder_id,label) VALUES(${elder},'Legacy recovery place')`;
  await db.end();db=undefined;
  stage='verified official 0000 backup';command(['scripts/db.cjs','backup','--output',archive],env);
  stage='upgrade and add new data';command(['scripts/db.cjs','migrate','--to','0001'],env);
  const base='http://127.0.0.1:3118';child=spawn(process.execPath,['dist/server/main.js'],{cwd:root,env:{...env,SERVER_PORT:'3118',NODE_ENV:'production'},stdio:'ignore'});
  async function request(route,method='GET',body,token){const response=await fetch(base+'/api/memopath'+route,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{'x-memopath-token':token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(5000)});return{status:response.status,body:await response.json()};}
  let ready=false;for(let i=0;i<200;i++){try{if((await request('/auth/exists')).status===200){ready=true;break;}}catch{/* Retry only real startup readiness. */}await new Promise(resolve=>setTimeout(resolve,100));}assert.equal(ready,true);
  const family=await request('/auth/login','POST',{account:key,password:'Synthetic123!'});assert.equal(family.status,201);
  const eKey='recover_e_'+suffix;
  const e=await request('/auth/register','POST',{account:eKey,password:'Synthetic123!',role:'elder',elder:{name:'Recovery consent fixture'}});assert.equal(e.status,201);
  const invitation=await request('/care-links/invitations','POST',{elderId:elder,elderAccount:eKey},family.body.token);assert.equal(invitation.status,201);
  assert.equal((await request('/care-links/accept','POST',{code:invitation.body.code,confirm:true},e.body.token)).status,201);
  assert.equal((await request('/places','POST',{elderId:elder,label:'Post-upgrade place',address:'Synthetic new data',lng:114.1,lat:22.3},family.body.token)).status,201);
  await stop();
  stage='preserve upgraded fault archive';command(['scripts/db.cjs','backup','--output',faultArchive],env);
  stage='restore old recovery point';command(['scripts/db.cjs','restore','--input',archive,'--database',restoreName],env);
  command(['scripts/db.cjs','verify','--database',restoreName],env);
  stage='actual matching 0000 archived build';command(['scripts/verify-baseline.cjs','--restored',restoreName],env);
  command(['scripts/db.cjs','verify','--database',restoreName],env);
  stage='latest build rejects old schema';const restoredUrl=new URL(url);restoredUrl.pathname='/'+restoreName;
  const rejected=spawnSync(process.execPath,['dist/server/main.js'],{cwd:root,env:{...env,DATABASE_URL:restoredUrl.toString(),SERVER_PORT:'3118',NODE_ENV:'production'},encoding:'utf8',timeout:10000});assert.notEqual(rejected.status,0);
  const original=JSON.parse(fs.readFileSync(path.join(root,archive+'.json'),'utf8'));const upgraded=JSON.parse(fs.readFileSync(path.join(root,faultArchive+'.json'),'utf8'));
  const evidence={operation:'verify_recovery',result:'passed',sourceDatabase:sourceName,restoredDatabase:restoreName,recoveryPoint:original.createdAt,originalSha256:original.sha256,faultSha256:upgraded.sha256,
    isolatedDifferences:{accountRows:upgraded.tables.memopath_account.count-original.tables.memopath_account.count,placeRows:upgraded.tables.memopath_place.count-original.tables.memopath_place.count,newCareLinks:upgraded.tables.memopath_care_link.count},
    checks:['0000 official backup and isolated verification','0001 upgrade and real new place/consent','0001 fault archive','new-only restore','all old field/owner/count hashes','all old sessions revoked','actual archived 0000 login/logout/isolation/save/restart','latest build refuses 0000','new data preserved separately, not imported'],applicationSwitched:false};
  fs.writeFileSync(path.join(root,'.local-validation/recovery-rehearsal-result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 }finally{await stop();await db?.end();await admin.end();}
}
run().catch(()=>{console.error('Recovery rehearsal failed at '+stage+'; new isolated targets preserved; development database/application connection unchanged.');process.exitCode=1;});
