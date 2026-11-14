// Browser checks use isolated API fixtures and never contact a live customer database.
const {chromium}=require('playwright');
const {readFile,mkdir}=require('node:fs/promises');
const {existsSync}=require('node:fs');
const {resolve,join}=require('node:path');
const assert=require('node:assert/strict');
const base=resolve(__dirname,'../public');
const results=resolve(__dirname,'../test-results');
const executablePath=process.env.CHROME_PATH||['/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync)||chromium.executablePath();
const token='a'.repeat(64);
const fixture={id:'EST-2026-TEST',customer:'Test Customer',email:'test@example.invalid',phone:'555-0100',address:'Test Address',project:'Test project',items:[{description:'Itemized test work',qty:2,rate:50,total:100}],subtotal:100,tax:0,taxRate:0,total:100,createdAt:'2026-01-01T10:00:00Z',status:'sent',notes:'Test terms'};
const estimates=[{...fixture,id:'EST-2026-APPROVED',status:'approved',invoiceId:'INV-2026-TEST',customerSignature:'Test Signer',customerNote:'Approved scope',decidedAt:'2026-01-02T10:00:00Z'}];
const invoices=[{...fixture,id:'INV-2026-TEST',estimateId:'EST-2026-APPROVED',paymentStatus:'unpaid'}];
const reviews=[{id:'REV-2026-TEST',estimateId:'EST-2026-APPROVED',customer:'Test Customer',rating:5,comment:'<img src=x onerror="window.__xss=1">',createdAt:'2026-01-03T10:00:00Z'}];
let customerEstimate={...fixture},feedback=null,legacy=false,restorePosts=0,ownerAuthenticated=true,paymentPaid=false,invoiceView=false;
(async()=>{
 if(!existsSync(join(base,'owner.html')))throw Error('Built public assets are missing. Run npm run build before npm run test:browser.');
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const context=await browser.newContext({viewport:{width:375,height:812}});
 await context.route('https://superior.test/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname;
  const json=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  if(path.startsWith('/api/')){
   if(path==='/api/login'){ownerAuthenticated=true;return json({authenticated:true});}
   if(!ownerAuthenticated&&['/api/estimates','/api/invoices','/api/reviews','/api/google/status','/api/microsoft/status'].includes(path))return json({error:'Owner sign-in required'},401);
   if(path==='/api/microsoft/status')return json({configured:true,connected:false});
   if(path==='/api/session')return json({authenticated:ownerAuthenticated,...(!legacy?{capabilities:{additiveRestore:true,customerFeedback:true}}:{})});
   if(path==='/api/estimates'&&request.method()==='GET')return json({estimates});
   if(path==='/api/estimates'&&request.method()==='POST'){
    const input=request.postDataJSON();const e={...input,id:'EST-2026-NEW',status:'draft',createdAt:fixture.createdAt};e.items=input.items.map(i=>({...i,total:Math.round(i.qty*Math.round(i.rate*100))/100}));e.subtotal=e.items.reduce((n,i)=>n+i.total,0);e.tax=0;e.total=e.subtotal;estimates.unshift(e);return json({estimate:e},201);
   }
   if(path==='/api/invoices'&&request.method()==='POST'){
    const input=request.postDataJSON();const invoice={...input,id:'INV-2026-STANDALONE',standalone:true,estimateId:null,paymentStatus:'unpaid',createdAt:fixture.createdAt};
    invoice.items=input.items.map(i=>({...i,total:Math.round(i.qty*i.rate*100)/100}));invoice.subtotal=invoice.items.reduce((n,i)=>n+i.total,0);invoice.tax=Math.round(invoice.subtotal*Number(input.taxRate))/100;invoice.total=invoice.subtotal+invoice.tax;invoices.push(invoice);return json({invoice},201);
   }
   if(path==='/api/invoices')return json({invoices});
   if(path==='/api/reviews')return legacy?json({error:'Not found'},404):json({reviews});
   if(path==='/api/invoices/INV-2026-TEST/mark-paid'){invoices[0].paymentStatus='paid';invoices[0].paidAt=fixture.createdAt;return json({invoice:invoices[0]});}
   if(path==='/api/review/'+token+'/payment/capture'){paymentPaid=true;return json({paid:true});}
   if(path==='/api/review/'+token+'/payment')return json({enabled:invoiceView,invoice:{id:'INV-2026-CUSTOMER',total:100,paymentStatus:paymentPaid?'paid':'unpaid'}});
   if(path==='/api/review/'+token)return json({estimate:invoiceView?{...customerEstimate,isInvoice:true,status:paymentPaid?'paid':'unpaid'}:customerEstimate,feedback,...(!legacy?{feedbackEnabled:!invoiceView}:{})});
   if(path==='/api/review/'+token+'/decision'){const d=request.postDataJSON();customerEstimate={...customerEstimate,status:d.decision,customerSignature:d.signature,customerNote:d.note,decidedAt:fixture.createdAt};return json({estimate:customerEstimate,invoiceId:'INV-2026-CUSTOMER'});}
   if(path==='/api/review/'+token+'/feedback'){feedback={...request.postDataJSON(),createdAt:fixture.createdAt};return json({feedback},201);}
   if(path==='/api/google/status')return json({configured:false,connected:false,notice:'Automatic backup not configured.'});
   if(path==='/api/restore'){restorePosts++;assert.equal(request.postDataJSON().confirm,'RESTORE');return json({ok:true,estimates:1,invoices:0,reviews:0,skipped:1});}
   return json({error:'Unexpected test route'},404);
  }
  let file=path==='/'?'index.html':path==='/owner'?'owner.html':path==='/owner/backup'?'backup.html':path==='/review/'+token?'review.html':path.slice(1);
  if(!['index.html','styles.css','script.js','owner.html','owner.css','owner.js','review.html','review.js','backup.html','backup.js','backup.css','invoice-mobile.css','review-mobile.css'].includes(file))return route.fulfill({status:404,body:'Not found'});
  const body=await readFile(join(base,file),'utf8');
  return route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript',body});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
 await page.goto('https://superior.test/');for(const width of [320,375,390]){await page.setViewportSize({width,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'public website fits '+width+'px');}await page.setViewportSize({width:375,height:812});
 await page.goto('https://superior.test/owner');await page.locator('#app-shell:not(.hidden)').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile dashboard fits viewport');
 await page.locator('.bottom-nav [data-view="invoices"]').click();await page.locator('#invoices-list .record').click();
 assert.match(await page.locator('#detail-content').innerText(),/test@example\.invalid/);assert.match(await page.locator('#detail-content').innerText(),/555-0100/);
 await page.getByRole('button',{name:'Mark paid',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#detail-content').textContent.includes('Payment recorded'));
 await page.locator('[data-close="detail-dialog"]').click();
 await page.locator('.new-invoice').click();await page.locator('#editor-title').filter({hasText:'New standalone invoice'}).waitFor();
 await page.locator('[name="customer"]').fill('Standalone Fixture');await page.locator('[name="email"]').fill('invoice@example.invalid');await page.locator('[name="phone"]').fill('555-0101');await page.locator('[name="address"]').fill('Fixture address');await page.locator('[name="notes"]').fill('Fixture invoice notes');
 await page.locator('.line-description').fill('Standalone work');await page.locator('.line-qty').fill('2');await page.locator('.line-rate').fill('125.50');await page.locator('#tax-rate').fill('7.75');
 assert.equal(await page.locator('#form-total').innerText(),'$270.45');assert.equal(await page.evaluate(()=>document.querySelector('#editor-dialog').scrollWidth<=innerWidth),true);
 await page.locator('#editor-form [type="submit"]').click();await page.locator('#detail-dialog[open]').waitFor();assert.match(await page.locator('#detail-content').innerText(),/Standalone Fixture/);assert.match(await page.locator('#detail-content').innerText(),/Fixture invoice notes/);
 assert.equal(invoices.filter(i=>i.standalone).length,1);await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});await page.getByRole('button',{name:'Print / Save PDF',exact:true}).click();assert.equal(await page.evaluate(()=>window.__printed),true);
 await page.locator('[data-close="detail-dialog"]').click();
 await page.locator('.bottom-nav [data-view="feedback"]').click();assert.match(await page.locator('#feedback-list').innerText(),/<img src=x/);assert.equal(await page.evaluate(()=>window.__xss),undefined);
 await page.locator('#mobile-add').click();await page.locator('[name="customer"]').fill('Fixture New');await page.locator('[name="email"]').fill('fixture@example.invalid');await page.locator('.line-description').fill('Long itemized work description for a narrow phone display');await page.locator('.line-qty').fill('1.25');await page.locator('.line-rate').fill('42.20');
 assert.equal(await page.locator('#form-total').innerText(),'$52.75');assert.equal(await page.evaluate(()=>document.querySelector('#editor-dialog').scrollWidth<=innerWidth),true,'mobile editor fits viewport');
 await page.locator('.remove-line').click();assert.equal(await page.locator('.line-item').count(),1,'last line remains');
 await page.locator('#editor-form [type="submit"]').click();await page.locator('#detail-dialog[open]').waitFor();assert.match(await page.locator('#detail-content').innerText(),/Fixture New/);assert.equal(estimates.filter(e=>e.id==='EST-2026-NEW').length,1);
 await page.locator('[data-close="detail-dialog"]').click();
 await mkdir(results,{recursive:true});await page.screenshot({path:join(results,'superior-owner-mobile.png'),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.locator('.sidebar [data-view="overview"]').click();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'desktop dashboard fits viewport');
 await page.setViewportSize({width:375,height:812});
 await page.goto('https://superior.test/review/'+token);await page.locator('#review-decision:not(.hidden)').waitFor();assert.equal(await page.locator('#feedback-section').isVisible(),false);
 await page.locator('#signature').fill('Test Signer');await page.locator('#decision-note').fill('Customer confirmation note');await page.locator('[data-decision="approved"]').click();await page.locator('#feedback-section:not(.hidden)').waitFor();
 assert.match(await page.locator('#payment-status').innerText(),/Contact Superior/);assert.equal(await page.locator('#pay-invoice').isVisible(),false);for(const width of [320,375,390]){await page.setViewportSize({width,height:812});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'customer page fits '+width+'px');}
 await page.locator('.rating-options label').nth(4).click();await page.locator('#feedback-comment').fill('<b>Helpful quote</b>');await page.locator('#feedback-form button').click();await page.locator('#feedback-saved:not(.hidden)').waitFor();assert.match(await page.locator('#feedback-saved').innerText(),/<b>Helpful quote<\/b>/);assert.equal(await page.locator('#feedback-saved b').count(),0);assert.equal(await page.locator('#feedback-form').isVisible(),false);
 invoiceView=true;await page.goto('https://superior.test/review/'+token);await page.locator('#pay-invoice:not(.hidden)').waitFor();assert.equal(await page.locator('#review-decision').isVisible(),false);assert.equal(await page.locator('#feedback-section').isVisible(),false);assert.match(await page.locator('.doc-type').innerText(),/INVOICE/);
 await page.goto('https://superior.test/review/'+token+'?paypal=return');await page.locator('#payment-status').filter({hasText:'Payment received'}).waitFor();assert.equal(await page.locator('#pay-invoice').isVisible(),false);assert.equal(paymentPaid,true);invoiceView=false;
 const backup={app:'Superior Maintenance and Remodeling - Command Center',version:1,estimates:[fixture,estimates[0]],invoices:[],reviews:[]};
 await page.goto('https://superior.test/owner/backup');await page.locator('#record-count').filter({hasText:'ready for backup'}).waitFor();await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await page.locator('#restore').click();await page.locator('#backup-status').filter({hasText:'Import complete'}).waitFor();assert.match(await page.locator('#backup-status').innerText(),/1 existing or conflicting records skipped/);assert.equal(restorePosts,1);
 legacy=true;await page.reload();await page.locator('#restore-help').filter({hasText:'unavailable'}).waitFor();await page.locator('#backup-file').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});assert.equal(await page.locator('#restore').isDisabled(),true,'legacy destructive restore cannot be invoked');assert.equal(restorePosts,1);
 await page.goto('https://superior.test/owner');await page.locator('#app-shell:not(.hidden)').waitFor();await page.locator('.bottom-nav [data-view="feedback"]').click();assert.match(await page.locator('#feedback-summary').innerText(),/unavailable/);
 await page.goto('https://superior.test/review/'+token);await page.locator('#review-content .detail-paper').waitFor();assert.equal(await page.locator('#feedback-section').isVisible(),false,'unsupported legacy feedback is hidden');
 legacy=false;ownerAuthenticated=false;
 await page.goto('https://superior.test/owner/backup?onedrive=credentials&microsoft_error=7000215');
 await page.waitForURL(url=>url.pathname==='/owner'&&url.searchParams.has('returnTo'));
 await page.locator('#password').fill('fixture-only-password');
 await page.locator('#login-form button').click();
 await page.waitForURL(url=>url.pathname==='/owner/backup');
 await page.locator('#backup-status').filter({hasText:'AADSTS7000215: Microsoft rejected the client secret'}).waitFor();
 await page.goto('https://superior.test/owner?returnTo=https%3A%2F%2Fexample.invalid%2Fowner%2Fbackup');
 await page.locator('#app-shell:not(.hidden)').waitFor();
 assert.equal(new URL(page.url()).origin,'https://superior.test','external login redirect is rejected');
 assert.deepEqual(errors,[],'no frontend runtime errors');console.log('PASS: mobile and desktop layout, itemized estimate save, invoice payment status, customer decision and feedback, escaped content, additive import and legacy safety.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
