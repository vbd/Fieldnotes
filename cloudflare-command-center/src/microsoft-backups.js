// Microsoft OneDrive Personal backup adapter for Superior Command Center.
// Not active until worker routes, owner UI, D1 migration and secrets are wired.
// Required: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, SESSION_SECRET.
// Microsoft Entra app registration: personal Microsoft accounts supported;
// delegated Files.ReadWrite, User.Read, offline_access. Redirect URI:
// https://superior-command-center.superiormandr.workers.dev/api/microsoft/callback
const GRAPH='https://graph.microsoft.com/v1.0';
const LOGIN='https://login.microsoftonline.com/consumers/oauth2/v2.0';
const SCOPES='offline_access User.Read Files.ReadWrite';
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes));
const unb64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
const nonce=()=>b64(crypto.getRandomValues(new Uint8Array(32))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
const callback=req=>new URL('/api/microsoft/callback',req.url).toString();
const redirect=req=>new Response(null,{status:303,headers:{Location:new URL('/owner/backup',req.url).toString(),'Cache-Control':'no-store'}});
async function key(env){
 const material=await crypto.subtle.importKey('raw',enc.encode(env.SESSION_SECRET),'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',salt:enc.encode('superior-command-center'),info:enc.encode('microsoft-backup-refresh-token-v1')},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(env,token){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),enc.encode(token));
 return JSON.stringify({iv:b64(iv),data:b64(new Uint8Array(data))});
}
async function unseal(env,value){
 const obj=JSON.parse(value);
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(obj.iv)},await key(env),unb64(obj.data)));
}
async function token(env,fields){
 const response=await fetch(LOGIN+'/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.MICROSOFT_CLIENT_ID,client_secret:env.MICROSOFT_CLIENT_SECRET,...fields})});
 if(!response.ok)throw Error('Microsoft authorization failed');
 const body=await response.json();
 if(!body.access_token)throw Error('Microsoft access token missing');
 return body;
}
export async function startMicrosoft(req,env){
 if(!env.MICROSOFT_CLIENT_ID||!env.MICROSOFT_CLIENT_SECRET||!env.SESSION_SECRET)throw Error('Microsoft backup credentials are not configured');
 const state=nonce();
 await env.DB.prepare('INSERT INTO backup_oauth_states(state_hash,expires_at) VALUES(?,?)').bind(await sha(state),Date.now()+600000).run();
 const url=new URL(LOGIN+'/authorize');
 Object.entries({client_id:env.MICROSOFT_CLIENT_ID,response_type:'code',redirect_uri:callback(req),response_mode:'query',scope:SCOPES,state,prompt:'select_account'}).forEach(([k,v])=>url.searchParams.set(k,v));
 return new Response(null,{status:303,headers:{Location:url.toString(),'Cache-Control':'no-store'}});
}
export async function finishMicrosoft(req,env){
 const url=new URL(req.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';
 if(!/^[A-Za-z0-9_-]{40,60}$/.test(state))throw Error('Invalid Microsoft authorization state');
 const consumed=await env.DB.prepare('DELETE FROM backup_oauth_states WHERE state_hash=? AND expires_at>?').bind(await sha(state),Date.now()).run();
 if(!consumed.meta?.changes||!code||url.searchParams.has('error'))throw Error('Microsoft authorization was not completed');
 const grant=await token(env,{grant_type:'authorization_code',code,redirect_uri:callback(req),scope:SCOPES});
 if(!grant.refresh_token)throw Error('Microsoft offline authorization was not granted');
 const identity=await graph(grant.access_token,'/me?$select=id,displayName,userPrincipalName');
 if(!identity.id)throw Error('Microsoft account could not be verified');
 const encrypted=await seal(env,grant.refresh_token);
 // Store separately from the Google connection. Migration must create this table.
 await env.DB.prepare('INSERT INTO microsoft_backup_connection(id,account_id,refresh_token,connected_at) VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET account_id=excluded.account_id,refresh_token=excluded.refresh_token,connected_at=excluded.connected_at').bind(identity.id,encrypted,new Date().toISOString()).run();
 return redirect(req);
}
async function graph(access,path,options={}){
 const response=await fetch(GRAPH+path,{...options,headers:{Authorization:'Bearer '+access,...options.headers}});
 if(!response.ok)throw Error('OneDrive request failed: HTTP '+response.status);
 return response.status===204?{}:response.json();
}
export async function uploadMicrosoftSnapshot(env,snapshot,filename){
 const conn=await env.DB.prepare('SELECT * FROM microsoft_backup_connection WHERE id=1').first();
 if(!conn)throw Error('Connect Microsoft OneDrive first');
 const grant=await token(env,{grant_type:'refresh_token',refresh_token:await unseal(env,conn.refresh_token),scope:SCOPES});
 if(grant.refresh_token&&grant.refresh_token!==await unseal(env,conn.refresh_token))
   await env.DB.prepare('UPDATE microsoft_backup_connection SET refresh_token=? WHERE id=1').bind(await seal(env,grant.refresh_token)).run();
 const folder='Superior Command Center Backups';
 // Resolve/create private app folder under the signed-in user's drive.
 const children=await graph(grant.access_token,'/me/drive/root/children?$select=id,name,folder&$top=200');
 let dir=children.value?.find(x=>x.name===folder&&x.folder);
 if(!dir)dir=await graph(grant.access_token,'/me/drive/root/children',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:folder,folder:{},'@microsoft.graph.conflictBehavior':'fail'})});
 const payload=JSON.stringify(snapshot,null,2);
 if(enc.encode(payload).byteLength>4*1024*1024)throw Error('OneDrive simple-upload limit exceeded; upload session required');
 const safe=filename.replace(/[^a-zA-Z0-9._-]/g,'_');
 const path='/me/drive/items/'+encodeURIComponent(dir.id)+':/'+encodeURIComponent(safe)+':/content';
 const result=await graph(grant.access_token,path,{method:'PUT',headers:{'Content-Type':'application/json'},body:payload});
 if(!result.id||!result.size)throw Error('OneDrive upload was not confirmed');
 return {id:result.id,name:result.name,size:result.size,webUrl:result.webUrl};
}
