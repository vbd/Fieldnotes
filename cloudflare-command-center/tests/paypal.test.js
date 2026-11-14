import {test} from 'node:test';
import assert from 'node:assert/strict';
import {InvoicePayments,paymentConfigured} from '../src/paypal.js';
const env={PAYPAL_MODE:'sandbox',PAYPAL_CLIENT_ID:'test-id',PAYPAL_CLIENT_SECRET:'test-secret',PAYPAL_MERCHANT_ID:'TESTMERCHANT1'};
const invoice={id:'INV-TEST',total:125.50,paypalOrderId:'ORDER123456789'};
const order=()=>({id:invoice.paypalOrderId,status:'COMPLETED',purchase_units:[{custom_id:invoice.id,invoice_id:invoice.id,payee:{merchant_id:env.PAYPAL_MERCHANT_ID},payments:{captures:[{id:'CAPTURE1234',status:'COMPLETED',final_capture:true,amount:{currency_code:'USD',value:'125.50'}}]}}]});
const fetcher=result=>async url=>Response.json(url.endsWith('/token')?{access_token:'test-token'}:result);
test('PayPal requires explicit environment and merchant configuration',()=>{
 assert.equal(paymentConfigured({}),false);assert.equal(paymentConfigured({...env,PAYPAL_MODE:'automatic'}),false);
 assert.throws(()=>new InvoicePayments({}),/not configured/);
});
test('capture validates amount, currency, invoice, merchant, final status and order identity',async()=>{
 assert.equal((await new InvoicePayments(env,fetcher(order())).capture(invoice)).captureId,'CAPTURE1234');
 for(const change of [o=>o.id='OTHERORDER',o=>o.status='APPROVED',o=>o.purchase_units[0].custom_id='OTHER',o=>o.purchase_units[0].invoice_id='OTHER',o=>o.purchase_units[0].payee.merchant_id='OTHER',o=>o.purchase_units[0].payments.captures[0].amount.value='1.00',o=>o.purchase_units[0].payments.captures[0].amount.currency_code='EUR',o=>o.purchase_units[0].payments.captures[0].status='PENDING',o=>o.purchase_units[0].payments.captures[0].final_capture=false]){
  const response=order();change(response);
  await assert.rejects(()=>new InvoicePayments(env,fetcher(response)).capture(invoice),/not confirmed/);
 }
});
test('create fixes amount and merchant server-side and uses stable idempotency keys',async()=>{
 const calls=[];const paypal=new InvoicePayments(env,async(url,options)=>{
  if(url.endsWith('/token'))return Response.json({access_token:'test'});
  calls.push(options);return Response.json({id:invoice.paypalOrderId,links:[{rel:'payer-action',href:'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123456789'}]});
 });
 await paypal.create(invoice,'https://superior.test/review/token');await paypal.create(invoice,'https://superior.test/review/token');
 assert.equal(calls[0].headers['PayPal-Request-Id'],calls[1].headers['PayPal-Request-Id']);
 assert.notEqual(await paypal.requestId(invoice,'capture'),await paypal.requestId(invoice,'create'));
 const body=JSON.parse(calls[0].body);assert.deepEqual(body.purchase_units[0].amount,{currency_code:'USD',value:'125.50'});assert.equal(body.purchase_units[0].payee.merchant_id,env.PAYPAL_MERCHANT_ID);
 await assert.rejects(()=>new InvoicePayments(env,fetcher({id:invoice.paypalOrderId,links:[{rel:'approve',href:'https://evil.invalid'}]})).create(invoice,'https://superior.test/review/token'),/unavailable/);
});
test('ambiguous capture responses reconcile the existing order without a second payment',async()=>{
 let reads=0,captures=0;
 const paypal=new InvoicePayments(env,async(url)=>{
  if(url.endsWith('/token'))return Response.json({access_token:'test'});
  if(url.endsWith('/capture')){captures++;throw Error('private-provider-payload');}
  const response=order();if(reads++===0)response.status='APPROVED';return Response.json(response);
 });
 assert.equal((await paypal.capture(invoice)).captureId,'CAPTURE1234');assert.equal(captures,1);
 await paypal.capture(invoice);assert.equal(captures,1);
 await assert.rejects(()=>new InvoicePayments(env,async()=>{throw Error('private-secret');}).capture(invoice),error=>!error.message.includes('private-secret'));
});
