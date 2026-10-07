/** Offline independence/secret audit. Only paths, rule IDs, counts and hashes
 * are printed. Never print a matched secret or raw git/npm output. Accessible
 * Git history is inspected without rewriting commits or changing credentials.
 */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const c=require('./config.cjs');const root=path.resolve(__dirname,'..');
const findings=[];
function command(executable,args,input){const result=spawnSync(executable,args,{cwd:root,input,encoding:'buffer',maxBuffer:100*1024*1024});if(result.error||result.status!==0)throw new Error('Audit command failed');return result.stdout;}
function visit(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?visit(path.join(dir,item.name)):item.isFile()?[path.join(dir,item.name)]:[]);}
function scan(bytes,file,scope,secrets){
 const text=bytes.toString('utf8');const rules=[];
 if(/(?:key\s*=\s*["']?|(?:AMAP_KEY|amapKey|apiKey|AMAP_API_KEY|GAODE_KEY)\s*[:=]\s*["'])[a-f0-9]{32}\b/i.test(text))rules.push('hardcoded-map-key');
 if(secrets.some(secret=>secret.length>=16&&text.includes(secret)))rules.push('configured-secret-literal');
 const urls=[...text.matchAll(/(?:postgres(?:ql)?:\/\/)([^\s"':]+):([^\s"']+)@(?:localhost|127\.0\.0\.1)/gi)];
 if(urls.some(match=>!(match[1]==='unit'&&match[2]==='synthetic')&&!/^<[^>]+>$/.test(match[2]))&&!file.endsWith('.env.example'))rules.push('literal-database-credential');
 for(const rule of rules)if(!findings.some(item=>item.path===file&&item.scope===scope&&item.rule===rule))findings.push({scope,path:file,rule});
}
try{
 c.loadEnvironment(root);const secrets=[process.env.VITE_AMAP_KEY,process.env.POSTGRES_PASSWORD].filter(Boolean);
 const directories=['client','server','shared','scripts'];const files=directories.flatMap(dir=>visit(path.join(root,dir))).concat(fs.readdirSync(root).filter(name=>/^(package(?:-lock)?\.json|tsconfig.*\.json|.*\.config\.[cm]?[jt]s|\.env\.example|compose\.yaml)$/.test(name)).map(name=>path.join(root,name)));
 let platformRequired=0;
 for(const file of files){const rel=path.relative(root,file).replaceAll('\\','/');const bytes=fs.readFileSync(file);scan(bytes,rel,'current-source',secrets);
  if(rel==='scripts/audit-independence.cjs')continue;
  const text=bytes.toString('utf8');if(/(?:from\s*["']|require\(["']|extends["']?\s*:\s*["']|["']@lark-apaas\/)[^\n]*@lark-apaas|["']@lark-apaas\//.test(text))platformRequired++;
 }
 const tree=JSON.parse(command(process.execPath,[path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js'),'ls','--all','--json']).toString());
 let platformPackages=0;function dependency(node){for(const [name,item] of Object.entries(node.dependencies||{})){if(name.startsWith('@lark-apaas/'))platformPackages++;dependency(item);}}dependency(tree);
 const artifacts=fs.existsSync(path.join(root,'dist'))?visit(path.join(root,'dist')).filter(file=>/\.(js|html|css)$/.test(file)):[];
 let injectedMapArtifacts=0;for(const file of artifacts){const bytes=fs.readFileSync(file);
  if(process.env.VITE_AMAP_KEY&&bytes.includes(Buffer.from(process.env.VITE_AMAP_KEY))){injectedMapArtifacts++;/* Browser key injection is expected and deliberately separate. */}
  if(bytes.includes(Buffer.from('@lark-apaas/')))platformRequired++;
 }
 let history='unavailable',historyObjects=0;
 try{
  const listing=command('git',['rev-list','--objects','--all']).toString().split('\n').map(line=>{const split=line.indexOf(' ');return split>0?{id:line.slice(0,split),path:line.slice(split+1)}:null;}).filter(item=>item&&/\.(?:[cm]?[jt]sx?|json|md|ya?ml|env|example)$/.test(item.path));
  const unique=[...new Map(listing.map(item=>[item.id,item])).values()];
  const bytes=command('git',['cat-file','--batch'],Buffer.from(unique.map(item=>item.id).join('\n')+'\n'));let offset=0;
  for(const item of unique){const newline=bytes.indexOf(10,offset),header=bytes.subarray(offset,newline).toString();const [,type,length]=header.split(' ');const size=Number(length);offset=newline+1;if(type==='blob'&&Number.isFinite(size)){scan(bytes.subarray(offset,offset+size),item.path,'git-history',secrets);historyObjects++;}offset+=size+1;}
  history='checked';
 }catch{/* A shallow/absent/inaccessible history is an explicit limitation, never clean evidence. */}
 const evidence={operation:'audit_independence',result:platformRequired||platformPackages||findings.some(item=>item.scope==='current-source')?'failed':findings.length||history==='unavailable'?'action_required':'passed',platformRequiredReferences:platformRequired,platformPackages,sourceFiles:files.length,artifactFiles:artifacts.length,injectedMapArtifacts,history,historyObjects,findings,historyRewritten:false};
 fs.mkdirSync(path.join(root,'.local-validation'),{recursive:true});fs.writeFileSync(path.join(root,'.local-validation/independence-audit.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 if(evidence.result!=='passed')process.exitCode=1;
}catch{console.error('Independence audit incomplete; check Git history, installed dependency tree and built artifacts. No secret values printed.');process.exitCode=1;}
