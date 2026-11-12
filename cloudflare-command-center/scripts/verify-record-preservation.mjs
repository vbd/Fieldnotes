// Customer data is hashed in memory. Only digests are stored in the runner's temporary file.
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function fingerprintRows(records,reviews){
 return Object.fromEntries([...records.map(r=>[digest(['record',r.id]),digest([r.id,r.kind,r.status,r.created_at,r.review_token,r.data])]),...reviews.map(r=>[digest(['review',r.id]),digest([r.id,r.estimate_id,r.created_at,r.data])])]);
}
export function verifyExistingRecords(before,after){
 if(Object.entries(before).some(([id,hash])=>after[id]!==hash))throw Error('Existing business records changed during deployment. Investigate before claiming record preservation.');
 return Object.keys(before).length;
}
async function snapshot(env){
 const account=env.CLOUDFLARE_ACCOUNT_ID,credential=env.CLOUDFLARE_API_TOKEN;
 if(!/^[a-f0-9]{32}$/i.test(account||'')||!credential)throw Error('Record preservation inspection requires Cloudflare credentials.');
 async function rows(sql){
  let response,payload;
  try{
   response=await fetch('https://api.cloudflare.com/client/v4/accounts/'+account+'/d1/database/4feb6f63-1102-467a-87e6-256309364f12/query',{method:'POST',headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},body:JSON.stringify({sql}),signal:AbortSignal.timeout(30000)});
   payload=await response.json();
  }catch{throw Error('Read-only record inspection failed (network, timeout, or invalid response).');}
  if(!response.ok||payload?.success!==true||!Array.isArray(payload.result?.[0]?.results))throw Error('Read-only record inspection failed (HTTP '+response.status+').');
  return payload.result[0].results;
 }
 return fingerprintRows(await rows('SELECT id,kind,status,created_at,review_token,data FROM records'),await rows('SELECT id,estimate_id,created_at,data FROM customer_reviews'));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [mode,path]=process.argv.slice(2);
  if(!['snapshot','verify'].includes(mode)||!path)throw Error('Record inspection requires snapshot or verify and a temporary digest path.');
  const current=await snapshot(process.env);
  if(mode==='snapshot'){
   await writeFile(path,JSON.stringify(current),{mode:0o600});
   console.log('Saved read-only business record digests before deployment.');
  }else{
   const count=verifyExistingRecords(JSON.parse(await readFile(path,'utf8')),current);
   console.log('Verified '+count+' existing business records are unchanged after deployment.');
  }
 }catch(error){console.error(error.message);process.exitCode=1;}
}
