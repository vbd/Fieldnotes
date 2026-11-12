'use strict';
const $=(s,root=document)=>root.querySelector(s);
const $$=(s,root=document)=>[...root.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const day=s=>s?new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
const state={estimates:[],invoices:[],reviews:[],feedbackAvailable:true,filter:'all',editing:null,editorKind:'estimate',detail:null,detailKind:'estimate'};
async function api(url,opts={}){
 const res=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts,headers:{'Content-Type':'application/json',...opts.headers}});
 let content;try{content=await res.json();}catch{throw Error('The server could not complete the request. Please try again.');}
 if(res.status===401&&url!=='/api/login'){loginView(false);$('#login-error').textContent='Your session expired. Sign in again.';throw Error('Your session expired. Sign in again.');}
 if(!res.ok){const error=Error(content.error||'Request failed.');error.status=res.status;throw error;}return content;
}
const submit=(url,value,method='POST')=>api(url,{method,body:JSON.stringify(value)});
function toast(message){const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),3800);}
function loginView(isLoggedIn){
 $('#login-screen').classList.toggle('hidden',isLoggedIn);$('#app-shell').classList.toggle('hidden',!isLoggedIn);
 if(!isLoggedIn){state.estimates=[];state.invoices=[];state.reviews=[];$('#detail-dialog').close();$('#editor-dialog').close();}
}
async function load(){const [e,i,r]=await Promise.all([api('/api/estimates'),api('/api/invoices'),api('/api/reviews').catch(error=>{if(error.status===404)return {reviews:[],available:false};throw error;})]);state.estimates=e.estimates;state.invoices=i.invoices;state.reviews=r.reviews;state.feedbackAvailable=r.available!==false;render();}
function resumeBackup(){
 const next=new URLSearchParams(location.search).get('returnTo');
 if(!next)return false;
 try{
  const target=new URL(next,location.origin);
  if(target.origin!==location.origin||target.pathname!=='/owner/backup')return false;
  const params=new URLSearchParams();
  const allowed={drive:['connected','backup-error','denied','error'],onedrive:['connected','state','denied','credentials','offline','account','callback']};
  for(const [name,values] of Object.entries(allowed))if(values.includes(target.searchParams.get(name)))params.set(name,target.searchParams.get(name));
  const code=target.searchParams.get('microsoft_error');
  if(/^[0-9]{1,8}$/.test(code||''))params.set('microsoft_error',code);
  location.replace('/owner/backup'+(params.size?'?'+params.toString():''));return true;
 }catch{return false;}
}
async function boot(){try{const result=await api('/api/session');if(result.authenticated&&resumeBackup())return;if(result.authenticated)await load();loginView(result.authenticated);}catch(e){loginView(false);$('#login-error').textContent=e.message;}}
$('#login-form').addEventListener('submit',async ev=>{
 ev.preventDefault();const error=$('#login-error'),button=ev.currentTarget.querySelector('button');if(button.disabled)return;error.textContent='';button.disabled=true;
 try{await submit('/api/login',{password:$('#password').value});$('#password').value='';if(resumeBackup())return;await load();loginView(true);}catch(e){loginView(false);error.textContent=e.message;}finally{button.disabled=false;}
});
$('#logout').addEventListener('click',async()=>{const button=$('#logout');if(button.disabled)return;button.disabled=true;try{await submit('/api/logout',{});loginView(false);}catch(error){toast(error.message);}finally{button.disabled=false;}});
function setView(view){$$('.view').forEach(el=>el.classList.toggle('active',el.id==='view-'+view));$$('[data-view]').forEach(el=>el.classList.toggle('selected',el.dataset.view===view));$('#top-title').textContent={overview:'Command Center',estimates:'Estimates',invoices:'Invoices',feedback:'Customer feedback'}[view];window.scrollTo({top:0,behavior:'instant'});}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$$('.new-estimate').forEach(b=>b.addEventListener('click',()=>openEditor()));$('#mobile-add').addEventListener('click',()=>openEditor());
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
$$('.filter').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;$$('.filter').forEach(x=>x.classList.toggle('selected',x===b));renderEstimates();}));
function status(e){return `<span class="status ${esc(e.status)}">${({draft:'Draft',sent:'Awaiting approval',approved:'Approved',declined:'Declined',paid:'Paid',unpaid:'Unpaid'})[e.status]||esc(e.status)}</span>`;}
function row(e,kind){const isInvoice=kind==='invoice';return `<article class="record" role="button" tabindex="0" data-kind="${kind}" data-id="${esc(e.id)}" aria-label="Open ${isInvoice?'invoice':'estimate'} ${esc(e.id)}"><div class="record-main"><span class="record-icon">${isInvoice?'▣':'▤'}</span><div><div class="record-name">${esc(e.customer)}</div><div class="record-meta">${esc(e.id)} · ${esc(e.project||'Project estimate')} · ${day(e.createdAt)}</div></div></div><div class="record-right"><strong class="record-amount">${fmt(e.total)}</strong>${status({...e,status:isInvoice?e.paymentStatus:e.status})}</div></article>`;}
function attachRecords(container){$$('.record',container).forEach(r=>{const open=()=>openDetail(r.dataset.kind,r.dataset.id);r.addEventListener('click',open);r.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();open();}});});}
function empty(title,body,action=false){return `<div class="empty"><div class="empty-symbol">◇</div><h3>${title}</h3><p>${body}</p>${action?'<button class="primary new-inline">＋ Create an estimate</button>':''}</div>`;}
function render(){const est=state.estimates;$('#stat-estimates').textContent=est.length;$('#stat-pending').textContent=est.filter(x=>x.status==='sent').length;$('#stat-approved').textContent=fmt(est.filter(x=>x.status==='approved').reduce((a,x)=>a+Number(x.total),0));$('#stat-outstanding').textContent=fmt(state.invoices.filter(x=>x.paymentStatus==='unpaid').reduce((a,x)=>a+Number(x.total),0));const recent=$('#recent-estimates');recent.innerHTML=est.length?est.slice(0,5).map(e=>row(e,'estimate')).join(''):empty('No estimates yet','Create your first itemized proposal to get started.',true);attachRecords(recent);recent.querySelector('.new-inline')?.addEventListener('click',()=>openEditor());renderEstimates();renderInvoices();renderFeedback();}
function renderEstimates(){const el=$('#estimates-list');const records=state.estimates.filter(e=>state.filter==='all'||e.status===state.filter);el.innerHTML=records.length?records.map(e=>row(e,'estimate')).join(''):empty('No estimates here','Your saved estimates will appear here.',state.filter==='all');attachRecords(el);el.querySelector('.new-inline')?.addEventListener('click',()=>openEditor());}
function renderInvoices(){const el=$('#invoices-list');el.innerHTML=state.invoices.length?state.invoices.map(e=>row(e,'invoice')).join(''):empty('No invoices yet','Create a standalone invoice or approve an estimate to generate one automatically.');attachRecords(el);}
function renderFeedback(){
 const reviews=state.reviews,el=$('#feedback-list');
 $('#feedback-summary').textContent=!state.feedbackAvailable?'Customer feedback is unavailable on this deployment.':reviews.length?`${reviews.length} response${reviews.length===1?'':'s'} · Average ${(reviews.reduce((sum,r)=>sum+Number(r.rating),0)/reviews.length).toFixed(1)} out of 5 stars`:'Ratings and comments from customer review links.';
 el.innerHTML=reviews.length?reviews.map(r=>`<article class="feedback-entry"><div class="feedback-heading"><div><h3>${esc(r.customer)}</h3><small>${esc(r.estimateId)}</small></div><div class="feedback-rating" aria-label="${Number(r.rating)} out of 5 stars">${'★'.repeat(Math.min(5,Math.max(0,Number(r.rating))))}${'☆'.repeat(Math.max(0,5-Number(r.rating)))}</div></div><p>${esc(r.comment||'No comment provided.')}</p><time datetime="${esc(r.createdAt)}">${day(r.createdAt)}</time>${state.estimates.some(e=>e.id===r.estimateId)?` <button type="button" class="text-button" data-estimate-id="${esc(r.estimateId)}">View estimate ↗</button>`:''}</article>`).join(''):empty('No customer feedback yet',state.feedbackAvailable?'Customers can leave a rating and comments after responding to their estimate.':'Customer feedback is unavailable on this deployment.');
 $$('[data-estimate-id]',el).forEach(button=>button.addEventListener('click',()=>openDetail('estimate',button.dataset.estimateId)));
}
let lineCounter=0;
function lineRow(item={description:'',qty:1,rate:0}){const id=++lineCounter;const wrap=document.createElement('div');wrap.className='line-item';wrap.innerHTML=`<label>DESCRIPTION<input aria-label="Line item description" class="line-description" required maxlength="240" value="${esc(item.description)}" placeholder="e.g. Drywall repair"></label><label>QTY<input aria-label="Quantity" class="line-qty" type="number" min="0.01" max="100000" step="0.01" required value="${esc(item.qty)}"></label><label>UNIT PRICE<input aria-label="Unit price in dollars" class="line-rate" type="number" min="0" max="1000000" step="0.01" required value="${esc(item.rate)}"></label><button class="remove-line" type="button" aria-label="Remove line item ${id}">×</button>`;wrap.querySelector('.remove-line').addEventListener('click',()=>{if($$('.line-item').length===1){toast('An estimate needs at least one line item.');return;}wrap.remove();recalc();});$$('input',wrap).forEach(input=>input.addEventListener('input',recalc));$('#line-items').append(wrap);recalc();}
function readLines(){return $$('.line-item').map(row=>({description:$('.line-description',row).value,qty:Number($('.line-qty',row).value),rate:Number($('.line-rate',row).value)}));}
function recalc(){const subtotalCents=readLines().reduce((a,l)=>a+Math.round(l.qty*Math.round(l.rate*100)),0);const taxCents=Math.round(subtotalCents*Number($('#tax-rate').value||0)/100);$('#form-subtotal').textContent=fmt(subtotalCents/100);$('#form-tax').textContent=fmt(taxCents/100);$('#form-total').textContent=fmt((subtotalCents+taxCents)/100);}
$('#add-line').addEventListener('click',()=>lineRow());$('#tax-rate').addEventListener('input',recalc);
function openEditor(id=null){state.editorKind='estimate';const e=id?state.estimates.find(r=>r.id===id):null;if(e&&e.status!=='draft')return toast('Only drafts can be edited.');state.editing=e?.id||null;$('#editor-form').querySelector('[type="submit"]').textContent='Save estimate ↗';$('#editor-title').textContent=e?'Edit draft estimate':'New estimate';const form=$('#editor-form');form.reset();$$('[name]',form).forEach(field=>{if(e&&Object.hasOwn(e,field.name)&&field.name!=='taxRate')field.value=e[field.name]||'';});$('#tax-rate').value=e?.taxRate??0;$('#line-items').innerHTML='';(e?.items?.length?e.items:[{description:'',qty:1,rate:0}]).forEach(lineRow);$('#editor-error').textContent='';$('#editor-dialog').showModal();}
$$('.new-invoice').forEach(b=>b.addEventListener('click',()=>{openEditor();state.editorKind='invoice';$('#editor-title').textContent='New standalone invoice';$('#editor-form').querySelector('[type="submit"]').textContent='Save invoice ↗';}));
$('#editor-form').addEventListener('submit',async ev=>{
 ev.preventDefault();const form=ev.currentTarget,button=form.querySelector('[type="submit"]');if(button.disabled)return;
 const payload={customer:form.elements.customer.value,email:form.elements.email.value,phone:form.elements.phone.value,address:form.elements.address.value,project:form.elements.project.value,notes:form.elements.notes.value,taxRate:form.elements.taxRate.value,items:readLines()};
 const error=$('#editor-error'),wasEditing=Boolean(state.editing);error.textContent='';button.disabled=true;
 try{const isInvoice=state.editorKind==='invoice';const endpoint=isInvoice?'/api/invoices':state.editing?'/api/estimates/'+state.editing:'/api/estimates';const data=await submit(endpoint,payload,!isInvoice&&state.editing?'PATCH':'POST');await load();$('#editor-dialog').close();toast(isInvoice?'Standalone invoice saved.':wasEditing?'Draft updated.':'Estimate saved as a draft.');if(isInvoice)setView('invoices');openDetail(isInvoice?'invoice':'estimate',(isInvoice?data.invoice:data.estimate).id);}catch(e){error.textContent=e.message;}finally{button.disabled=false;}
});
function paper(e,isInvoice=false){return `<div class="detail-paper"><div class="paper-brand"><div><strong>SUPERIOR</strong><small>MAINTENANCE & REMODELING</small></div><div class="doc-type">${isInvoice?'INVOICE':'ESTIMATE'}</div></div><div class="doc-meta"><div><b>Prepared for</b><span>${esc(e.customer)}</span>${e.address?`<span>${esc(e.address)}</span>`:''}${e.project?`<span>${esc(e.project)}</span>`:''}${e.email?`<span>${esc(e.email)}</span>`:''}${e.phone?`<span>${esc(e.phone)}</span>`:''}</div><div><b>${esc(e.id)}</b><span>${day(e.createdAt)}</span><span>Superior Maintenance and Remodeling</span><span>909-352-3627</span></div></div><table class="paper-table"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>RATE</th><th>AMOUNT</th></tr></thead><tbody>${e.items.map(item=>`<tr><td>${esc(item.description)}</td><td>${esc(item.qty)}</td><td>${fmt(item.rate)}</td><td>${fmt(item.total)}</td></tr>`).join('')}</tbody></table><div class="paper-totals"><div><span>Subtotal</span><b>${fmt(e.subtotal)}</b></div><div><span>Tax (${esc(e.taxRate??(e.subtotal?(e.tax/e.subtotal*100).toFixed(2):'0'))}%)</span><b>${fmt(e.tax)}</b></div><div class="final"><span>TOTAL</span><b>${fmt(e.total)}</b></div></div>${e.notes?`<div class="paper-notes"><b>Notes & terms</b><p>${esc(e.notes)}</p></div>`:''}</div>`;}
function action(label,style,fn){const b=document.createElement('button');b.className=style;b.type='button';b.textContent=label;b.addEventListener('click',async()=>{if(b.disabled)return;b.disabled=true;try{await fn();}catch(err){toast(err.message);}finally{b.disabled=false;}});return b;}
function openDetail(kind,id){
 const e=(kind==='invoice'?state.invoices:state.estimates).find(x=>x.id===id);if(!e)return;state.detail=id;state.detailKind=kind;const isInv=kind==='invoice';
 $('#detail-heading').textContent=(isInv?'Invoice ':'Estimate ')+id;
 const decision=!isInv&&e.decidedAt?`<section class="decision-summary"><b>Customer ${e.status==='approved'?'approval':'decision'} · ${day(e.decidedAt)}</b>${e.customerSignature?`<p>Confirmed by ${esc(e.customerSignature)}</p>`:''}${e.customerNote?`<p class="customer-note">${esc(e.customerNote)}</p>`:''}</section>`:'';
 const payment=isInv&&e.paidAt?`<p class="muted">Payment recorded ${day(e.paidAt)}.</p>`:'';
 $('#detail-content').innerHTML=`<div class="detail-meta"><div>Customer: <b>${esc(e.customer)}</b></div>${status({...e,status:isInv?e.paymentStatus:e.status})}</div>`+decision+payment+paper(e,isInv);
 const box=$('#detail-actions');box.innerHTML='';box.append(action('Print / Save PDF','ghost',()=>window.print()));
 if(!isInv){
  if(e.status==='draft')box.append(action('Edit draft','ghost',()=>{$('#detail-dialog').close();openEditor(e.id);}));
  if(e.status==='draft'||e.status==='sent')box.append(action(e.status==='sent'?'Get approval link':'Prepare approval link','primary',()=>shareLink(e.id,e.email)));
  if(e.status==='approved'&&e.invoiceId)box.append(action('View invoice ↗','primary',()=>{$('#detail-dialog').close();setView('invoices');openDetail('invoice',e.invoiceId);}));
 }else if(e.paymentStatus==='unpaid'){
  box.append(action('Mark paid','primary',async()=>{if(!window.confirm('Mark this invoice as paid? Only do this after confirming payment received.'))return;await submit('/api/invoices/'+e.id+'/mark-paid',{});await load();openDetail('invoice',e.id);toast('Invoice marked paid.');}));
 }
 if(!$('#detail-dialog').open)$('#detail-dialog').showModal();
}
async function shareLink(id,email){try{const data=await submit('/api/estimates/'+id+'/share',{});await load();openDetail('estimate',id);const url=data.url;const info=document.createElement('div');info.className='link-share-info';info.innerHTML='<p class="eyebrow">CUSTOMER APPROVAL LINK</p><label>Copy this link or open an email draft<input id="share-url" type="text" readonly></label><p class="muted">This creates a review link; it does not send an email by itself.</p>';$('#detail-content').prepend(info);$('#share-url').value=url;const box=$('#detail-actions');box.innerHTML='';box.append(action('Print / Save PDF','ghost',()=>window.print()));box.append(action('Copy link','ghost',async()=>{try{await navigator.clipboard.writeText(url);toast('Approval link copied.');}catch{$('#share-url').focus();$('#share-url').select();toast('Select and copy the link.');}}));box.append(action('Email customer ↗','primary',()=>{const subject=encodeURIComponent('Your Superior Maintenance and Remodeling estimate');const body=encodeURIComponent(`Hello,\n\nPlease review your Superior Maintenance and Remodeling itemized estimate. You can approve or decline it at this link:\n${url}\n\nThank you,\nSuperior Maintenance and Remodeling`);window.location.href=`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;}));toast('Customer approval link ready.');}catch(e){toast(e.message);}}
boot();
