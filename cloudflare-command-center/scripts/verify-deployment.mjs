import {readFile,appendFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

// Only fixed descriptions of known response fields are safe to publish in Actions.
export async function describeHealth(response){
 const status=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:0;
 const prefix='HTTP '+status+': ';
 let health;
 try{health=await response.json();}catch{
  return {ready:false,detail:prefix+'health endpoint did not return valid JSON.'};
 }
 if(response.ok&&health?.ok===true&&health.service==='superior-command-center'&&health.database==='ready')return {ready:true,detail:prefix+'D1 ready.'};
 if(health?.error==='Command Center configuration is incomplete. Set D1, OWNER_PASSWORD, and SESSION_SECRET.')return {ready:false,detail:prefix+'Worker configuration is incomplete; check DB, OWNER_PASSWORD, and SESSION_SECRET bindings.'};
 if(health?.error==='Command Center database migrations are incomplete.')return {ready:false,detail:prefix+'D1 schema is incomplete; check additive database migrations.'};
 if(status===401||status===403)return {ready:false,detail:prefix+'health endpoint access was denied; check Cloudflare access and routing.'};
 if(status===404)return {ready:false,detail:prefix+'health endpoint was not found; check the deployed Worker and routing.'};
 return {ready:false,detail:prefix+'health endpoint returned an unexpected response.'};
}

export async function verifyDeployment(logPath,{fetchImpl=fetch,attempts=6,retryDelayMs=5000,summaryPath=process.env.GITHUB_STEP_SUMMARY,outputPath=process.env.GITHUB_OUTPUT}={}){
const log=await readFile(logPath,'utf8');
const url=log.match(/https:\/\/superior-command-center\.[a-z0-9-]+\.workers\.dev\b/)?.[0];
if(!url)throw Error('Wrangler did not report the deployed Worker URL; no live success can be verified.');
async function get(path){
 try{return await fetchImpl(url+path,{signal:AbortSignal.timeout(15000),redirect:'follow',headers:{'Cache-Control':'no-cache'}});}
 catch{throw Error('Live request failed for '+path+' (network, timeout, or TLS error).');}
}
for(const path of ['/','/owner']){
 const response=await get(path);
 assert.equal(response.status,200,'Live page did not respond successfully: '+path);
 assert.ok(/superior/i.test(await response.text()),'Live page is missing Superior branding: '+path);
}
console.log('Live public Superior pages respond successfully.');
let ready=false;const diagnostics=new Set();
for(let attempt=0;attempt<attempts;attempt++){
 try{
  const health=await describeHealth(await get('/api/health'));ready=health.ready;diagnostics.add(health.detail);
 }catch{diagnostics.add('Health request failed (network, timeout, or TLS error).');}
 if(ready)break;
 if(attempt<attempts-1)await new Promise(resolve=>setTimeout(resolve,retryDelayMs));
}
if(!ready){
 const message='Live readiness failed. '+[...diagnostics].join(' ')+' Verify D1 migrations and Worker secrets OWNER_PASSWORD and SESSION_SECRET in Cloudflare.';
 if(summaryPath)await appendFile(summaryPath,message+'\n');
 throw Error(message);
}
for(const path of ['/api/estimates','/api/invoices','/api/reviews']){
 const response=await get(path);
 assert.equal(response.status,401,'Business records must require owner authentication: '+path);
}
const session=await get('/api/session');
assert.equal(session.status,200,'Live session endpoint failed.');
let sessionData;
try{sessionData=await session.json();}catch{throw Error('Live session endpoint did not return valid JSON.');}
assert.ok(sessionData?.authenticated===false,'An anonymous visitor must not have owner access.');
if(outputPath)await appendFile(outputPath,'url='+url+'\n');
if(summaryPath)await appendFile(summaryPath,
 'Verified website: ['+url+']('+url+')\n\n'+
 'Public pages respond, the live D1 binding can read the application schema, and owner records require authentication. '+
 'Production checks do not create, replace, or delete business records.\n');
console.log('Verified website: '+url);
console.log('Live D1 readiness and owner access protection passed.');
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await verifyDeployment(process.argv[2]);}catch(error){console.error(error.message);process.exitCode=1;}
}
