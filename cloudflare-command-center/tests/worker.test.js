import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import worker from '../src/worker.js';

// Execute the Worker's real SQL against SQLite, with D1's async/batch interface.
// Every test uses its own temporary database; no remote records are accessed.
class D1Statement {
 constructor(db,sql,values=[],hooks={}){this.db=db;this.sql=sql;this.values=values;this.hooks=hooks;}
 bind(...values){return new D1Statement(this.db,this.sql,values,this.hooks);}
 async first(){const row=this.db.prepare(this.sql).get(...this.values)||null;if(this.hooks.afterRead)await this.hooks.afterRead(this.sql);return row;}
 async all(){return {results:this.db.prepare(this.sql).all(...this.values)};}
 runSync(){if(/^\s*SELECT\b/i.test(this.sql))return {results:this.db.prepare(this.sql).all(...this.values),meta:{changes:0}};return {meta:{changes:Number(this.db.prepare(this.sql).run(...this.values).changes)}};}
 async run(){return this.runSync();}
}
class D1Database {
 constructor(db){this.db=db;this.hooks={};}
 prepare(sql){return new D1Statement(this.db,sql,[],this.hooks);}
 async batch(statements){
  this.db.exec('BEGIN IMMEDIATE');
  try{const results=statements.map(statement=>statement.runSync());this.db.exec('COMMIT');return results;}
  catch(error){this.db.exec('ROLLBACK');throw error;}
 }
}
const password='test-only-owner-password';
const sessionSecret='test-only-session-secret-with-at-least-32-bytes';
const app='Superior Maintenance and Remodeling - Command Center';
const input={customer:'Customer Test',email:'customer@example.com',phone:'555-222-4444',address:'10 Example Street',project:'Kitchen remodel',items:[{description:'Prep and paint',qty:2,rate:125.5},{description:'Cabinet install',qty:1,rate:900}],taxRate:7.75,notes:'Materials separate'};
function setup(t,{migrate=true}={}){
 const dir=mkdtempSync(join(tmpdir(),'superior-d1-test-')),path=join(dir,'records.sqlite');
 let sqlite=new DatabaseSync(path),cookie='';
 const env={DB:new D1Database(sqlite),OWNER_PASSWORD:password,SESSION_SECRET:sessionSecret,ASSETS:{fetch:async()=>new Response('static asset')}};
 const migrations=readdirSync(new URL('../migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort().map(name=>readFileSync(new URL('../migrations/'+name,import.meta.url),'utf8'));
 function applyMigrations(){for(const sql of migrations)sqlite.exec(sql);}
 if(migrate)applyMigrations();
 t.after(()=>{sqlite.close();rmSync(dir,{recursive:true,force:true});});
 async function call(path,{method='GET',body,raw,auth=false,headers={},environment=env}={}){
  const request=new Request('https://command.test'+path,{method,headers:{'Origin':'https://command.test',...((body!==undefined||raw!==undefined)?{'Content-Type':'application/json'}:{}),...(auth?{'Cookie':cookie}:{}),...headers},body:raw!==undefined?raw:body!==undefined?JSON.stringify(body):undefined});
  const response=await worker.fetch(request,environment,{}),data=await response.json();
  if(response.headers.has('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];
  return {status:response.status,data,headers:response.headers};
 }
 async function login(){const result=await call('/api/login',{method:'POST',body:{password}});assert.equal(result.status,200);return result;}
 async function createAndShare(overrides={}){
  const created=await call('/api/estimates',{method:'POST',body:{...input,...overrides},auth:true});assert.equal(created.status,201);
  const shared=await call('/api/estimates/'+created.data.estimate.id+'/share',{method:'POST',body:{},auth:true});assert.equal(shared.status,200);
  return {estimate:created.data.estimate,token:shared.data.url.split('/').pop()};
 }
 function reopen(){sqlite.close();sqlite=new DatabaseSync(path);env.DB=new D1Database(sqlite);}
 return {env,call,login,createAndShare,reopen,applyMigrations,count:table=>sqlite.prepare('SELECT COUNT(*) AS count FROM '+table).get().count};
}

test('approval creates one durable invoice, retains customer details, and supports payment and feedback',async t=>{
 const h=setup(t);
 assert.equal((await h.call('/api/invoices')).status,401);
 const login=await h.login();assert.match(login.headers.get('set-cookie'),/Secure; HttpOnly; SameSite=Strict/);assert.deepEqual(login.data.capabilities,{additiveRestore:true,customerFeedback:true});
 const {estimate,token}=await h.createAndShare();
 assert.equal(h.count('backup_runs'),1,'saving one estimate durably queues one automatic backup');
 assert.equal(estimate.subtotal,1151);assert.equal(estimate.tax,89.2);assert.equal(estimate.total,1240.2);
 let result=await h.call('/api/review/'+token);assert.equal(result.status,200);assert.equal(result.data.estimate.email,undefined);assert.equal(result.data.estimate.phone,undefined);assert.equal(result.data.estimate.reviewToken,undefined);assert.equal(result.data.feedback,null);assert.equal(result.data.feedbackEnabled,true);
 result=await h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'approved'}});assert.equal(result.status,400);
 const decisions=await Promise.all([1,2].map(()=>h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'approved',signature:input.customer}})));
 assert.deepEqual(decisions.map(r=>r.status).sort(),[200,409]);
 const invoiceId=decisions.find(r=>r.status===200).data.invoiceId;
 assert.equal(h.count('backup_runs'),2,'concurrent approval creates only one invoice backup');
 result=await h.call('/api/invoices',{auth:true});assert.equal(result.data.invoices.length,1);assert.equal(result.data.invoices[0].id,invoiceId);assert.equal(result.data.invoices[0].total,estimate.total);assert.equal(result.data.invoices[0].phone,input.phone);assert.equal(result.data.invoices[0].taxRate,input.taxRate);
 result=await h.call('/api/invoices/'+invoiceId+'/mark-paid',{method:'POST',body:{},auth:true});assert.equal(result.status,200);const paidAt=result.data.invoice.paidAt;
 result=await h.call('/api/invoices/'+invoiceId+'/mark-paid',{method:'POST',body:{},auth:true});assert.equal(result.data.invoice.paidAt,paidAt);
 assert.equal(h.count('backup_runs'),3,'payment retries do not duplicate the automatic backup');
 result=await h.call('/api/review/'+token+'/feedback',{method:'POST',body:{rating:5,comment:'Careful work and clear communication.'}});assert.equal(result.status,201);
 assert.equal((await h.call('/api/review/'+token+'/feedback',{method:'POST',body:{rating:1,comment:'Duplicate'}})).status,409);
 h.reopen();
 result=await h.call('/api/invoices',{auth:true});assert.equal(result.data.invoices.length,1);assert.equal(result.data.invoices[0].paymentStatus,'paid');assert.equal(result.data.invoices[0].paidAt,paidAt);
 result=await h.call('/api/review/'+token);assert.equal(result.data.estimate.status,'approved');assert.equal(result.data.feedback.rating,5);
 assert.equal((await h.call('/api/reviews')).status,401);
 result=await h.call('/api/reviews',{auth:true});assert.equal(result.data.reviews.length,1);assert.equal(result.data.reviews[0].estimateId,estimate.id);
});

test('declines never create invoices, and feedback is validated and included in backups',async t=>{
 const h=setup(t);await h.login();const {estimate,token}=await h.createAndShare();
 assert.equal((await h.call('/api/review/'+token+'/feedback',{method:'POST',body:{rating:5}})).status,409);
 assert.equal((await h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'declined',signature:input.customer,note:'Timing changed'}})).status,200);
 for(const body of [{rating:0},{rating:6},{rating:2.5},{rating:true},{rating:'5'},{rating:4,comment:'x'.repeat(2001)}])assert.equal((await h.call('/api/review/'+token+'/feedback',{method:'POST',body})).status,400);
 assert.equal((await h.call('/api/review/'+token+'/feedback',{method:'POST',body:{rating:4,comment:'Helpful estimate.'}})).status,201);
 const result=await h.call('/api/backup',{auth:true});assert.equal(result.status,200);assert.match(result.headers.get('content-disposition'),/attachment/);assert.equal(result.data.estimates[0].id,estimate.id);assert.equal(result.data.estimates[0].status,'declined');assert.equal(result.data.invoices.length,0);assert.equal(result.data.reviews.length,1);
});

test('additive backup import preserves existing paid invoices and records, and supports old backups',async t=>{
 const h=setup(t);await h.login();const {estimate,token}=await h.createAndShare();
 const decision=await h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'approved',signature:input.customer}});const invoiceId=decision.data.invoiceId;
 const paid=await h.call('/api/invoices/'+invoiceId+'/mark-paid',{method:'POST',body:{},auth:true});
 const backup=(await h.call('/api/backup',{auth:true})).data;
 backup.invoices[0].paymentStatus='unpaid';backup.invoices[0].total=1; // An old backup must never overwrite the paid invoice.
 const added={...estimate,id:'EST-imported',customer:'Imported Customer',status:'draft',createdAt:new Date().toISOString()};
 let result=await h.call('/api/restore',{method:'POST',body:{...backup,estimates:[...backup.estimates,added],confirm:'RESTORE'},auth:true});
 assert.deepEqual(result.data,{ok:true,estimates:1,invoices:0,reviews:0,skipped:2});
 result=await h.call('/api/invoices',{auth:true});assert.deepEqual(result.data.invoices,[paid.data.invoice]);
 result=await h.call('/api/estimates',{auth:true});assert.equal(result.data.estimates.length,2);
 // Version-one backups without a reviews array remain supported; empty import does not clear records.
 result=await h.call('/api/restore',{method:'POST',body:{app,version:1,confirm:'RESTORE',estimates:[],invoices:[]},auth:true});assert.equal(result.status,200);assert.equal(h.count('records'),3);
 result=await h.call('/api/restore',{method:'POST',body:{app,version:1,confirm:'RESTORE',estimates:[{...added,id:'EST-another'},null],invoices:[]},auth:true});assert.equal(result.status,400);assert.equal(h.count('records'),3);
});

test('feedback backup can be imported without duplicating feedback or replacing existing records',async t=>{
 const source=setup(t);await source.login();const {token}=await source.createAndShare();
 await source.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'declined',signature:input.customer}});
 await source.call('/api/review/'+token+'/feedback',{method:'POST',body:{rating:5,comment:'Helpful service.'}});
 const backup=(await source.call('/api/backup',{auth:true})).data;
 const target=setup(t);await target.login();
 let result=await target.call('/api/restore',{method:'POST',body:{...backup,confirm:'RESTORE'},auth:true});assert.deepEqual(result.data,{ok:true,estimates:1,invoices:0,reviews:1,skipped:0});
 result=await target.call('/api/restore',{method:'POST',body:{...backup,confirm:'RESTORE'},auth:true});assert.deepEqual(result.data,{ok:true,estimates:0,invoices:0,reviews:0,skipped:2});
 assert.equal(target.count('records'),1);assert.equal(target.count('customer_reviews'),1);
});

test('health checks schema readiness without exposing data, and migrations preserve existing records',async t=>{
 const h=setup(t,{migrate:false});
 let result=await h.call('/api/health');assert.equal(result.status,503);
 result=await h.call('/api/health',{environment:{...h.env,SESSION_SECRET:undefined}});assert.equal(result.status,503);assert.equal(JSON.stringify(result.data).includes(password),false);
 h.applyMigrations();await h.login();await h.createAndShare();
 h.applyMigrations();assert.equal(h.count('records'),1);
 result=await h.call('/api/health');assert.deepEqual(result.data,{ok:true,service:'superior-command-center',database:'ready',paymentsConfigured:false});assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');
});

test('owner APIs reject cross-origin writes and malformed input, and login failures are rate limited',async t=>{
 const h=setup(t);await h.login();
 assert.equal((await h.call('/api/estimates',{method:'POST',body:input,auth:true,headers:{Origin:'https://untrusted.test'}})).status,403);
 for(const raw of ['null','[]','{'])assert.equal((await h.call('/api/estimates',{method:'POST',raw,auth:true})).status,400);
 assert.equal((await h.call('/api/estimates',{method:'POST',body:{...input,items:[null]},auth:true})).status,400);
 assert.equal(h.count('records'),0);
 for(let i=0;i<10;i++)assert.equal((await h.call('/api/login',{method:'POST',body:{password:'incorrect'},headers:{'CF-Connecting-IP':'192.0.2.10'}})).status,401);
 assert.equal((await h.call('/api/login',{method:'POST',body:{password},headers:{'CF-Connecting-IP':'192.0.2.10'}})).status,429);
});

test('concurrent sharing cannot invalidate a previously returned customer approval link',async t=>{
 const h=setup(t);await h.login();
 const created=await h.call('/api/estimates',{method:'POST',body:input,auth:true}),estimateId=created.data.estimate.id;
 let readers=0,release;
 const bothRead=new Promise(resolve=>{release=resolve;});
 h.env.DB.hooks.afterRead=async sql=>{if(sql!=='SELECT data FROM records WHERE id=? AND kind=?')return;if(++readers===2)release();await bothRead;};
 const shares=await Promise.all([1,2].map(()=>h.call('/api/estimates/'+estimateId+'/share',{method:'POST',body:{},auth:true})));
 h.env.DB.hooks.afterRead=undefined;
 assert.deepEqual(shares.map(result=>result.status).sort(),[200,409]);
 const link=shares.find(result=>result.status===200).data.url,token=link.split('/').pop();
 assert.equal((await h.call('/api/review/'+token)).status,200);
 const reshare=await h.call('/api/estimates/'+estimateId+'/share',{method:'POST',body:{},auth:true});assert.equal(reshare.data.url,link);
});

test('backup owner routes request the canonical asset without an HTML redirect',async()=>{
 for(const path of ['/owner/backup','/owner/backup/']){
  const env={ASSETS:{fetch:async request=>{
   assert.ok(request instanceof Request);
   assert.equal(new URL(request.url).pathname,'/backup');
   return new Response('<title>Backup & Restore</title>',{headers:{'Content-Type':'text/html'}});
  }}};
  const response=await worker.fetch(new Request('https://command.test'+path),env,{});
  assert.equal(response.status,200);
  assert.match(await response.text(),/Backup & Restore/);
 }
});

test('scheduled OneDrive upload uses the durable encrypted connection, verifies bytes, and runs once daily',async t=>{
 const {startMicrosoft,finishMicrosoft}=await import('../src/microsoft-backups.js');
 const h=setup(t);await h.login();await h.createAndShare();
 Object.assign(h.env,{MICROSOFT_CLIENT_ID:'123e4567-e89b-42d3-a456-426614174000',MICROSOFT_CLIENT_SECRET:'test-only-microsoft-secret'});
 const start=await startMicrosoft(new Request('https://command.test/api/microsoft/connect'),h.env);
 const state=new URL(start.headers.get('Location')).searchParams.get('state');
 const originalFetch=globalThis.fetch;let uploads=0,bytes=0;
 globalThis.fetch=async(url,options={})=>{
  const path=new URL(url).pathname;
  if(path.endsWith('/token'))return Response.json({access_token:'test-access',refresh_token:'test-refresh'});
  if(path.endsWith('/me'))return Response.json({id:'test-account'});
  if(path.endsWith('/root/children'))return Response.json({value:[{id:'folder',name:'Superior Command Center Backups',folder:{}}]});
  if(path.endsWith('/content')){
   uploads++;bytes=new TextEncoder().encode(options.body).byteLength;
   assert.equal(JSON.parse(options.body).estimates.length,1);
   return Response.json({id:'uploaded-file',size:bytes,name:'snapshot.json'});
  }
  if(path.endsWith('/items/uploaded-file'))return Response.json({id:'uploaded-file',size:bytes,name:'snapshot.json'});
  throw Error('Unexpected provider request');
 };
 try{
  await finishMicrosoft(new Request('https://command.test/api/microsoft/callback?state='+state+'&code=test'),h.env);
  h.reopen();
  const stored=await h.env.DB.prepare('SELECT refresh_token FROM microsoft_backup_connection WHERE id=1').first();
  assert.doesNotMatch(stored.refresh_token,/test-refresh/);
  for(let i=0;i<2;i++){
   let task;
   await worker.scheduled({},h.env,{waitUntil(promise){task=promise;}});
   await task;
  }
  assert.equal(uploads,1);
  const result=await h.call('/api/microsoft/status',{auth:true});
  assert.equal(result.data.connected,true);
  assert.ok(Number.isFinite(Date.parse(result.data.lastBackupAt)));
  assert.equal(h.count('records'),1);
 }finally{globalThis.fetch=originalFetch;}
});


test('standalone invoices validate, persist customer details and totals, queue backups, and record payment',async t=>{
 const h=setup(t);
 assert.equal((await h.call('/api/invoices',{method:'POST',body:input})).status,401);
 await h.login();
 assert.equal((await h.call('/api/invoices',{method:'POST',body:{...input,items:[]},auth:true})).status,400);
 assert.equal(h.count('records'),0);
 const created=await h.call('/api/invoices',{method:'POST',body:input,auth:true});
 assert.equal(created.status,201);
 const invoice=created.data.invoice;
 assert.equal(invoice.standalone,true);assert.equal(invoice.estimateId,null);
 assert.equal(invoice.total,1240.2);assert.equal(invoice.tax,89.2);
 for(const key of ['customer','email','phone','address','project','notes','taxRate'])assert.equal(invoice[key],input[key]);
 assert.equal(h.count('backup_runs'),1);
 h.reopen();
 const listed=await h.call('/api/invoices',{auth:true});assert.deepEqual(listed.data.invoices,[invoice]);
 assert.equal((await h.call('/api/estimates',{auth:true})).data.estimates.length,0);
 const paid=await h.call('/api/invoices/'+invoice.id+'/mark-paid',{method:'POST',body:{},auth:true});
 assert.equal(paid.status,200);assert.equal(paid.data.invoice.paymentStatus,'paid');assert.ok(paid.data.invoice.paidAt);
 assert.equal(h.count('backup_runs'),2);
});

test('invoice checkout is private, disabled without credentials, and cannot accept client paid state',async t=>{
 const h=setup(t);await h.login();const {token}=await h.createAndShare();
 assert.equal((await h.call('/api/review/'+token+'/payment')).status,404);
 const approved=await h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'approved',signature:'Customer Test'}});
 assert.equal(approved.status,200);
 const status=await h.call('/api/review/'+token+'/payment');assert.equal(status.data.enabled,false);assert.equal(status.data.invoice.paymentStatus,'unpaid');
 assert.equal((await h.call('/api/review/'+'a'.repeat(64)+'/payment')).status,404);
 const capture=await h.call('/api/review/'+token+'/payment/capture',{method:'POST',body:{paid:true,total:0}});
 assert.equal(capture.status,503);
 h.reopen();const invoices=await h.call('/api/invoices',{auth:true});assert.equal(invoices.data.invoices[0].paymentStatus,'unpaid');
});

test('PayPal capture persists only verified payment and retries preserve one receipt and backup',async t=>{
 const h=setup(t);await h.login();const {token}=await h.createAndShare();
 const approval=await h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'approved',signature:'Customer Test'}});
 const invoiceId=approval.data.invoiceId,originalFetch=globalThis.fetch;
 Object.assign(h.env,{PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'test-id',PAYPAL_CLIENT_SECRET:'test-secret',PAYPAL_MERCHANT_ID:'TESTMERCHANT1'});
 let captured=false,amount='0.01',captureCalls=0;
 globalThis.fetch=async(url,options)=>{
  if(url.endsWith('/token'))return Response.json({access_token:'mock-token'});
  if(url.endsWith('/v2/checkout/orders'))return Response.json({id:'ORDER123456789',links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123456789'}]});
  if(url.endsWith('/capture')){captureCalls++;captured=true;return Response.json({status:'COMPLETED'});}
  return Response.json({id:'ORDER123456789',status:captured?'COMPLETED':'APPROVED',purchase_units:[{custom_id:invoiceId,invoice_id:invoiceId,payee:{merchant_id:'TESTMERCHANT1'},payments:{captures:[{id:'CAPTURE12345',status:'COMPLETED',final_capture:true,amount:{currency_code:'USD',value:amount},create_time:'2026-11-14T01:00:00Z'}]}}]});
 };
 t.after(()=>{globalThis.fetch=originalFetch;});
 let result=await h.call('/api/review/'+token+'/payment/create',{method:'POST',body:{total:0.01}});assert.equal(result.status,200);
 result=await h.call('/api/review/'+token+'/payment/capture',{method:'POST'});assert.equal(result.status,409);
 let invoices=await h.call('/api/invoices',{auth:true});assert.equal(invoices.data.invoices[0].paymentStatus,'unpaid');
 amount='1240.20';result=await h.call('/api/review/'+token+'/payment/capture',{method:'POST'});assert.equal(result.status,200);
 h.reopen();invoices=await h.call('/api/invoices',{auth:true});assert.equal(invoices.data.invoices[0].paymentStatus,'paid');assert.equal(invoices.data.invoices[0].paypalCaptureId,'CAPTURE12345');assert.equal(invoices.data.invoices[0].paidAt,'2026-11-14T01:00:00Z');
 const backups=h.count('backup_runs');assert.equal((await h.call('/api/review/'+token+'/payment/capture',{method:'POST'})).data.paid,true);assert.equal(captureCalls,1);assert.equal(h.count('backup_runs'),backups);
});

test('standalone invoice links expose itemized receipt without email, credentials, or approval controls',async t=>{
 const h=setup(t);await h.login();const created=await h.call('/api/invoices',{method:'POST',body:input,auth:true});
 const path='/api/invoices/'+created.data.invoice.id+'/share';assert.equal((await h.call(path,{method:'POST'})).status,401);
 const shared=await h.call(path,{method:'POST',auth:true});assert.equal(shared.status,200);
 const token=shared.data.url.split('/').pop(),view=await h.call('/api/review/'+token);assert.equal(view.status,200);assert.equal(view.data.estimate.isInvoice,true);assert.equal(view.data.estimate.email,undefined);assert.equal(view.data.estimate.paymentToken,undefined);assert.equal(view.data.feedbackEnabled,false);
 assert.equal((await h.call('/api/review/'+token+'/payment')).data.invoice.total,1240.2);
 assert.equal((await h.call('/api/review/'+token+'/decision',{method:'POST',body:{decision:'approved',signature:'Test'}})).status,404);
 assert.equal((await h.call(path,{method:'POST',auth:true})).data.url,shared.data.url);h.reopen();assert.equal((await h.call('/api/review/'+token)).status,200);
});
