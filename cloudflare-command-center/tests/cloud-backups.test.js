import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {backupSnapshot,backupStatus,startGoogleConnection,completeGoogleConnection,runCloudBackup,backupQueueStatement,processBackupQueue} from '../src/backups.js';

// All records, credentials, Google responses and delivery targets below are synthetic.
// The injected fetch implementation rejects every unrecognized request.
class Statement {
 constructor(db,sql,values=[]){this.db=db;this.sql=sql;this.values=values;}
 bind(...values){return new Statement(this.db,this.sql,values);}
 async first(){return this.db.prepare(this.sql).get(...this.values)||null;}
 async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
 runSync(){
  const statement=this.db.prepare(this.sql);
  if(statement.columns().length)return {results:statement.all(...this.values),meta:{changes:0}};
  return {meta:{changes:Number(statement.run(...this.values).changes)}};
 }
 async run(){return this.runSync();}
}
class D1 {
 constructor(db){this.db=db;}
 prepare(sql){return new Statement(this.db,sql);}
 async batch(statements){
  if(this.failNextBatch){this.failNextBatch=false;throw Error('Synthetic database commit outage');}
  this.db.exec('BEGIN IMMEDIATE');
  try{const result=statements.map(statement=>statement.runSync());this.db.exec('COMMIT');return result;}
  catch(error){this.db.exec('ROLLBACK');throw error;}
 }
}

const recipient='backup-owner@example.invalid';
const folder='test-private-backup-folder';
const refreshToken='synthetic-refresh-token-never-plaintext';
const accessToken='synthetic-access-token-never-plaintext';
const clientSecret='synthetic-client-secret-never-public';
const app='Superior Maintenance and Remodeling - Command Center';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function multipartParts(contentType,body){
 const boundary=/boundary="?([^";\s]+)/i.exec(contentType)?.[1];
 assert.ok(boundary,'multipart content declares a boundary');
 return body.split('--'+boundary).map(part=>{
  const split=part.indexOf('\r\n\r\n');
  return split<0?null:{headers:part.slice(0,split),body:part.slice(split+4).replace(/\r\n$/,'')};
 }).filter(Boolean);
}
function attachment(raw){
 const mime=Buffer.from(raw,'base64url').toString('utf8');
 const contentType=mime.split('\r\n\r\n')[0];
 const part=multipartParts(contentType,mime).find(part=>/Content-Disposition:\s*attachment/i.test(part.headers));
 assert.ok(part,'backup email contains an attachment');
 assert.match(part.headers,/application\/json/i);
 return {mime,payload:JSON.parse(Buffer.from(part.body.replace(/\s/g,''),'base64').toString('utf8'))};
}

function googleFixture(){
 const state={calls:[],files:[],messages:[],email:recipient,verified:true,folderShared:false,refreshFailure:false,gmailFailure:false,ambiguousGmail:false,uploadGate:null};
 state.fetch=async(input,options={})=>{
  const request=new Request(input,options),url=new URL(request.url),body=await request.text();
  const call={url,method:request.method,headers:request.headers,body};state.calls.push(call);
  if(url.hostname==='oauth2.googleapis.com'&&url.pathname==='/token'){
   const form=new URLSearchParams(body);call.form=form;
   if(form.get('grant_type')==='refresh_token'){
    assert.equal(form.get('refresh_token'),refreshToken);
    if(state.refreshFailure)return json({error:'invalid_grant',error_description:clientSecret+' '+refreshToken+' '+accessToken},400);
   }
   return json({access_token:accessToken,refresh_token:refreshToken,token_type:'Bearer',expires_in:3600});
  }
  if(/userinfo$/.test(url.pathname))return json({email:state.email,email_verified:state.verified,verified_email:state.verified});
  assert.equal(request.headers.get('authorization'),'Bearer '+accessToken,'provider calls use the ephemeral access token');
  if(url.pathname==='/drive/v3/files'&&request.method==='POST'){
   const metadata=JSON.parse(body);
   assert.equal(metadata.mimeType,'application/vnd.google-apps.folder');
   return json({id:folder,mimeType:'application/vnd.google-apps.folder'});
  }
  if(url.pathname==='/drive/v3/files/'+folder)return json({id:folder,name:'Private fixture backups',mimeType:'application/vnd.google-apps.folder',trashed:false,shared:state.folderShared,ownedByMe:true,owners:[{me:true,emailAddress:recipient}],capabilities:{canAddChildren:true}});
  if(url.pathname==='/drive/v3/files'&&request.method==='GET'){
   const query=url.searchParams.get('q')||'';
   const properties=Array.from(query.matchAll(/value\s*=\s*'([^']+)'/g),match=>match[1]);
   const names=Array.from(query.matchAll(/name\s*=\s*'([^']+)'/g),match=>match[1]);
   return json({files:state.files.filter(file=>properties.every(value=>Object.values(file.appProperties||{}).includes(value))&&names.every(name=>file.name===name)).map(({payload,payloadText,...file})=>file)});
  }
  if(url.pathname==='/upload/drive/v3/files'&&request.method==='POST'){
   if(state.uploadGate){state.uploadGate.entered.resolve();await state.uploadGate.release.promise;}
   const parts=multipartParts(request.headers.get('content-type'),body).map(part=>({...part,value:JSON.parse(part.body)}));
   const metadata=parts.find(part=>Array.isArray(part.value.parents))?.value,payloadPart=parts.find(part=>part.value.app===app),payload=payloadPart?.value;
   assert.deepEqual(metadata.parents,[folder],'backups stay in the selected private folder');
   assert.ok(payload,'Drive upload contains a recoverable application backup');
   const file={...metadata,id:'test-drive-file-'+(state.files.length+1),webViewLink:'https://drive.google.com/file/d/test-fixture/view',payload,payloadText:payloadPart.body,size:String(Buffer.byteLength(payloadPart.body))};
   state.files.push(file);return json({id:file.id,name:file.name,webViewLink:file.webViewLink});
  }
  if(url.pathname.startsWith('/drive/v3/files/')&&request.method==='GET'){
   const file=state.files.find(file=>file.id===url.pathname.split('/').pop());
   if(!file)return json({error:{message:'Fixture file not found'}},404);
   if(url.searchParams.get('alt')==='media')return new Response(file.payloadText,{headers:{'Content-Type':'application/json'}});
   const {payload,payloadText,...metadata}=file;return json(metadata);
  }
  if(/\/gmail\/v1\/users\/me\/messages\/send$/.test(url.pathname)&&request.method==='POST'){
   const sent=attachment(JSON.parse(body).raw);call.message=sent;
   assert.equal(sent.mime.split('\r\n').find(line=>/^To:/i.test(line)),'To: '+recipient);
   if(state.ambiguousGmail)throw Error('Synthetic network loss after Gmail accepted '+accessToken);
   if(state.gmailFailure)return json({error:{code:403,message:'Synthetic denial '+clientSecret}},403);
   state.messages.push(sent);state.afterGmail?.();return json({id:'test-gmail-message-'+state.messages.length,threadId:'test-thread'});
  }
  throw Error('Unexpected synthetic provider request: '+request.method+' '+url.origin+url.pathname);
 };
 return state;
}

function setup(t,{configured=true}={}){
 const directory=mkdtempSync(join(tmpdir(),'superior-backup-test-')),path=join(directory,'records.sqlite');
 let sqlite=new DatabaseSync(path);
 for(const name of readdirSync(new URL('../migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 const google=googleFixture();
 const env={DB:new D1(sqlite),SESSION_SECRET:'synthetic-session-secret-with-at-least-thirty-two-bytes',BACKUP_EMAIL:recipient,GOOGLE_DRIVE_BACKUP_FOLDER_ID:folder,BACKUP_FETCH:google.fetch,...(configured?{GOOGLE_CLIENT_ID:'synthetic-client-id.apps.googleusercontent.com',GOOGLE_CLIENT_SECRET:clientSecret}:{})};
 const createdAt='2026-01-01T10:00:00.000Z';
 const estimate=status=>({id:'EST-fixture-'+status,customer:'Synthetic Customer',email:'customer@example.invalid',phone:'555-0100',address:'Synthetic test address',project:'Synthetic work',items:[{description:'Test labor',qty:1,rate:100,total:100}],subtotal:100,tax:0,taxRate:0,total:100,status,createdAt});
 const estimates=['draft','sent','approved','declined'].map(estimate);
 const invoices=[{...estimate('approved'),id:'INV-fixture-approved',estimateId:'EST-fixture-approved',paymentStatus:'paid',paidAt:createdAt}];
 const reviews=[{id:'REV-fixture-declined',estimateId:'EST-fixture-declined',customer:'Synthetic Customer',rating:4,comment:'Synthetic feedback',createdAt}];
 for(const [kind,rows] of [['estimate',estimates],['invoice',invoices]])for(const record of rows)sqlite.prepare('INSERT INTO records(id,kind,status,created_at,data) VALUES(?,?,?,?,?)').run(record.id,kind,kind==='estimate'?record.status:record.paymentStatus,record.createdAt,JSON.stringify(record));
 for(const review of reviews)sqlite.prepare('INSERT INTO customer_reviews(id,estimate_id,created_at,data) VALUES(?,?,?,?)').run(review.id,review.estimateId,review.createdAt,JSON.stringify(review));
 t.after(()=>{sqlite.close();rmSync(directory,{recursive:true,force:true});});
 async function begin(){
  const response=await startGoogleConnection(new Request('https://command.test/api/google/connect'),env);
  assert.ok([302,303,307].includes(response.status));
  const url=new URL(response.headers.get('location'));
  assert.equal(url.hostname,'accounts.google.com');
  assert.equal(url.searchParams.get('redirect_uri'),'https://command.test/api/google/callback');
  assert.equal(url.searchParams.get('access_type'),'offline');
  assert.ok(url.searchParams.get('scope').includes('https://www.googleapis.com/auth/drive.file'));
  assert.ok(!url.searchParams.get('scope').split(' ').includes('https://www.googleapis.com/auth/drive'));
  assert.equal(url.searchParams.get('include_granted_scopes'),'false');
  assert.match(url.searchParams.get('state'),/^[A-Za-z0-9_-]{32,}$/);
  const callback=new URL('https://command.test/api/google/callback');callback.searchParams.set('state',url.searchParams.get('state'));callback.searchParams.set('code','synthetic-code');
  return {url,callback};
 }
 async function connect(){const {callback}=await begin();const response=await completeGoogleConnection(new Request(callback),env);return {response,callback};}
 async function queueSource(runId,{kind='estimate'}={}){
  const record={...(kind==='invoice'?invoices[0]:estimates[0]),id:(kind==='invoice'?'INV':'EST')+'-'+runId};
  await env.DB.batch([
   env.DB.prepare('INSERT INTO records(id,kind,status,created_at,data) VALUES(?,?,?,?,?)').bind(record.id,kind,kind==='estimate'?record.status:record.paymentStatus,record.createdAt,JSON.stringify(record)),
   backupQueueStatement(env,{runId,trigger:'saved',sourceId:record.id,sourceKind:kind})
  ]);
  return record;
 }
 function storedStrings(){return sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().flatMap(({name})=>sqlite.prepare('SELECT * FROM "'+name.replaceAll('"','""')+'"').all()).map(record=>JSON.stringify(record)).join('\n');}
 function reopen(){sqlite.close();sqlite=new DatabaseSync(path);env.DB=new D1(sqlite);}
 return {env,google,begin,connect,queueSource,reopen,storedStrings,estimates,invoices,reviews};
}

test('cloud backup snapshot retains every estimate status, paid invoices and feedback',async t=>{
 const h=setup(t),snapshot=await backupSnapshot(h.env);
 assert.equal(snapshot.app,app);assert.equal(snapshot.version,1);assert.ok(Number.isFinite(Date.parse(snapshot.exportedAt)));
 assert.deepEqual(snapshot.estimates.map(record=>record.status).sort(),['approved','declined','draft','sent']);
 assert.deepEqual(snapshot.invoices,h.invoices);assert.deepEqual(snapshot.reviews,h.reviews);
 assert.equal(h.google.calls.length,0);
});

test('unconfigured cloud delivery reports pending setup without making provider requests',async t=>{
 const h=setup(t,{configured:false}),status=await backupStatus(h.env);
 assert.equal(status.configured,false);assert.equal(status.connected,false);assert.equal(status.lastBackupAt,null);
 const response=await startGoogleConnection(new Request('https://command.test/api/google/connect'),h.env);
 assert.equal(response.ok,false);
 await assert.rejects(runCloudBackup(h.env,{runId:'unconfigured-test',trigger:'manual'}));
 assert.equal(h.google.calls.length,0);
});

test('Google connection creates matching recoverable Drive and Gmail copies and survives reopening D1',async t=>{
 const h=setup(t),{response}=await h.connect();
 assert.equal(new URL(response.headers.get('location'),'https://command.test').searchParams.get('drive'),'connected');
 assert.equal(h.google.files.length,1);assert.equal(h.google.messages.length,1);
 assert.deepEqual(h.google.messages[0].payload,h.google.files[0].payload);
 assert.equal(h.google.messages[0].payload.estimates.length,4);assert.equal(h.google.messages[0].payload.estimates.some(record=>record.status==='declined'),true);
 let status=await backupStatus(h.env);
 assert.equal(status.configured,true);assert.equal(status.connected,true);assert.equal(status.email,recipient);
 assert.ok(status.lastBackupAt);assert.ok(status.lastDriveBackupAt);assert.ok(status.lastEmailBackupAt);
 assert.equal(JSON.stringify(status).includes(refreshToken),false);assert.equal(JSON.stringify(status).includes(clientSecret),false);
 assert.equal(h.storedStrings().includes(refreshToken),false,'refresh credential is encrypted at rest');
 assert.equal(h.storedStrings().includes(accessToken),false,'short-lived access token is not persisted');
 h.reopen();status=await backupStatus(h.env);assert.equal(status.connected,true);
 const result=await runCloudBackup(h.env,{runId:'reopened-delivery',trigger:'manual'});
 assert.equal(result.driveSaved,true);assert.equal(result.emailSent,true);
 assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,2);
 assert.ok(h.google.calls.some(call=>call.form?.get('grant_type')==='refresh_token'));
});

test('OAuth state cannot be reused or replaced by a different Google account',async t=>{
 const h=setup(t),{response,callback}=await h.connect();
 assert.match(response.headers.get('location'),/drive=connected/);
 const before=h.google.calls.length;
 const duplicate=await completeGoogleConnection(new Request(callback),h.env);
 assert.match(duplicate.headers.get('location'),/drive=error/);
 assert.equal(h.google.calls.length,before,'consumed state is rejected before another exchange or delivery');
 const other=setup(t);other.google.email='wrong-owner@example.invalid';
 const rejected=await other.connect();assert.match(rejected.response.headers.get('location'),/drive=error/);
 const status=await backupStatus(other.env);assert.equal(status.connected,false);assert.equal(other.google.files.length,0);assert.equal(other.google.messages.length,0);
});

test('expired OAuth approval is rejected before Google exchange',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});
 const h=setup(t),{callback}=await h.begin();
 t.mock.timers.tick(60*60*1000);
 const response=await completeGoogleConnection(new Request(callback),h.env);
 assert.match(response.headers.get('location'),/drive=error/);assert.equal(h.google.calls.length,0);
 assert.equal((await backupStatus(h.env)).connected,false);
});

test('a completed delivery is idempotent and simultaneous runs do not duplicate deliveries',async t=>{
 const h=setup(t);await h.connect();
 const first=await runCloudBackup(h.env,{runId:'same-run',trigger:'scheduled'}),before=h.google.calls.length;
 const repeated=await runCloudBackup(h.env,{runId:'same-run',trigger:'scheduled'});
 assert.deepEqual(repeated,first);assert.equal(h.google.calls.length,before);
 h.google.uploadGate={entered:deferred(),release:deferred()};
 const a=runCloudBackup(h.env,{runId:'simultaneous-run',trigger:'manual'});
 await h.google.uploadGate.entered.promise;
 const b=runCloudBackup(h.env,{runId:'simultaneous-run',trigger:'manual'});
 h.google.uploadGate.release.resolve();
 const results=await Promise.allSettled([a,b]);
 assert.ok(results.some(result=>result.status==='fulfilled'&&result.value.emailSent));
 assert.equal(h.google.files.length,3);assert.equal(h.google.messages.length,3);
});

test('Drive-only success remains distinguishable from a complete email backup',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});
 const h=setup(t);await h.connect();
 const previous=await backupStatus(h.env),original=await backupSnapshot(h.env);t.mock.timers.tick(60000);h.google.gmailFailure=true;
 await assert.rejects(runCloudBackup(h.env,{runId:'email-denied',trigger:'manual'}));
 const partial=await backupStatus(h.env);
 assert.equal(partial.lastBackupAt,previous.lastBackupAt);
 assert.equal(partial.lastEmailBackupAt,previous.lastEmailBackupAt);
 assert.notEqual(partial.lastDriveBackupAt,previous.lastDriveBackupAt);
 assert.ok(partial.lastError);assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,1);
 assert.equal(JSON.stringify(partial).includes(clientSecret),false);
 const preserved=await backupSnapshot(h.env);
 for(const kind of ['estimates','invoices','reviews'])assert.deepEqual(preserved[kind],original[kind],'delivery failure preserves saved '+kind);
 h.google.gmailFailure=false;
 const retry=await runCloudBackup(h.env,{runId:'email-denied',trigger:'manual'});
 assert.equal(retry.emailSent,true);assert.equal(h.google.files.length,2,'retry reuses the already saved Drive file');
 assert.equal(h.google.messages.length,2);assert.deepEqual(h.google.messages[1].payload,h.google.files[1].payload);
 assert.equal((await backupStatus(h.env)).lastError,null);
});

test('an ambiguous Gmail outcome is not automatically resent or reported successful',async t=>{
 const h=setup(t);await h.connect();const before=await backupStatus(h.env),original=await backupSnapshot(h.env);
 h.google.ambiguousGmail=true;
 await assert.rejects(runCloudBackup(h.env,{runId:'ambiguous-email',trigger:'scheduled'}));
 const sendCount=()=>h.google.calls.filter(call=>/\/messages\/send$/.test(call.url.pathname)).length;
 const attempted=sendCount();
 await assert.rejects(runCloudBackup(h.env,{runId:'ambiguous-email',trigger:'scheduled'}));
 assert.equal(sendCount(),attempted,'uncertain delivery must not be automatically replayed');
 const status=await backupStatus(h.env);assert.equal(status.lastBackupAt,before.lastBackupAt);assert.ok(status.lastError);
 assert.equal(JSON.stringify(status).includes(accessToken),false);
 const preserved=await backupSnapshot(h.env);
 for(const kind of ['estimates','invoices','reviews'])assert.deepEqual(preserved[kind],original[kind]);
});

test('Google token errors cannot disclose credential values through status or thrown errors',async t=>{
 const h=setup(t);await h.connect();h.google.refreshFailure=true;
 let caught;try{await runCloudBackup(h.env,{runId:'expired-token',trigger:'manual'});}catch(error){caught=error;}
 assert.ok(caught);
 const visible=caught.message+' '+JSON.stringify(await backupStatus(h.env));
 for(const secret of [clientSecret,refreshToken,accessToken])assert.equal(visible.includes(secret),false);
 assert.equal(h.google.files.length,1);assert.equal(h.google.messages.length,1);
});

test('a shared Drive folder is rejected before enabling private invoice backups',async t=>{
 for(const shared of [true,undefined]){
  const h=setup(t);h.google.folderShared=shared;
  const {response}=await h.connect();assert.match(response.headers.get('location'),/drive=error/);
  assert.equal((await backupStatus(h.env)).connected,false);assert.equal(h.google.files.length,0);assert.equal(h.google.messages.length,0);
 }
});

test('saved-record outbox is durable, idempotent and blocked until Google authorization exists',async t=>{
 const h=setup(t),record=await h.queueSource('queued-before-authorization');
 const first=await processBackupQueue(h.env,{limit:3});
 assert.equal(first.processed,0);assert.equal(first.pendingCount,1);assert.equal(first.blocked,'authorization');
 assert.equal(h.google.calls.length,0);
 await backupQueueStatement(h.env,{runId:'queued-before-authorization',trigger:'saved',sourceId:record.id,sourceKind:'estimate'}).run();
 await backupQueueStatement(h.env,{runId:'never-saved',trigger:'saved',sourceId:'EST-does-not-exist',sourceKind:'estimate'}).run();
 h.reopen();
 const status=await backupStatus(h.env);assert.equal(status.pendingCount,1);
 const snapshot=await backupSnapshot(h.env);assert.ok(snapshot.estimates.some(item=>item.id===record.id));
});

test('empty catch-up does not email, and a saved invoice queues one complete off-site backup',async t=>{
 const h=setup(t);await h.connect();
 const before=h.google.calls.length,empty=await processBackupQueue(h.env,{limit:3});
 assert.equal(empty.processed,0);assert.equal(empty.pendingCount,0);assert.equal(h.google.calls.length,before);
 const record=await h.queueSource('new-invoice',{kind:'invoice'});
 const delivered=await processBackupQueue(h.env,{limit:3});
 assert.equal(delivered.processed,1);assert.equal(delivered.pendingCount,0);
 assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,2);
 assert.ok(h.google.messages[1].payload.invoices.some(invoice=>invoice.id===record.id));
 assert.equal(h.google.messages[1].payload.estimates.length,4);
 await backupQueueStatement(h.env,{runId:'new-invoice',trigger:'saved',sourceId:record.id,sourceKind:'invoice'}).run();
 const after=h.google.calls.length;
 assert.equal((await processBackupQueue(h.env,{limit:3})).processed,0);assert.equal(h.google.calls.length,after);
});

test('queued delivery backs off safely and reuses the saved Drive file after a definite email failure',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});
 const h=setup(t);await h.connect();const record=await h.queueSource('retryable-estimate');
 h.google.gmailFailure=true;
 const failed=await processBackupQueue(h.env,{limit:3});assert.equal(failed.failed,1);assert.equal(failed.pendingCount,1);
 assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,1);
 const original=await backupSnapshot(h.env);assert.ok(original.estimates.some(estimate=>estimate.id===record.id));
 const calls=h.google.calls.length;
 const deferred=await processBackupQueue(h.env,{limit:3});assert.equal(deferred.processed,0);assert.equal(h.google.calls.length,calls);
 t.mock.timers.tick(16*60*1000);h.google.gmailFailure=false;
 const retried=await processBackupQueue(h.env,{limit:3});assert.equal(retried.processed,1);assert.equal(retried.pendingCount,0);
 assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,2);
 assert.deepEqual(h.google.messages[1].payload,h.google.files[1].payload);
 const preserved=await backupSnapshot(h.env);
 for(const kind of ['estimates','invoices','reviews'])assert.deepEqual(preserved[kind],original[kind]);
});

test('queued ambiguous email delivery requires attention and is never automatically replayed',async t=>{
 t.mock.timers.enable({apis:['Date'],now:Date.now()});
 const h=setup(t);await h.connect();await h.queueSource('uncertain-email');h.google.ambiguousGmail=true;
 const attempted=await processBackupQueue(h.env,{limit:3});assert.equal(attempted.failed,1);assert.ok(attempted.needsAttention);
 const calls=h.google.calls.length;h.google.ambiguousGmail=false;t.mock.timers.tick(24*60*60*1000);
 const skipped=await processBackupQueue(h.env,{limit:3});assert.equal(skipped.processed,0);assert.ok(skipped.needsAttention);
 assert.equal(h.google.calls.length,calls);assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,1);
});

test('a persisted Gmail receipt is reconciled after a commit outage without sending again',async t=>{
 const h=setup(t);await h.connect();
 h.google.afterGmail=()=>{h.env.DB.failNextBatch=true;h.google.afterGmail=null;};
 await assert.rejects(runCloudBackup(h.env,{runId:'sent-before-commit-outage',trigger:'manual'}));
 assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,2,'Gmail accepted the message before the database outage');
 h.reopen();const calls=h.google.calls.length;
 const reconciled=await runCloudBackup(h.env,{runId:'sent-before-commit-outage',trigger:'manual'});
 assert.equal(reconciled.driveSaved,true);assert.equal(reconciled.emailSent,true);assert.ok(reconciled.savedAt);
 assert.equal(h.google.calls.length,calls,'durable receipt is enough to finish without any provider request');
 assert.equal(h.google.files.length,2);assert.equal(h.google.messages.length,2);
});
