// Superior Command Center — Cloudflare Workers + durable D1 storage
// IMPORTANT: Set OWNER_PASSWORD and SESSION_SECRET as Worker secrets.
const now=()=>new Date().toISOString();
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
 try{return JSON.parse(raw||'{}');}catch{throw Error('Invalid JSON.');}
}
function originMatches(req){const origin=req.headers.get('origin');return !origin||origin===new URL(req.url).origin;}
function inputItems(arr){
 if(!Array.isArray(arr)||arr.length<1||arr.length>40)throw Error('Add between 1 and 40 line items.');
 return arr.map(item=>{
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
async function insert(env,record,kind,status,token=null){await env.DB.prepare('INSERT INTO records(id,kind,status,created_at,review_token,data) VALUES (?,?,?,?,?,?)').bind(record.id,kind,status,record.createdAt,token,JSON.stringify(record)).run();}
async function rateLimit(env,ip){
 const current=await env.DB.prepare('SELECT count,last_at FROM login_attempts WHERE ip=?').bind(ip).first();
 return !!(current&&Date.now()-Number(current.last_at)<900000&&Number(current.count)>=10);
}
async function badPassword(env,ip){
 const t=Date.now();
 await env.DB.prepare('INSERT INTO login_attempts(ip,count,last_at) VALUES(?,1,?) ON CONFLICT(ip) DO UPDATE SET count=CASE WHEN ?-last_at>900000 THEN 1 ELSE count+1 END,last_at=?').bind(ip,t,t,t).run();
}
const goodId=(value,prefix)=>new RegExp('^'+prefix+'-[A-Za-z0-9-]{1,100}$').test(value||'');
async function route(req,env){
 const url=new URL(req.url),p=url.pathname,m=req.method;
 if(!p.startsWith('/api/')){
  if(p==='/owner'||p==='/owner/')return env.ASSETS.fetch(new URL('/owner.html',url));
  if(p==='/owner/backup')return env.ASSETS.fetch(new URL('/backup.html',url));
  if(/^\/review\/[a-f0-9]{64}$/.test(p))return env.ASSETS.fetch(new URL('/review.html',url));
  return env.ASSETS.fetch(req);
 }
 if(!env.OWNER_PASSWORD||!env.SESSION_SECRET||!env.DB)return fail(503,'Command Center configuration is incomplete. Set D1, OWNER_PASSWORD, and SESSION_SECRET.');
 if(['POST','PATCH','PUT','DELETE'].includes(m)&&!originMatches(req))return fail(403,'Invalid request origin.');
 if(m==='GET'&&p==='/api/session')return reply({authenticated:await authorized(req,env)});
 if(m==='POST'&&p==='/api/login'){
  const ip=req.headers.get('CF-Connecting-IP')||'unknown';
  if(await rateLimit(env,ip))return fail(429,'Too many sign-in attempts. Try again later.');
  const data=await body(req);
  if(!await same(data.password||'',env.OWNER_PASSWORD)){await badPassword(env,ip);return fail(401,'Incorrect password.');}
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip=?').bind(ip).run();
  const expiry=String(Date.now()+43200000),nonce=randomHex(16);
  const token=expiry+'.'+nonce+'.'+await hmac(expiry+'.'+nonce,env.SESSION_SECRET);
  return reply({authenticated:true},200,{'Set-Cookie':sessionCookie(token)});
 }
 if(m==='POST'&&p==='/api/logout')return reply({ok:true},200,{'Set-Cookie':'superior_sid=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0'});
 if(m==='GET'&&/^\/api\/review\/[a-f0-9]{64}$/.test(p)){
  const token=p.split('/')[3],r=await env.DB.prepare("SELECT data FROM records WHERE kind='estimate' AND review_token=?").bind(token).first();
  if(!r)return fail(404,'Estimate review link not found.');
  return reply({estimate:publicEstimate(parseRow(r))});
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
   const inv={id:id('INV'),estimateId:estimate.id,customer:estimate.customer,email:estimate.email,address:estimate.address,project:estimate.project,items:estimate.items,notes:estimate.notes,subtotal:estimate.subtotal,tax:estimate.tax,total:estimate.total,createdAt:now(),paymentStatus:'unpaid'};
   estimate.invoiceId=inv.id;
   const update=env.DB.prepare("UPDATE records SET data=?,status='approved' WHERE id=? AND kind='estimate' AND status='sent'").bind(JSON.stringify(estimate),estimate.id);
   const add=env.DB.prepare("INSERT INTO records(id,kind,status,created_at,review_token,data) SELECT ?,'invoice','unpaid',?,NULL,? WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND status='approved' AND json_extract(data,'$.invoiceId')=?)").bind(inv.id,inv.createdAt,JSON.stringify(inv),estimate.id,inv.id);
   const results=await env.DB.batch([update,add]);
   if(!results[0].meta?.changes||!results[1].meta?.changes)return fail(409,'This estimate was already processed.');
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
  await insert(env,e,'estimate','draft');return reply({estimate:e},201);
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
   e.reviewToken=e.reviewToken||randomHex();e.status='sent';e.sharedAt=e.sharedAt||now();
   await env.DB.prepare("UPDATE records SET data=?,status='sent',review_token=? WHERE id=? AND status IN ('draft','sent')").bind(JSON.stringify(e),e.reviewToken,e.id).run();
   return reply({estimate:publicEstimate(e),url:baseReview(req,e.reviewToken)});
  }
 }
 if(m==='GET'&&p==='/api/invoices')return reply({invoices:await records(env,'invoice')});
 const paid=p.match(/^\/api\/invoices\/(INV-[A-Za-z0-9-]+)\/mark-paid$/);
 if(m==='POST'&&paid){
  const inv=await select(env,paid[1],'invoice');if(!inv)return fail(404,'Invoice not found.');
  inv.paymentStatus='paid';inv.paidAt=now();
  await env.DB.prepare("UPDATE records SET data=?,status='paid' WHERE id=? AND kind='invoice'").bind(JSON.stringify(inv),inv.id).run();
  return reply({invoice:inv});
 }
 if(m==='GET'&&p==='/api/backup'){
  const estimates=(await records(env,'estimate')).filter(e=>e.status!=='declined'),invoices=await records(env,'invoice');
  return safeFile({app:'Superior Maintenance and Remodeling - Command Center',version:1,exportedAt:now(),estimates,invoices},'Superior_Command_Center_Backup_'+now().slice(0,10)+'.json');
 }
 if(m==='POST'&&p==='/api/restore'){
  const d=await body(req,8*1024*1024);
  if(d.app!=='Superior Maintenance and Remodeling - Command Center'||d.version!==1||d.confirm!=='RESTORE'||!Array.isArray(d.estimates)||!Array.isArray(d.invoices))return fail(400,'Invalid backup or missing RESTORE confirmation.');
  if(d.estimates.length+d.invoices.length>250)return fail(413,'This backup is too large for online restore. Contact support for a staged import.');
  const commands=[env.DB.prepare('DELETE FROM records')],seen=new Set();
  for(const [kind,array,prefix] of [['estimate',d.estimates,'EST'],['invoice',d.invoices,'INV']]){
   for(const r of array){
    const status=kind==='estimate'?r.status:r.paymentStatus;
    if(!goodId(r.id,prefix)||seen.has(r.id)||!Array.isArray(r.items)||r.items.length>40||typeof r.customer!=='string'||!Number.isFinite(Number(r.total))||(kind==='estimate'?!['draft','sent','approved'].includes(status):!['paid','unpaid'].includes(status)))return fail(400,'Invalid or duplicate backup record.');
    seen.add(r.id);
    commands.push(env.DB.prepare('INSERT INTO records(id,kind,status,created_at,review_token,data) VALUES(?,?,?,?,?,?)').bind(r.id,kind,status,r.createdAt||now(),kind==='estimate'?r.reviewToken||null:null,JSON.stringify(r)));
   }
  }
  await env.DB.batch(commands);return reply({ok:true,estimates:d.estimates.length,invoices:d.invoices.length});
 }
 if(m==='GET'&&p==='/api/google/status')return reply({configured:false,connected:false,folderUrl:null,lastBackupAt:null,lastError:null,notice:'Cloudflare D1 stores records. Google Drive OAuth is not configured yet.'});
 if(p==='/api/google/connect'||p==='/api/google/backup-now')return fail(503,'Google Drive auto-backup is not connected yet. Download a backup and save it in your private Drive folder.');
 return fail(404,'Not found.');
}
export default {async fetch(request,env,ctx){try{return await route(request,env);}catch(e){console.error('Command Center error:',e?.message);const msg=e?.message||'Internal server error';return fail(/Invalid JSON|Request is too large|Check |Add between|Customer name|Tax must|Estimate amount/.test(msg)?400:500,/Invalid JSON|Request is too large|Check |Add between|Customer name|Tax must|Estimate amount/.test(msg)?msg:'Server error.');}}};
