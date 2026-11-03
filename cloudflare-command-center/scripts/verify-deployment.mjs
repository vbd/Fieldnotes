import {readFile,appendFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const log=await readFile(process.argv[2],'utf8');
const url=log.match(/https:\/\/superior-command-center\.[a-z0-9-]+\.workers\.dev\b/)?.[0];
if(!url)throw Error('Wrangler did not report the deployed Worker URL; no live success can be verified.');
async function get(path){return fetch(url+path,{signal:AbortSignal.timeout(15000),redirect:'follow',headers:{'Cache-Control':'no-cache'}});}
let ready=false;
for(let attempt=0;attempt<6;attempt++){
 try{
  const response=await get('/api/health');
  if(response.ok){const health=await response.json();ready=health.ok===true&&health.service==='superior-command-center'&&health.database==='ready';}
 }catch{}
 if(ready)break;
 if(attempt<5)await new Promise(resolve=>setTimeout(resolve,5000));
}
assert.ok(ready,'Live database readiness failed. Verify D1 migrations and Worker secrets OWNER_PASSWORD and SESSION_SECRET in Cloudflare.');
for(const path of ['/','/owner']){
 const response=await get(path);
 assert.equal(response.status,200,'Live page did not respond successfully: '+path);
 assert.match(await response.text(),/superior/i,'Live page is missing Superior branding: '+path);
}
for(const path of ['/api/estimates','/api/invoices','/api/reviews']){
 const response=await get(path);
 assert.equal(response.status,401,'Business records must require owner authentication: '+path);
}
const session=await get('/api/session');
assert.equal(session.status,200,'Live session endpoint failed.');
assert.equal((await session.json()).authenticated,false,'An anonymous visitor must not have owner access.');
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,'url='+url+'\n');
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,
 'Verified website: ['+url+']('+url+')\n\n'+
 'Public pages respond, the live D1 binding can read the application schema, and owner records require authentication. '+
 'Production checks do not create, replace, or delete business records.\n');
console.log('Verified website: '+url);
console.log('Live D1 readiness and owner access protection passed.');
