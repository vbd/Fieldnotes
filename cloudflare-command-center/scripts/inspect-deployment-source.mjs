import {pathToFileURL} from 'node:url';

export function assertSingleDeploymentSource(config){
 if(config?.auto_build_enabled!==false)throw Error('Cloudflare Workers Builds auto-deployment must be disabled. Use the verified GitHub Actions workflow to prevent competing deployments from replacing Worker bindings.');
 return 'Cloudflare duplicate auto-build is disabled; GitHub Actions manages production.';
}

export async function inspectDeploymentSource({env=process.env,fetchImpl=fetch,write=console.log}={}){
 const account=env.CLOUDFLARE_ACCOUNT_ID,token=env.CLOUDFLARE_API_TOKEN;
 if(!/^[a-f0-9]{32}$/i.test(account||'')||!token)throw Error('Deployment-source inspection requires Cloudflare credentials.');
 let response,payload;
 try{
  response=await fetchImpl('https://api.cloudflare.com/client/v4/accounts/'+account+'/builds/workers/30076dfd961942a38aaddc29dc3876e1',{headers:{Authorization:'Bearer '+token},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(response.status===404){write('No Cloudflare build connection exists; GitHub Actions manages production.');return;}
  payload=await response.json();
 }catch{throw Error('Deployment-source inspection failed (network, timeout, or invalid response).');}
 if(!response.ok||payload?.success!==true)throw Error('Deployment-source inspection failed (HTTP '+response.status+').');
 write(assertSingleDeploymentSource(payload.result));
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{await inspectDeploymentSource();}catch(error){console.error(error.message);process.exitCode=1;}
}
