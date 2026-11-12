// Read-only diagnostics: never select tokens, account IDs, or customer data.
import {appendFile} from 'node:fs/promises';
const account=process.env.CLOUDFLARE_ACCOUNT_ID,credential=process.env.CLOUDFLARE_API_TOKEN;
if(!/^[a-f0-9]{32}$/i.test(account||'')||!credential)throw Error('Cloudflare diagnostic credentials are unavailable.');
async function api(path,body){
 const res=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+credential,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const payload=await res.json();
 if(!res.ok||!payload.success)throw Error('Read-only OneDrive inspection failed (HTTP '+res.status+').');
 return payload.result;
}
const settings=await api('/workers/scripts/superior-command-center/settings'),lines=[];
for(const name of ['MICROSOFT_CLIENT_ID','MICROSOFT_CLIENT_SECRET']){
 const binding=settings.bindings.find(b=>b.name===name);
 lines.push(name+': '+(!binding?'missing':binding.type==='secret_text'?'present as secret':binding.type==='plain_text'?'present as variable':'unexpected binding type')+'.');
}
const results=await api('/d1/database/4feb6f63-1102-467a-87e6-256309364f12/query',{
 sql:"SELECT last_backup_at, CASE WHEN json_valid(refresh_token) THEN CASE WHEN json_extract(refresh_token,'$.iv') IS NOT NULL AND json_extract(refresh_token,'$.data') IS NOT NULL THEN 1 ELSE 0 END ELSE 0 END AS encrypted FROM microsoft_backup_connection WHERE id=1"
});
const connection=results[0]?.results?.[0];
lines.push('Microsoft connection stored: '+(connection?'yes':'no')+'.');
if(connection){
 lines.push('Refresh token encrypted envelope present: '+(connection.encrypted===1?'yes':'no')+'.');
 const stamp=connection.last_backup_at;
 lines.push('Confirmed OneDrive upload recorded: '+(stamp&&Number.isFinite(Date.parse(stamp))?new Date(stamp).toISOString():'none')+'.');
}
lines.push('Real Microsoft consent and a confirmed upload are required before OneDrive is live-ready.');
for(const line of lines)console.log(line);
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,lines.join('\n\n')+'\n');
