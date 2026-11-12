'use strict';
/** Superior Maintenance & Remodeling owner website + estimate approval server.
 * Required: OWNER_PASSWORD (set before internet deployment).
 * Required for real durability: DATA_DIR on a persistent mounted volume.
 * No third-party packages; Node 20+.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { GoogleDriveBackup } = require('./google-drive');
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || '';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname,'data');
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const DATA_FILE = path.join(DATA_DIR,'records.json');
const ROOT = __dirname;
const sessions = new Map();
const badLogins = new Map();
const MAX_BODY = 100 * 1024;
const MAX_RESTORE_BODY = 8 * 1024 * 1024;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};
fs.mkdirSync(DATA_DIR,{recursive:true});
let db={estimates:[],invoices:[]};
if(fs.existsSync(DATA_FILE)) { try {const saved=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); if(Array.isArray(saved.estimates)&&Array.isArray(saved.invoices)) db=saved; else throw new Error('Invalid database format');}catch(e){ console.error('Cannot load data store:',e);process.exit(1);} }
const googleDrive=new GoogleDriveBackup({dataDir:DATA_DIR,ownerPassword:OWNER_PASSWORD,getRecords:()=>db});
const persist=()=>{ const tmp=DATA_FILE+'.'+crypto.randomBytes(6).toString('hex')+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,DATA_FILE);googleDrive.queueBackup();};
const cents=v=>Math.round(Number(v)*100);
const money=v=>Number((v/100).toFixed(2));
const safe=(v,max=200)=>String(v??'').trim().slice(0,max);
const validEmail=v=>/^\S+@\S+\.\S+$/.test(v)&&v.length<=254;
const now=()=>new Date().toISOString();
const idFor=(prefix,records)=>prefix+'-'+new Date().getFullYear()+'-'+String(records.length+1).padStart(4,'0')+'-'+crypto.randomBytes(2).toString('hex').toUpperCase();
const hash=v=>crypto.createHash('sha256').update(String(v)).digest();
const equal=(a,b)=>crypto.timingSafeEqual(hash(a),hash(b));
const cookieSession=req=>{const match=(req.headers.cookie||'').match(/(?:^|;\s*)superior_sid=([a-f0-9]{64})(?:;|$)/); const token=match?.[1];const data=token&&sessions.get(token);if(!data||data.expires<Date.now())return null;data.expires=Date.now()+12*60*60*1000;return token;};
const headers=(extra={})=>({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",...extra});
const json=(res,status,body,extra={})=>{res.writeHead(status,headers({'Content-Type':'application/json; charset=utf-8',...extra}));res.end(JSON.stringify(body));};
const reject=(res,status,message)=>json(res,status,{error:message});
const readBody=async(req,limit=MAX_BODY)=>{let b='';let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>limit)throw Error('Request too large');b+=chunk.toString('utf8');}try{return JSON.parse(b||'{}');}catch{throw Error('Invalid JSON');}};
const originOk=req=>{const origin=req.headers.origin;if(!origin)return true;try {const host=req.headers.host;return new URL(origin).host===host && /^https?:$/.test(new URL(origin).protocol);}catch{return false;}};
const ownerOnly=(req,res)=>{if(!cookieSession(req)){reject(res,401,'Sign in as the owner.');return false;}return true;};
function parseItems(raw){if(!Array.isArray(raw)||raw.length<1||raw.length>40)throw Error('Add between 1 and 40 line items.');return raw.map(v=>{const description=safe(v.description,240),qty=Number(v.qty),rate=Number(v.rate);if(!description||!Number.isFinite(qty)||qty<=0||qty>100000||!Number.isFinite(rate)||rate<0||rate>1000000)throw Error('Check line item description, quantity and unit price.');const total=Math.round(qty*cents(rate));return {description,qty,rate:money(cents(rate)),total:money(total)};});}
function makeEstimate(input,original){const customer=safe(input.customer,120);const email=safe(input.email,254);const phone=safe(input.phone,50);const address=safe(input.address,240);if(!customer||!validEmail(email))throw Error('A customer name and valid email are required.');const items=parseItems(input.items);const taxRate=Number(input.taxRate||0);if(!Number.isFinite(taxRate)||taxRate<0||taxRate>25)throw Error('Tax rate must be between 0 and 25 percent.');const subtotalCents=items.reduce((sum,item)=>sum+cents(item.total),0);const taxCents=Math.round(subtotalCents*taxRate/100);if(subtotalCents+taxCents>1e10)throw Error('Estimate amount is too large.');return {...(original||{}),customer,email,phone,address,project:safe(input.project,240),notes:safe(input.notes,3000),items,taxRate,subtotal:money(subtotalCents),tax:money(taxCents),total:money(subtotalCents+taxCents)};}
const publicEstimate=e=>({id:e.id,customer:e.customer,project:e.project,address:e.address,notes:e.notes,items:e.items,taxRate:e.taxRate,subtotal:e.subtotal,tax:e.tax,total:e.total,status:e.status,createdAt:e.createdAt,sharedAt:e.sharedAt,decidedAt:e.decidedAt,customerNote:e.customerNote});
const reviewUrl=(req,token)=>{if(PUBLIC_BASE_URL) return `${PUBLIC_BASE_URL.replace(/\/$/,'')}/review/${token}`;const proto=(req.headers['x-forwarded-proto']==='https'||req.socket.encrypted)?'https':'http';return `${proto}://${req.headers.host}/review/${token}`;};
const fileRoutes={'/owner/backup':'backup.html','/backup.html':'backup.html','/backup.css':'backup.css','/backup.js':'backup.js','/':'index.html','/index.html':'index.html','/owner':'owner.html','/owner.html':'owner.html','/styles.css':'styles.css','/script.js':'script.js','/owner.css':'owner.css','/owner.js':'owner.js','/review.js':'review.js'};
const STATIC_ASSETS=new Set(['superior-logo.webp']);
function staticFile(res,file){if(!fs.existsSync(file)||!fs.statSync(file).isFile())return reject(res,404,'Not found.');const mime=MIME[path.extname(file)]||'application/octet-stream';res.writeHead(200,headers({'Content-Type':mime,'Cache-Control':'public, max-age=300'}));fs.createReadStream(file).pipe(res);}
const server=http.createServer(async (req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
 if(req.method==='GET'&&Object.hasOwn(fileRoutes,pathname))return staticFile(res,path.join(ROOT,fileRoutes[pathname]));
 if(req.method==='GET'&&/^\/assets\/[a-zA-Z0-9._-]+$/.test(pathname)&&STATIC_ASSETS.has(pathname.split('/').pop()))return staticFile(res,path.join(ROOT,pathname));
 if(req.method==='GET'&&/^\/review\/[a-f0-9]{64}$/.test(pathname))return staticFile(res,path.join(ROOT,'review.html'));
 if(!pathname.startsWith('/api/'))return reject(res,404,'Not found.');
 if(!OWNER_PASSWORD)return reject(res,503,'Owner login is not configured on the server.');
 if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&!originOk(req))return reject(res,403,'Invalid request origin.');
 if(req.method==='GET'&&pathname==='/api/google/status'){
   if(!ownerOnly(req,res))return;return json(res,200,googleDrive.getStatus());
 }
 if(req.method==='GET'&&pathname==='/api/google/connect'){
   if(!ownerOnly(req,res))return;
   if(!googleDrive.configured())return reject(res,503,'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Render environment settings first.');
   return res.writeHead(302,headers({Location:googleDrive.authUrl()})).end();
 }
 if(req.method==='GET'&&pathname==='/api/google/callback'){
   try{
     if(url.searchParams.has('error'))return res.writeHead(303,headers({Location:'/owner/backup?drive=denied'})).end();
     await googleDrive.completeAuth(url.searchParams.get('code'),url.searchParams.get('state'));
     return res.writeHead(303,headers({Location:'/owner/backup?drive=connected'})).end();
   }catch(e){console.error('Google OAuth callback failed:',e.message);return res.writeHead(303,headers({Location:'/owner/backup?drive=error'})).end();}
 }
 if(req.method==='POST'&&pathname==='/api/google/backup-now'){
   if(!ownerOnly(req,res))return;
   try{return json(res,200,{ok:true,...await googleDrive.backupNow()});}
   catch(e){return reject(res,503,e.message);}
 }
 if(req.method==='GET'&&pathname==='/api/session')return json(res,200,{authenticated:!!cookieSession(req)});
 if(req.method==='POST'&&pathname==='/api/login'){
   const ip=safe(req.socket.remoteAddress||'unknown',80);const attempts=badLogins.get(ip)||[];const recent=attempts.filter(t=>t>Date.now()-15*60*1000);if(recent.length>=10)return reject(res,429,'Too many sign-in attempts. Try again later.');
   const input=await readBody(req);if(!equal(input.password||'',OWNER_PASSWORD)){recent.push(Date.now());badLogins.set(ip,recent);return reject(res,401,'Incorrect password.');}
   badLogins.delete(ip);const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{expires:Date.now()+12*60*60*1000});const secure=req.socket.encrypted||req.headers['x-forwarded-proto']==='https';
   return json(res,200,{authenticated:true},{'Set-Cookie':`superior_sid=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${secure?'; Secure':''}`});
 }
 if(req.method==='POST'&&pathname==='/api/logout'){const token=cookieSession(req);if(token)sessions.delete(token);return json(res,200,{ok:true},{'Set-Cookie':'superior_sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
 if(req.method==='GET'&&pathname==='/api/backup'){
   if(!ownerOnly(req,res))return;
   const backup={app:'Superior Maintenance and Remodeling - Command Center',version:1,exportedAt:now(),estimates:db.estimates.filter(e=>e.status!=='declined'),invoices:db.invoices};
   const filename=`Superior_Command_Center_Backup_${new Date().toISOString().slice(0,10)}.json`;
   res.writeHead(200,headers({'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="${filename}"`}));
   return res.end(JSON.stringify(backup,null,2));
 }
 if(req.method==='POST'&&pathname==='/api/restore'){
   if(!ownerOnly(req,res))return;
   let input;try{input=await readBody(req,MAX_RESTORE_BODY);}catch(e){return reject(res,e.message==='Request too large'?413:400,e.message);}
   if(input?.app!=='Superior Maintenance and Remodeling - Command Center'||input.version!==1||!Array.isArray(input.estimates)||!Array.isArray(input.invoices))return reject(res,400,'This is not a supported Command Center backup.');
   if(input.confirm!=='RESTORE')return reject(res,400,'Restore confirmation is required.');
   if(input.estimates.length>100000||input.invoices.length>100000)return reject(res,400,'Backup exceeds allowed record count.');
   const validEstimate=e=>e&&typeof e==='object'&&/^EST-[A-Za-z0-9-]{1,100}$/.test(e.id||'')&&typeof e.customer==='string'&&Array.isArray(e.items)&&e.items.length<=40&&['draft','sent','approved','declined'].includes(e.status)&&Number.isFinite(Number(e.total));
   const validInvoice=i=>i&&typeof i==='object'&&/^INV-[A-Za-z0-9-]{1,100}$/.test(i.id||'')&&typeof i.customer==='string'&&Array.isArray(i.items)&&i.items.length<=40&&['paid','unpaid'].includes(i.paymentStatus)&&Number.isFinite(Number(i.total));
   if(!input.estimates.every(validEstimate)||!input.invoices.every(validInvoice))return reject(res,400,'The backup contains invalid records.');
   if(new Set(input.estimates.map(e=>e.id)).size!==input.estimates.length||new Set(input.invoices.map(i=>i.id)).size!==input.invoices.length)return reject(res,400,'Duplicate record IDs in backup.');
   // Save a rollback snapshot on the same volume; the downloaded user backup remains the reliable off-site copy.
   const prior=db;db={estimates:input.estimates,invoices:input.invoices};
   try{persist();}catch(e){db=prior;throw e;}
   return json(res,200,{ok:true,estimates:db.estimates.length,invoices:db.invoices.length});
 }
 if(req.method==='GET'&&pathname==='/api/estimates'){if(!ownerOnly(req,res))return;return json(res,200,{estimates:db.estimates.map(({reviewToken,...e})=>e)});}
 if(req.method==='POST'&&pathname==='/api/estimates'){
   if(!ownerOnly(req,res))return;let e;try{e=makeEstimate(await readBody(req));}catch(err){return reject(res,400,err.message);}
   e.id=idFor('EST',db.estimates);e.status='draft';e.createdAt=now();e.updatedAt=e.createdAt;db.estimates.unshift(e);persist();return json(res,201,{estimate:e});
 }
 const matchEstimate=pathname.match(/^\/api\/estimates\/(EST-[A-Za-z0-9-]+)(?:\/(share))?$/);
 if(matchEstimate){if(!ownerOnly(req,res))return;const e=db.estimates.find(x=>x.id===matchEstimate[1]);if(!e)return reject(res,404,'Estimate not found.');
   if(req.method==='PATCH'&&!matchEstimate[2]){if(e.status!=='draft')return reject(res,409,'Only drafts may be edited. Create a new estimate to revise a sent quote.');let update;try{update=makeEstimate(await readBody(req),e);}catch(err){return reject(res,400,err.message);}Object.assign(e,update,{updatedAt:now()});persist();return json(res,200,{estimate:e});}
   if(req.method==='POST'&&matchEstimate[2]==='share') {if(['approved','declined'].includes(e.status))return reject(res,409,'This estimate has already received a decision.');e.reviewToken ||= crypto.randomBytes(32).toString('hex');e.status='sent';e.sharedAt ||= now();persist();return json(res,200,{estimate:{...e,reviewToken:undefined},url:reviewUrl(req,e.reviewToken)});}
 }
 if(req.method==='GET'&&pathname==='/api/invoices'){if(!ownerOnly(req,res))return;return json(res,200,{invoices:db.invoices});}
 const matchInvoice=pathname.match(/^\/api\/invoices\/(INV-[A-Za-z0-9-]+)\/mark-paid$/);
 if(req.method==='POST'&&matchInvoice){if(!ownerOnly(req,res))return;const inv=db.invoices.find(i=>i.id===matchInvoice[1]);if(!inv)return reject(res,404,'Invoice not found.');inv.paymentStatus='paid';inv.paidAt=now();persist();return json(res,200,{invoice:inv});}
 const reviewMatch=pathname.match(/^\/api\/review\/([a-f0-9]{64})(?:\/decision)?$/);
 if(reviewMatch){const e=db.estimates.find(x=>x.reviewToken===reviewMatch[1]);if(!e)return reject(res,404,'Estimate link not found or invalid.');
  if(req.method==='GET'&&pathname.endsWith(reviewMatch[1]))return json(res,200,{estimate:publicEstimate(e)});
  if(req.method==='POST'&&pathname.endsWith('/decision')){
    if(e.status!=='sent')return reject(res,409,'A decision has already been recorded or the estimate is unavailable.');const body=await readBody(req);if(!['approved','declined'].includes(body.decision))return reject(res,400,'Choose approve or decline.');
    const signature=safe(body.signature,120);if(!signature)return reject(res,400,'Please type your full name to confirm your choice.');e.status=body.decision;e.decidedAt=now();e.customerNote=safe(body.note,1000);e.customerSignature=signature;
    if(e.status==='approved'){
      const inv={id:idFor('INV',db.invoices),estimateId:e.id,customer:e.customer,email:e.email,address:e.address,project:e.project,items:e.items,notes:e.notes,subtotal:e.subtotal,tax:e.tax,total:e.total,createdAt:now(),paymentStatus:'unpaid'};db.invoices.unshift(inv);e.invoiceId=inv.id;
    }
    persist();return json(res,200,{estimate:publicEstimate(e),invoiceId:e.invoiceId||null});
  }
 }
 return reject(res,404,'Not found.');
 }catch(e){console.error('Server error:',e.message);return reject(res,e.message==='Request too large'?413:500,e.message==='Request too large'?'Request too large.':'Server error.');}});
if(require.main===module) server.listen(PORT,HOST,()=>console.log(`Superior owner website: http://localhost:${PORT} | data: ${DATA_DIR}`));
module.exports={server};