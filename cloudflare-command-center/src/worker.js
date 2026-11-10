// Superior Command Center — Cloudflare Workers + durable D1 storage
// IMPORTANT: Set OWNER_PASSWORD and SESSION_SECRET as Worker secrets.
import {backupSnapshot,backupStatus,startGoogleConnection,completeGoogleConnection,runCloudBackup,backupQueueStatement,processBackupQueue} from './backups.js';
const now=()=>new Date().toISOString();
const capabilities={additiveRestore:true,customerFeedback:true};
const text=(v,n=200)=>String(v??'').trim().slice(0,n);
const id=(kind)=>kind+'-'+new Date().getUTCFullYear()+'-'+crypto.randomUUID().toUpperCase();
const randomHex=(bytes=32)=>[...crypto.getRandomValues(new Uint8Array(bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
const reply=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...extra}});
const fail=(status,message)=>reply({error:message},status);
const safeFile=(body,filename)=>new Response(JSON.stringify(body,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':'attachment; filename="'+filename+'"','Cache-Control':'no-store'}});
const cents=v=>Math.round(Number(v)*100);
const dollars=v=>Number((v/100).toFixed(2));
const sha=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(s))));
async function same(a,b){const x=await sha(a),y=await sha(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x[i]^y[i];return diff===0;}
async function hmac(data,key){
 const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(data)))].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function cookie(req){return /(?:^|;\s*)superior_sid=([^;]+)/.exec(req.headers.get('cookie')||'')?.[1]||'';}
async function authorized(req,env){
 const token=cookie(req),bits=token.split('.');
 if(bits.length!==3||!env.SESSION_SECRET)return false;
 const [expiry,nonce,sig]=bits;
 if(!/^\d{13}$/.test(expiry)||!/^[a-f0-9]{32}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(sig)||Number(expiry)<Date.now())return false;
 const expected=await hmac(expiry+'.'+nonce,env.SESSION_SECRET);
 let d=0;for(let i=0;i<64;i++)d|=expected.charCodeAt(i)^sig.charCodeAt(i);
 return d===0;
}
function sessionCookie(value){return 'superior_sid='+value+'; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=43200';}
async function body(req,limit=1024*128){
 const length=Number(req.headers.get('content-length')||0);
 if(length>limit)throw Error('Request is too large.');
 const raw=await req.text();
 if(new TextEncoder().encode(raw).byteLength>limit)throw Error('Request is too large.');
 try{const value=JSON.parse(raw||'{}');if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw Error('Invalid JSON.');}
}
function originMatches(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
function inputItems(arr){
 if(!Array.isArray(arr)||arr.length<1||arr.length>40)throw Error('Add between 1 and 40 line items.');
 return arr.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Check description, quantity, and unit price.');
  const description=text(item.description,240),qty=Number(item.qty),rate=Number(item.rate);
  if(!description||!Number.isFinite(qty)||qty<=0||qty>100000||!Number.isFinite(rate)||rate<0||rate>1e6)throw Error('Check description, quantity, and unit price.');
  return {description,qty,rate:dollars(cents(rate)),total:dollars(Math.round(qty*cents(rate)))};
 });
}
function makeEstimate(a,original={}){
 const customer=text(a.customer,120),email=text(a.email,254);
 if(!customer||!/^\S+@\S+\.\S+$/.test(email))throw Error('Customer name and valid email are required.');
 const items=inputItems(a.items),taxRate=Number(a.taxRate||0);
 if(!Number.isFinite(taxRate)||taxRate<0||taxRate>25)throw Error('Tax must be between 0 and 25 percent.');
 const subtotalCents=items.reduce((v,i)=>v+cents(i.total),0);
 const taxCents=Math.round(subtotalCents*taxRate/100);
 if(subtotalCents+taxCents>1e10)throw Error('Estimate amount is too large.');
 return {...original,customer,email,phone:text(a.phone,50),address:text(a.address,240),project:text(a.project,240),notes:text(a.notes,3000),items,taxRate,subtotal:dollars(subtotalCents),tax:dollars(taxCents),total:dollars(subtotalCents+taxCents)};
}
const parseRow=r=>r?JSON.parse(r.data):null;
const publicEstimate=e=>{const {reviewToken,customerSignature,email,phone,...safe}=e;return safe;};
const baseReview=(req,token)=>new URL('/review/'+token,req.url).toString();
async function select(env,id,kind){return parseRow(await env.DB.prepare('SELECT data FROM records WHERE id=? AND kind=?').bind(id,kind).first());}
async function records(env,kind){const rows=await env.DB.prepare('SELECT data FROM records WHERE kind=? ORDER BY created_at DESC').bind(kind).all();return rows.results.map(parseRow);}
async function feedbackFor(env,estimateId){return parseRow(await env.DB.prepare('SELECT data FROM customer_reviews WHERE estimate_id=?').bind(estimateId).first());}
async function feedbackRecords(env){const rows=await env.DB.prepare('SELECT data FROM customer_reviews ORDER BY created_at DESC').all();return rows.results.map(parseRow);}
async function insert(env,record,kind,status,token=null){
 await env.DB.batch([
  env.DB.prepare('INSERT INTO records(id,kind,status,created_at,review_token,data) VALUES (?,?,?,?,?,?)').bind(record.id,kind,status,record.createdAt,token,JSON.stringify(record)),
  backupQueueStatement(env,{runId:kind+'-'+record.id,trigger:kind+'-created',sourceId:record.id,sourceKind:kind})
 ]);
}
function deliverQueuedBackups(env,ctx){
 if(typeof ctx?.waitUntil==='function')ctx.waitUntil(processBackupQueue(env,{limit:3}).catch(()=>console.error('Cloud backup is pending. Check the owner backup status.')));
}
async function rateLimit(env,ip){
 const current=await env.DB.prepare('SELECT count,last_at FROM login_attempts WHERE ip=?').bind(ip).first();
 return !!(current&&Date.now()-Number(current.last_at)<900000&&Number(current.count)>=10);
}
async function badPassword(env,ip){
 const t=Date.now();
 await env.DB.prepare('INSERT INTO login_attempts(ip,count,last_at) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN ?-last_at>900000 THEN 1 ELSE count+1 END,last_at=?').bind(ip,t,t,t).run();
}
const goodId=(value,prefix)=>new RegExp('^'+prefix+'-[A-Za-z0-9-]{1,100}$').test(value||'');
async function route(req,env,ctx){
 const url=new URL(req.url),p=url.pathname,m=req.method;
 if(!p.startsWith('/api/')){
  if(p==='/owner'||p==='/owner/')return env.ASSETS.fetch(new URL('/owner.html',url));
  if(p==='/owner/backup'||p==='/owner/backup/')return env.ASSETS.fetch(new Request(new URL('/backup',url),req));
  if(/^\/review\/[a-f0-9]{64}$/.test(p))return env.ASSETS.fetch(new URL('/review.html',url));
  return env.ASSETS.fetch(req);
 }
 if(!env.OWNER_PASSWORD||!env.SESSION_SECRET||!env.DB)return fail(503,'Command Center configuration is incomplete. Set D1, OWNER_PASSWORD, and SESSION_SECRET.');
 if(m==='GET'&&p==='/api/health'){
  try{
   await Promise.all(['records','login_attempts','customer_reviews','backup_connections','backup_oauth_states','backup_runs','backup_locks'].map(table=>env.DB.prepare('SELECT 1 FROM '+table+' LIMIT 1').first()));
   return reply({ok:true,service:'superior-command-center',database:'ready'});
  }catch{return fail(503,'Command Center database migrations are incomplete.');}
 }
 if(['POST','PATCH','PUT','DELETE'].includes(m)&&!originMatches(req))return fail(403,'Invalid request origin.');
 // Google returns from a different site, so the single-use OAuth state protects
 // this callback instead of relying on the owner's SameSite=Strict cookie.
 if(m==='GET'&&p==='/api/google/callback')return completeGoogleConnection(req,env);
 if(m==='GET'&&p==='/api/session')return reply({authenticated:await authorized(req,env),capabilities});
 if(m==='POST'&&p==='/api/login'){
  const ip=req.headers.get('CF-Connecting-IP')||'unknown';
  if(await rateLimit(env,ip))return fail(429,'Too many sign-in attempts. Try again later.');
  const data=await body(req);
  if(!await same(data.password||'',env.OWNER_PASSWORD)){await badPassword(env,ip);return fail(401,'Incorrect password.');}
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip=?').bind(ip).run();
  const expiry=String(Date.now()+43200000),nonce=randomHex(16);
  const token=expiry+'.'+nonce+'.'+await hmac(expiry+'.'+nonce,env.SESSION_SECRET);
  return reply({authenticated:true,capabilities},200,{'Set-Cookie':sessionCookie(token)});
 }
 if(m==='POST'&&p==='/api/logout')return reply({ok:true},200,{'Set-Cookie':'superior_sid=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'});
 if(m==='GET'&&/^\/api\/review\/[a-f0-9]{64}$/.test(p)){
  const token=p.split('/')[3],r=await env.DB.prepare("SELECT data FROM records WHERE kind='estimate' AND review_token=?").bind(token).first();
  if(!r)return fail(404,'Estimate review link not found.');
  const estimate=parseRow(r);
  return reply({estimate:publicEstimate(estimate),feedback:await feedbackFor(env,estimate.id),feedbackEnabled:true});
 }
 if(m==='POST'&&/^\/api\/review\/[a-f0-9]{64}\/feedback$/.test(p)){
  const token=p.split('/')[3],r=await env.DB.prepare("SELECT data FROM records WHERE kind='estimate' AND review_token=?").bind(token).first();
  if(!r)return fail(404,'Estimate review link not found.');
  const estimate=parseRow(r);
  if(!['approved','declined'].includes(estimate.status))return fail(409,'Approve or decline your estimate before leaving feedback.');
  const data=await body(req),rating=data.rating;
  if(!Number.isInteger(rating)||rating<1||rating>5||data.comment!==undefined&&typeof data.comment!=='string'||String(data.comment||'').trim().length>2000)return fail(400,'Choose a rating from 1 to 5 and keep comments under 2000 characters.');
  const feedback={id:id('REV'),estimateId:estimate.id,customer:estimate.customer,rating,comment:text(data.comment,2000),createdAt:now()};
  const result=await env.DB.prepare('INSERT INTO customer_reviews(id,estimate_id,created_at,data) VALUES(?,?,?,?) ON CONFLICT(estimate_id) DO NOTHING').bind(feedback.id,feedback.estimateId,feedback.createdAt,JSON.stringify(feedback)).run();
  if(!result.meta?.changes)return fail(409,'Feedback has already been saved for this estimate.');
  return reply({feedback},201);
 }
 if(m==='POST'&&/^\/api\/review\/[a-f0-9]{64}\/decision$/.test(p)){
  const token=p.split('/')[3],r=await env.DB.prepare("SELECT data FROM records WHERE kind='estimate' AND review_token=?").bind(token).first();
  if(!r)return fail(404,'Estimate review link not found.');
  const estimate=parseRow(r);
  if(estimate.status!=='sent')return fail(409,'This estimate has already received a decision.');
  const data=await body(req);
  if(!['approved','declined'].includes(data.decision))return fail(400,'Choose approve or decline.');
  const signature=text(data.signature,120);
  if(!signature)return fail(400,'Type your full name to confirm.');
  estimate.status=data.decision;estimate.decidedAt=now();estimate.customerSignature=signature;estimate.customerNote=text(data.note,1000);
  const cmd=env.DB.prepare("UPDATE records SET data=?,status=? WHERE id=? AND kind='estimate' AND status='sent'").bind(JSON.stringify(estimate),estimate.status,estimate.id);
  if(estimate.status==='approved'){
   const inv={id:id('INV'),estimateId:estimate.id,customer:estimate.customer,email:estimate.email,phone:estimate.phone,address:estimate.address,project:estimate.project,items:estimate.items,notes:estimate.notes,taxRate:estimate.taxRate,subtotal:estimate.subtotal,tax:estimate.tax,total:estimate.total,createdAt:now(),paymentStatus:'unpaid'};
   estimate.invoiceId=inv.id;
   const update=env.DB.prepare("UPDATE records SET data=?,status='approved' WHERE id=? AND kind='estimate' AND status='sent'").bind(JSON.stringify(estimate),estimate.id);
   const add=env.DB.prepare("INSERT INTO records(id,kind,status,created_at,review_token,data) SELECT ?,'invoice','unpaid',?,NULL,? WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND status='approved' AND json_extract(data,'$.invoiceId')=?)").bind(inv.id,inv.createdAt,JSON.stringify(inv),estimate.id,inv.id);
   const results=await env.DB.batch([update,add,backupQueueStatement(env,{runId:'invoice-'+inv.id,trigger:'invoice-created',sourceId:inv.id,sourceKind:'invoice'})]);
   if(!results[0].meta?.changes||!results[1].meta?.changes)return fail(409,'This estimate was already processed.');
   deliverQueuedBackups(env,ctx);
   return reply({estimate:publicEstimate(estimate),invoiceId:inv.id});
  }
  const result=await cmd.run();
  if(!result.meta?.changes)return fail(409,'This estimate was already processed.');
  return reply({estimate:publicEstimate(estimate),invoiceId:null});
 }
 // All remaining API endpoints require owner authentication.
 if(!await authorized(req,env))return fail(401,'Sign in as the owner.');
 if(m==='GET'&&p==='/api/estimates'){
  const estimates=await records(env,'estimate');
  return reply({estimates:estimates.map(({reviewToken,...e})=>e)});
 }
 if(m==='POST'&&p==='/api/estimates'){
  const e=makeEstimate(await body(req));e.id=id('EST');e.status='draft';e.createdAt=now();e.updatedAt=e.createdAt;
  await insert(env,e,'estimate','draft');deliverQueuedBackups(env,ctx);return reply({estimate:e,backup:{status:'queued'}},201);
 }
 const estMatch=p.match(/^\/api\/estimates\/(EST-[A-Za-z0-9-]+)(?:\/(share))?$/);
 if(estMatch){
  const e=await select(env,estMatch[1],'estimate');
  if(!e)return fail(404,'Estimate not found.');
  if(m==='PATCH'&&!estMatch[2]){
   if(e.status!=='draft')return fail(409,'Only draft estimates can be edited.');
   const updated=makeEstimate(await body(req),e);updated.updatedAt=now();
   const r=await env.DB.prepare("UPDATE records SET data=? WHERE id=? AND status='draft'").bind(JSON.stringify(updated),e.id).run();
   if(!r.meta?.changes)return fail(409,'Estimate changed; reload and try again.');
   return reply({estimate:updated});
  }
  if(m==='POST'&&estMatch[2]==='share'){
   if(['approved','declined'].includes(e.status))return fail(409,'This estimate has already received a decision.');
   const previousData=JSON.stringify(e);
   e.reviewToken=e.reviewToken||randomHex();e.status='sent';e.sharedAt=e.sharedAt||now();
   const result=await env.DB.prepare("UPDATE records SET data=?,status='sent',review_token=? WHERE id=? AND status IN ('draft','sent') AND data=?").bind(JSON.stringify(e),e.reviewToken,e.id,previousData).run();
   if(!result.meta?.changes)return fail(409,'Estimate changed; reload and try again.');
   return reply({estimate:publicEstimate(e),url:baseReview(req,e.reviewToken)});
  }
 }
 if(m==='GET'&&p==='/api/invoices')return reply({invoices:await records(env,'invoice')});
 if(m==='GET'&&p==='/api/reviews')return reply({reviews:await feedbackRecords(env)});
 const paid=p.match(/^\/api\/invoices\/(INV-[A-Za-z0-9-]+)\/mark-paid$/);
 if(m==='POST'&&paid){
  const inv=await select(env,paid[1],'invoice');if(!inv)return fail(404,'Invoice not found.');
  if(inv.paymentStatus==='paid')return reply({invoice:inv});
  inv.paymentStatus='paid';inv.paidAt=now();
  const results=await env.DB.batch([
   env.DB.prepare("UPDATE records SET data=?,status='paid' WHERE id=? AND kind='invoice' AND status='unpaid'").bind(JSON.stringify(inv),inv.id),
   backupQueueStatement(env,{runId:'payment-'+inv.id,trigger:'payment-recorded',sourceId:inv.id,sourceKind:'invoice'})
  ]);
  deliverQueuedBackups(env,ctx);
  return reply({invoice:results[0].meta?.changes?inv:await select(env,inv.id,'invoice')});
 }
 if(m==='GET'&&p==='/api/backup'){
  return safeFile(await backupSnapshot(env),'Superior_Command_Center_Backup_'+now().slice(0,10)+'.json');
 }
 if(m==='POST'&&p==='/api/restore'){
  const d=await body(req,8*1024*1024);
  if(d.app!=='Superior Maintenance and Remodeling - Command Center'||d.version!==1||d.confirm!=='RESTORE'||!Array.isArray(d.estimates)||!Array.isArray(d.invoices)||d.reviews!==undefined&&!Array.isArray(d.reviews))return fail(400,'Invalid backup or missing RESTORE confirmation.');
  const reviews=d.reviews||[];
  if(d.estimates.length+d.invoices.length+reviews.length>250)return fail(413,'This backup is too large for online restore. Contact support for a staged import.');
  const commands=[],kinds=[],seen=new Set(),seenEstimates=new Set();
  for(const [kind,array,prefix] of [['estimate',d.estimates,'EST'],['invoice',d.invoices,'INV']]){
   for(const r of array){
    if(!r||typeof r!=='object')return fail(400,'Invalid backup record.');
    const status=kind==='estimate'?r.status:r.paymentStatus;
    if(!goodId(r.id,prefix)||seen.has(r.id)||!Array.isArray(r.items)||r.items.length<1||r.items.length>40||typeof r.customer!=='string'||!r.customer.trim()||!Number.isFinite(Number(r.total))||Number(r.total)<0||(r.createdAt!==undefined&&(typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt))))||(kind==='estimate'?!['draft','sent','approved','declined'].includes(status):!['paid','unpaid'].includes(status))||kind==='estimate'&&r.reviewToken&&!/^[a-f0-9]{64}$/.test(r.reviewToken))return fail(400,'Invalid or duplicate backup record.');
    inputItems(r.items);
    const record={...r,createdAt:r.createdAt||now()};
    seen.add(r.id);
    kinds.push(kind);
    commands.push(env.DB.prepare('INSERT INTO records(id,kind,status,created_at,review_token,data) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING').bind(record.id,kind,status,record.createdAt,kind==='estimate'?record.reviewToken||null:null,JSON.stringify(record)));
   }
  }
  for(const r of reviews){
   if(!r||typeof r!=='object'||!goodId(r.id,'REV')||seen.has(r.id)||!goodId(r.estimateId,'EST')||seenEstimates.has(r.estimateId)||typeof r.customer!=='string'||!r.customer.trim()||!Number.isInteger(r.rating)||r.rating<1||r.rating>5||typeof r.comment!=='string'||r.comment.length>2000||(r.createdAt!==undefined&&(typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))))return fail(400,'Invalid or duplicate feedback record.');
   const record={...r,createdAt:r.createdAt||now()};
   seen.add(r.id);seenEstimates.add(r.estimateId);kinds.push('review');
   commands.push(env.DB.prepare("INSERT INTO customer_reviews(id,estimate_id,created_at,data) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND kind='estimate') ON CONFLICT DO NOTHING").bind(record.id,record.estimateId,record.createdAt,JSON.stringify(record),record.estimateId));
  }
  const results=commands.length?await env.DB.batch(commands):[],imported={estimate:0,invoice:0,review:0};
  for(let i=0;i<results.length;i++)imported[kinds[i]]+=Number(results[i].meta?.changes||0);
  return reply({ok:true,estimates:imported.estimate,invoices:imported.invoice,reviews:imported.review,skipped:commands.length-imported.estimate-imported.invoice-imported.review});
 }
 if(m==='GET'&&p==='/api/google/status')return reply(await backupStatus(env));
 if(m==='GET'&&p==='/api/google/connect')return startGoogleConnection(req,env);
 if(m==='POST'&&p==='/api/google/backup-now'){
  const key=req.headers.get('Idempotency-Key')||crypto.randomUUID();
  if(!/^[A-Za-z0-9-]{1,80}$/.test(key))return fail(400,'Invalid backup request.');
  try{return reply(await runCloudBackup(env,{runId:'manual-'+key,trigger:'manual'}));}
  catch{return fail(502,'Cloud backup did not finish. Check the connection and delivery status before trying again.');}
 }
 return fail(404,'Not found.');
}
export default {
 async fetch(request,env,ctx){try{return await route(request,env,ctx);}catch(e){console.error('Command Center error:',e?.message);const msg=e?.message||'Internal server error';return fail(/Invalid JSON|Request is too large|Check |Add between|Customer name|Tax must|Estimate amount/.test(msg)?400:500,/Invalid JSON|Request is too large|Check |Add between|Customer name|Tax must|Estimate amount/.test(msg)?msg:'Server error.');}},
 async scheduled(controller,env,ctx){
  const task=(async()=>{
   const state=await backupStatus(env);
   if(!state.configured||!state.connected)return;
   await processBackupQueue(env,{limit:3});
  })().catch(()=>console.error('Scheduled cloud backup did not finish. Check the owner backup status.'));
  ctx.waitUntil(task);
  await task;
 }
};

