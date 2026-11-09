import {appendFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const expectedDatabase='4feb6f63-1102-467a-87e6-256309364f12';
const knownTypes=new Set(['secret_text','plain_text','d1','json']);

// Settings can contain plaintext binding values. Never serialize or log the payload.
export function describeWorkerSettings(payload){
 if(payload?.success!==true||!Array.isArray(payload.result?.bindings))throw Error('Cloudflare Worker settings metadata is invalid.');
 const bindings=payload.result.bindings,lines=[],missing=[];
 let unsafeOwnerBinding=false,wrongDatabase=false;
 for(const name of ['OWNER_PASSWORD','SESSION_SECRET','DB']){
  const matches=bindings.filter(binding=>binding?.name===name);
  if(matches.length>1)throw Error('Cloudflare Worker settings contain duplicate expected binding names.');
  const binding=matches[0];
  if(!binding){lines.push(name+': missing.');missing.push(name);continue;}
  const type=knownTypes.has(binding.type)?binding.type:'unknown';
  if(name==='DB'){
   const matchesExpected=binding.type==='d1'&&binding.id===expectedDatabase;
   lines.push('DB: present ('+type+'); matches expected database: '+(matchesExpected?'yes':'no')+'.');
   wrongDatabase=!matchesExpected;
  }else{
   lines.push(name+': present ('+type+').');
   if(binding.type!=='secret_text')unsafeOwnerBinding=true;
  }
 }
 return {lines,missing,unsafeOwnerBinding,wrongDatabase};
}

export function describeBackupSettings(payload){
 if(payload?.success!==true||!Array.isArray(payload.result?.bindings))throw Error('Cloudflare Worker settings metadata is invalid.');
 const lines=[],missing=[];let unsafeSecret=false;
 for(const name of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET']){
  const matches=payload.result.bindings.filter(binding=>binding?.name===name);
  if(matches.length>1)throw Error('Cloudflare Worker settings contain duplicate Google binding names.');
  const binding=matches[0];
  if(!binding){lines.push(name+': missing; cloud backup activation pending.');missing.push(name);continue;}
  lines.push(name+': present ('+(knownTypes.has(binding.type)?binding.type:'unknown')+').');
  if(name==='GOOGLE_CLIENT_SECRET'&&binding.type!=='secret_text')unsafeSecret=true;
 }
 return {lines,missing,unsafeSecret};
}

export async function inspectWorkerSettings({env=process.env,fetchImpl=fetch,write=console.log}={}){
 const account=env.CLOUDFLARE_ACCOUNT_ID||env.ACCOUNT_ID||'',token=env.CLOUDFLARE_API_TOKEN||'';
 if(!/^[a-f0-9]{32}$/i.test(account))throw Error('A valid CLOUDFLARE_ACCOUNT_ID is required for the read-only settings check.');
 if(!token)throw Error('CLOUDFLARE_API_TOKEN is required for the read-only settings check.');
 let response;
 try{
  response=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+account+'/workers/scripts/superior-command-center/settings',{
   headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)
  });
 }catch{throw Error('Cloudflare Worker settings request failed (network, timeout, or TLS error).');}
 let payload;
 try{payload=await response.json();}catch{throw Error('Cloudflare Worker settings response is not valid JSON.');}
 if(!response.ok||payload?.success!==true){
  const status=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:0;
  const codes=Array.isArray(payload?.errors)?[...new Set(payload.errors.map(error=>error?.code).filter(code=>Number.isSafeInteger(code)&&code>=0&&code<=9999999))].slice(0,5):[];
  throw Error('Cloudflare Worker settings request failed (HTTP '+status+(codes.length?'; API codes '+codes.join(', '):'')+').');
 }
 const report=describeWorkerSettings(payload);
 const backups=describeBackupSettings(payload);
 for(const line of report.lines)write(line);
 for(const line of backups.lines)write(line);
 const notices=[];
 if(report.missing.length)notices.push('Missing expected bindings: '+report.missing.join(', ')+'. In Cloudflare, open Workers & Pages → superior-command-center → Settings → Variables and Secrets. Add OWNER_PASSWORD and SESSION_SECRET as Secret values if missing; never paste values in chat or logs.');
 if(report.unsafeOwnerBinding)notices.push('Deployment blocked: OWNER_PASSWORD and SESSION_SECRET must use Secret bindings (secret_text), never plaintext variables.');
 if(report.wrongDatabase)notices.push('Deployment blocked: DB does not match the configured D1 database. Preserve the existing database and investigate its binding.');
 if(backups.missing.length)notices.push('Drive and email backup delivery remains pending secure Google client configuration and owner authorization. Invoice storage and manual export remain available.');
 if(backups.unsafeSecret)notices.push('Deployment blocked: GOOGLE_CLIENT_SECRET must be stored as a Secret binding, never plaintext.');
 for(const notice of notices)write(notice);
 if(env.GITHUB_STEP_SUMMARY)await appendFile(env.GITHUB_STEP_SUMMARY,[...report.lines,...backups.lines,...notices].join('\n\n')+'\n');
 if(backups.unsafeSecret)throw Error('Google client credentials must use secret_text before deployment.');
 if(report.unsafeOwnerBinding)throw Error('Owner credential bindings must use secret_text before deployment.');
 if(report.wrongDatabase)throw Error('DB binding must match the configured D1 database before deployment.');
 return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await inspectWorkerSettings();}catch(error){
  const message=error.message;
  console.error(message);
  if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,message+'\n');
  process.exitCode=1;
 }
}
