/** Fresh Windows source snapshot without node_modules/dist/private config.
 * Official npm ci, checks, build and all nine real suites run sequentially.
 * Retains failed target/logs; never resets a development DB or persistent volume.
 */
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
const postgres=require('postgres'),c=require('./config.cjs');const root=path.resolve(__dirname,'..');let stage='configuration';
async function run(){c.loadEnvironment(root);const cfg=c.readConfig(process.env,{requireTestDatabase:true});const suffix=randomUUID().replaceAll('-','');
 const target=path.join(root,'.local-validation','002-final-clean-'+suffix);fs.mkdirSync(target,{recursive:true});
 const git=spawnSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','existing_app'],{cwd:path.dirname(root),encoding:'utf8'});if(git.status!==0)throw new Error('Source inventory unavailable');
 const files=[...new Set(git.stdout.split('\0').filter(Boolean))];let count=0;
 for(const file of files){const relative=path.relative('existing_app',file);if(relative.startsWith('..')||/^(?:\.env(?:\.|$)(?!example)|node_modules|dist|\.local-)/.test(relative))continue;
  const source=path.resolve(path.dirname(root),file);if(!fs.existsSync(source)||!fs.statSync(source).isFile())continue;
  const destination=path.join(target,relative);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(source,destination);count++;}
 const testName='pathmate_clean_'+suffix+'_test';const url=new URL(cfg.DATABASE_URL_TEST);url.pathname='/'+testName;const admin=postgres(cfg.DATABASE_URL_TEST,{max:1});
 try{await admin.unsafe('CREATE DATABASE "'+testName+'"');}finally{await admin.end();}
 const env={...process.env,DATABASE_URL_TEST:url.toString(),VITE_AMAP_KEY:'',COMPOSE_PROJECT_NAME:path.basename(root)};const npm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 const results=[];for(const args of [['ci'],['run','lint'],['run','build'],['run','test:integration']]){
  stage=args.join(' ');console.log('Clean verification: '+stage);
  const result=spawnSync(process.execPath,[npm,...args],{cwd:target,env,encoding:'utf8',timeout:600000,maxBuffer:10*1024*1024});
  fs.writeFileSync(path.join(root,'.local-validation','clean-'+suffix+'-'+args.at(-1).replace(/[^a-z0-9_-]/gi,'-')+'.log'),(result.stdout||'')+(result.stderr||''));
  results.push({operation:stage,status:result.status});if(result.error||result.status!==0)throw new Error('Clean verification failed');
 }
 const evidence={operation:'verify_clean',result:'passed',directory:target,testDatabase:testName,sourceFiles:count,privateConfigCopied:false,mapKeyConfigured:false,lockSha256:createHash('sha256').update(fs.readFileSync(path.join(target,'package-lock.json'))).digest('hex'),results};
 fs.writeFileSync(path.join(root,'.local-validation/clean-verification-result.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}
run().catch(()=>{console.error('Clean verification failed at '+stage+'; isolated source/test database and ignored diagnostics retained. Development database unchanged.');process.exitCode=1;});
