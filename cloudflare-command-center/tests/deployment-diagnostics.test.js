import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describeHealth,verifyDeployment} from '../scripts/verify-deployment.mjs';
import {describeWorkerSettings,describeBackupSettings,inspectWorkerSettings} from '../scripts/inspect-worker-settings.mjs';

const sentinel='FAKE-CREDENTIAL-MUST-NEVER-APPEAR';
const account='a'.repeat(32),database='4feb6f63-1102-467a-87e6-256309364f12';
const json=(body,status=200)=>Response.json(body,{status});
const settings=bindings=>({success:true,result:{bindings}});
const env={CLOUDFLARE_ACCOUNT_ID:account,CLOUDFLARE_API_TOKEN:sentinel};

test('backup settings report configuration presence without exposing client credentials',()=>{
 const pending=describeBackupSettings(settings([]));assert.deepEqual(pending.missing,['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']);
 const configured=describeBackupSettings(settings([{name:'GOOGLE_CLIENT_ID',type:'plain_text',text:sentinel},{name:'GOOGLE_CLIENT_SECRET',type:'secret_text',text:sentinel}]));
 assert.equal(configured.unsafeSecret,false);assert.deepEqual(configured.missing,[]);assert.ok(!JSON.stringify(configured).includes(sentinel));
 assert.equal(describeBackupSettings(settings([{name:'GOOGLE_CLIENT_SECRET',type:'plain_text',text:sentinel}])).unsafeSecret,true);
});

test('health diagnostics distinguish known causes and never echo arbitrary fields or bodies',async()=>{
 const cases=[
  [json({error:'Command Center configuration is incomplete. Set D1, OWNER_PASSWORD, and SESSION_SECRET.',token:sentinel},503),/HTTP 503: Worker configuration is incomplete/],
  [json({error:'Command Center database migrations are incomplete.',token:sentinel},503),/HTTP 503: D1 schema is incomplete/],
  [json({error:sentinel},403),/HTTP 403: health endpoint access was denied/],
  [json({error:sentinel},404),/HTTP 404: health endpoint was not found/],
  [json({error:sentinel},500),/HTTP 500: health endpoint returned an unexpected response/],
  [new Response(sentinel,{status:502}),/HTTP 502: health endpoint did not return valid JSON/]
 ];
 for(const [response,expected] of cases){
  const result=await describeHealth(response);
  assert.equal(result.ready,false);assert.match(result.detail,expected);assert.ok(!result.detail.includes(sentinel));
 }
 assert.equal((await describeHealth(json({ok:true,service:'superior-command-center',database:'ready'}))).ready,true);
});

test('live verification checks public pages before reporting sanitized readiness failure',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'superior-readiness-'));
 try{
  const log=join(dir,'deploy.log'),summary=join(dir,'summary'),paths=[];
  await writeFile(log,'https://superior-command-center.test.workers.dev');
  await assert.rejects(verifyDeployment(log,{attempts:1,summaryPath:summary,outputPath:'',fetchImpl:async url=>{
   const path=new URL(url).pathname;paths.push(path);
   return path==='/api/health'?json({error:sentinel},503):new Response('Superior public page');
  }}),error=>{assert.match(error.message,/HTTP 503/);assert.ok(!error.message.includes(sentinel));return true;});
  assert.deepEqual(paths,['/','/owner','/api/health']);
  const text=await readFile(summary,'utf8');assert.match(text,/HTTP 503/);assert.ok(!text.includes(sentinel));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('settings report only allowlisted binding metadata and expected database match',()=>{
 const report=describeWorkerSettings(settings([
  {name:'OWNER_PASSWORD',type:'secret_text',text:sentinel},
  {name:'SESSION_SECRET',type:'secret_text',text:sentinel},
  {name:'DB',type:'d1',id:database},
  {name:sentinel,type:'plain_text',text:sentinel}
 ]));
 assert.deepEqual(report.lines,['OWNER_PASSWORD: present (secret_text).','SESSION_SECRET: present (secret_text).','DB: present (d1); matches expected database: yes.']);
 assert.equal(report.unsafeOwnerBinding,false);assert.equal(report.wrongDatabase,false);assert.ok(!JSON.stringify(report).includes(sentinel));
});

test('settings preflight permits missing secrets with safe summary but blocks plaintext credentials',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'superior-settings-'));
 try{
  for(const type of [null,'plain_text',sentinel]){
   const lines=[],summary=join(dir,String(type));
   const bindings=[{name:'DB',type:'d1',id:database},...(type?[{name:'OWNER_PASSWORD',type,text:sentinel}]:[])];
   const task=inspectWorkerSettings({env:{...env,GITHUB_STEP_SUMMARY:summary},write:line=>lines.push(line),fetchImpl:async(url,options)=>{
    assert.equal(url,'https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/superior-command-center/settings');
    assert.equal(options.headers.Authorization,'Bearer '+sentinel);assert.equal(options.redirect,'error');
    return json(settings(bindings));
   }});
   if(type)await assert.rejects(task,/must use secret_text/);else await task;
   const output=lines.join('\n')+await readFile(summary,'utf8');
   assert.match(output,/SESSION_SECRET: missing/);assert.ok(!output.includes(sentinel));
  }
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('settings preflight sanitizes API, JSON, and network errors and detects a wrong DB binding',async()=>{
 for(const fetchImpl of [
  async()=>json({success:false,errors:[{code:10000,message:sentinel},{code:sentinel,message:sentinel}]},401),
  async()=>new Response(sentinel,{status:502}),
  async()=>{throw Error(sentinel);},
  async()=>json(settings([{name:'DB',type:'d1',id:sentinel}]))
 ]){
  const lines=[];
  await assert.rejects(inspectWorkerSettings({env,fetchImpl,write:line=>lines.push(line)}),error=>{
   assert.ok(!error.message.includes(sentinel));assert.match(error.message,/HTTP 401; API codes 10000|not valid JSON|network, timeout, or TLS|DB binding must match/);return true;
  });
  assert.ok(!lines.join('\n').includes(sentinel));
 }
});
