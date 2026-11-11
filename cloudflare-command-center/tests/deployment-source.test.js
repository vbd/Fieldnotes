import test from 'node:test';
import assert from 'node:assert/strict';
import {assertSingleDeploymentSource,inspectDeploymentSource} from '../scripts/inspect-deployment-source.mjs';

test('duplicate build deployments are blocked without echoing configuration or credentials',()=>{
 assert.match(assertSingleDeploymentSource({auto_build_enabled:false}),/disabled/);
 for(const config of [{auto_build_enabled:true}, {},null])assert.throws(()=>assertSingleDeploymentSource(config),/must be disabled/);
});

test('build-source inspection sanitizes errors and handles disconnected repositories',async()=>{
 const env={CLOUDFLARE_ACCOUNT_ID:'a'.repeat(32),CLOUDFLARE_API_TOKEN:'PRIVATE-SENTINEL'},lines=[];
 await inspectDeploymentSource({env,fetchImpl:async()=>new Response('',{status:404}),write:x=>lines.push(x)});
 assert.match(lines.join(''),/No Cloudflare build connection/);
 for(const fetchImpl of [async()=>{throw Error(env.CLOUDFLARE_API_TOKEN);},async()=>Response.json({success:false,error:env.CLOUDFLARE_API_TOKEN},{status:403})]){
  await assert.rejects(inspectDeploymentSource({env,fetchImpl}),error=>!error.message.includes(env.CLOUDFLARE_API_TOKEN));
 }
});
