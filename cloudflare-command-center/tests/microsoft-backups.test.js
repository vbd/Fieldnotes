import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {startMicrosoft,finishMicrosoft,uploadMicrosoftSnapshot,microsoftConfiguration} from '../src/microsoft-backups.js';

globalThis.crypto ??= webcrypto;
const origin='https://superior-command-center.superiormandr.workers.dev';
function fixture(){
 const rows=new Map();
 const db={prepare(sql){let args=[];return {bind(...values){args=values;return this;},async run(){
  if(sql.startsWith('INSERT INTO backup_oauth_states')){rows.set('state',args);return {meta:{changes:1}};}
  if(sql.startsWith('DELETE FROM backup_oauth_states')){const ok=rows.get('state')?.[0]===args[0]&&rows.get('state')?.[1]>args[1];if(ok)rows.delete('state');return {meta:{changes:Number(Boolean(ok))}};}
  if(sql.startsWith('INSERT INTO microsoft_backup_connection')){rows.set('connection',{id:1,account_id:args[0],refresh_token:args[1],connected_at:args[2]});return {meta:{changes:1}};}
  if(sql.startsWith('UPDATE microsoft_backup_connection SET refresh_token')){rows.get('connection').refresh_token=args[0];return {meta:{changes:1}};}
  throw Error('Unexpected SQL: '+sql);
 },async first(){if(sql.includes('microsoft_backup_connection'))return rows.get('connection')||null;throw Error('Unexpected SQL: '+sql);}}}};
 return {env:{DB:db,MICROSOFT_CLIENT_ID:'123e4567-e89b-42d3-a456-426614174000',MICROSOFT_CLIENT_SECRET:'test-secret',SESSION_SECRET:'test-session-secret'},rows};
}
test('Microsoft authorization uses consumer OAuth, approved scopes and one-time state',async()=>{
 const {env,rows}=fixture();
 const start=await startMicrosoft(new Request(origin+'/api/microsoft/connect'),env);
 assert.equal(start.status,303);
 const auth=new URL(start.headers.get('Location'));
 assert.equal(auth.hostname,'login.microsoftonline.com');
 assert.match(auth.pathname,/consumers\/oauth2\/v2\.0\/authorize/);
 assert.equal(auth.searchParams.get('redirect_uri'),origin+'/api/microsoft/callback');
 assert.match(auth.searchParams.get('scope'),/Files.ReadWrite/);
 assert.equal(rows.get('state')[0].length,64);
 const state=auth.searchParams.get('state');
 await assert.rejects(()=>finishMicrosoft(new Request(origin+'/api/microsoft/callback?state='+state+'&error=access_denied'),env),/not completed/);
 assert.equal(rows.has('state'),false);
});
test('Microsoft callback encrypts refresh token and rejects state replay',async()=>{
 const {env,rows}=fixture();
 const start=await startMicrosoft(new Request(origin+'/api/microsoft/connect'),env);
 const state=new URL(start.headers.get('Location')).searchParams.get('state');
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{
  if(String(url).endsWith('/token'))return Response.json({access_token:'access-test',refresh_token:'sensitive-refresh'});
  if(String(url).includes('/me?$select='))return Response.json({id:'account-123'});
  throw Error('Unexpected fetch '+url);
 };
 try{
  const url=origin+'/api/microsoft/callback?state='+state+'&code=valid-code';
  const response=await finishMicrosoft(new Request(url),env);
  assert.equal(response.status,303);
  assert.equal(rows.get('connection').account_id,'account-123');
  assert.doesNotMatch(rows.get('connection').refresh_token,/sensitive-refresh/);
  await assert.rejects(()=>finishMicrosoft(new Request(url),env),/not completed/);
 }finally{globalThis.fetch=oldFetch;}
});
test('OneDrive snapshot upload confirms returned file metadata',async()=>{
 const {env,rows}=fixture();
 const start=await startMicrosoft(new Request(origin+'/api/microsoft/connect'),env);
 const state=new URL(start.headers.get('Location')).searchParams.get('state');
 const oldFetch=globalThis.fetch;
 let uploaded;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.endsWith('/token'))return Response.json({access_token:'access-test',refresh_token:'sensitive-refresh'});
  if(u.includes('/me?$select='))return Response.json({id:'account-123'});
  if(u.includes('/root/children?'))return Response.json({value:[{id:'folder-id',name:'Superior Command Center Backups',folder:{}}]});
  if(u.includes('/content')){uploaded=JSON.parse(options.body);return Response.json({id:'file-id',name:'backup.json',size:new TextEncoder().encode(options.body).byteLength,webUrl:'https://onedrive.live.com/test'});}
  if(u.includes('/items/file-id?'))return Response.json({id:'file-id',size:new TextEncoder().encode(JSON.stringify(uploaded,null,2)).byteLength});
  throw Error('Unexpected fetch '+u);
 };
 try{
  await finishMicrosoft(new Request(origin+'/api/microsoft/callback?state='+state+'&code=ok'),env);
  const snapshot={estimates:[{id:'E1'}],invoices:[],reviews:[]};
  const result=await uploadMicrosoftSnapshot(env,snapshot,'backup.json');
  assert.equal(result.id,'file-id');
  assert.deepEqual(uploaded,snapshot);
  assert.equal(rows.get('connection').account_id,'account-123');
 }finally{globalThis.fetch=oldFetch;}
});

test('missing or malformed Microsoft client IDs cannot initiate OAuth; whitespace is normalized for both legs',async()=>{
 const {env}=fixture();
 for(const value of ['', 'undefined', 'not-an-application-id']){
  assert.equal(microsoftConfiguration({...env,MICROSOFT_CLIENT_ID:value}).configured,false);
  await assert.rejects(()=>startMicrosoft(new Request(origin+'/api/microsoft/connect'),{...env,MICROSOFT_CLIENT_ID:value}),/not configured/);
 }
 env.MICROSOFT_CLIENT_ID='  '+env.MICROSOFT_CLIENT_ID+'  ';
 const start=await startMicrosoft(new Request(origin+'/api/microsoft/connect'),env);
 const auth=new URL(start.headers.get('Location'));
 assert.equal(auth.searchParams.get('client_id'),env.MICROSOFT_CLIENT_ID.trim());
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  if(String(url).endsWith('/token')){
   assert.equal(options.body.get('client_id'),auth.searchParams.get('client_id'));
   return Response.json({access_token:'test-access',refresh_token:'test-refresh'});
  }
  return Response.json({id:'test-account'});
 };
 try{assert.equal((await finishMicrosoft(new Request(origin+'/api/microsoft/callback?state='+auth.searchParams.get('state')+'&code=test'),env)).status,303);}
 finally{globalThis.fetch=oldFetch;}
});

test('Microsoft token failure exposes only allowlisted category and numeric provider code',async()=>{
 const {env}=fixture();
 const start=await startMicrosoft(new Request(origin+'/api/microsoft/connect'),env);
 const state=new URL(start.headers.get('Location')).searchParams.get('state');
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({error:'invalid_client',error_codes:[7000215],error_description:'PRIVATE-CREDENTIAL-DETAILS',access_token:'PRIVATE-TOKEN'},{status:401});
 try{
  await assert.rejects(()=>finishMicrosoft(new Request(origin+'/api/microsoft/callback?state='+state+'&code=test'),env),error=>{
   assert.equal(error.microsoftCode,7000215);
   assert.match(error.message,/invalid_client; AADSTS7000215/);
   assert.doesNotMatch(error.message,/PRIVATE/);
   return true;
  });
 }finally{globalThis.fetch=originalFetch;}
});
