'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'superior-website-'));
process.env.DATA_DIR=dir;process.env.OWNER_PASSWORD='test-only-super-secret';
const {server}=require('../server');
function start(){return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));}
function stop(){return new Promise(resolve=>server.close(resolve));}
test('owner creates quote, customer approves, invoice is generated and can be paid',async()=>{
 const base=await start();let cookie='';
 async function call(route,{method='GET',body,auth=false}={}){const res=await fetch(base+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),headers:res.headers};}
 try{
 let result=await call('/api/estimates');assert.equal(result.status,401);
 result=await call('/api/login',{method:'POST',body:{password:'bad'}});assert.equal(result.status,401);
 result=await call('/api/login',{method:'POST',body:{password:process.env.OWNER_PASSWORD}});assert.equal(result.status,200);cookie=result.headers.get('set-cookie').split(';')[0];
 const input={customer:'Customer Test',email:'customer@example.com',phone:'555-222-4444',project:'Kitchen remodel',items:[{description:'Prep and paint',qty:2,rate:125.5},{description:'Cabinet install',qty:1,rate:900}],taxRate:7.75,notes:'Materials separate'};
 result=await call('/api/estimates',{method:'POST',body:input,auth:true});assert.equal(result.status,201);const estimate=result.data.estimate;assert.equal(estimate.subtotal,1151);assert.equal(estimate.tax,89.2);assert.equal(estimate.total,1240.2);assert.equal(estimate.status,'draft');
 result=await call('/api/estimates/'+estimate.id+'/share',{method:'POST',body:{},auth:true});assert.equal(result.status,200);const reviewToken=result.data.url.split('/').pop();assert.match(reviewToken,/^[a-f0-9]{64}$/);
 result=await call('/api/review/'+reviewToken);assert.equal(result.status,200);assert.equal(result.data.estimate.email,undefined);assert.equal(result.data.estimate.status,'sent');
 result=await call('/api/review/'+reviewToken+'/decision',{method:'POST',body:{decision:'approved'}});assert.equal(result.status,400); // missing signature should not change status
 result=await call('/api/review/'+reviewToken);assert.equal(result.data.estimate.status,'sent');
 result=await call('/api/review/'+reviewToken+'/decision',{method:'POST',body:{decision:'approved',signature:'Customer Test',note:'Approved'}});assert.equal(result.status,200);assert.ok(result.data.invoiceId);
 result=await call('/api/review/'+reviewToken+'/decision',{method:'POST',body:{decision:'declined',signature:'Customer Test'}});assert.equal(result.status,409);
 result=await call('/api/invoices',{auth:true});assert.equal(result.status,200);assert.equal(result.data.invoices.length,1);assert.equal(result.data.invoices[0].total,1240.2);
 result=await call('/api/invoices/'+result.data.invoices[0].id+'/mark-paid',{method:'POST',body:{},auth:true});assert.equal(result.status,200);assert.equal(result.data.invoice.paymentStatus,'paid');
 assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'records.json'),'utf8')).invoices.length,1);
 } finally {await stop();fs.rmSync(dir,{recursive:true,force:true});}
});