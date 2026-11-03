'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const token=encodeURIComponent(location.pathname.split('/').pop());
let current=null;
function paper(e){return `<div class="detail-paper"><div class="paper-brand"><div><strong>SUPERIOR</strong><small>MAINTENANCE & REMODELING</small></div><div class="doc-type">ESTIMATE</div></div><div class="doc-meta"><div><b>Prepared for</b><span>${esc(e.customer)}</span><span>${esc(e.address)}</span><span>${esc(e.project)}</span></div><div><b>${esc(e.id)}</b><span>${new Date(e.createdAt).toLocaleDateString('en-US')}</span><span>909-352-3627</span></div></div><table class="paper-table"><thead><tr><th>DESCRIPTION</th><th>QTY</th><th>RATE</th><th>AMOUNT</th></tr></thead><tbody>${e.items.map(i=>`<tr><td>${esc(i.description)}</td><td>${esc(i.qty)}</td><td>${fmt(i.rate)}</td><td>${fmt(i.total)}</td></tr>`).join('')}</tbody></table><div class="paper-totals"><div><span>Subtotal</span><b>${fmt(e.subtotal)}</b></div><div><span>Tax</span><b>${fmt(e.tax)}</b></div><div class="final"><span>Total</span><b>${fmt(e.total)}</b></div></div>${e.notes?`<div class="paper-notes"><b>Notes and terms</b><p>${esc(e.notes)}</p></div>`:''}</div>`;}
async function request(path,options={}){
 const res=await fetch('/api/review/'+token+path,{cache:'no-store',...options});
 let data;try{data=await res.json();}catch{throw Error('The server could not complete the request. Please try again.');}
 if(!res.ok){const error=Error(data.error||'This review link is unavailable.');error.status=res.status;throw error;}
 return data;
}
function renderFeedback(feedback,estimate,enabled){
 const decided=['approved','declined'].includes(estimate.status);
 $('#feedback-section').classList.toggle('hidden',!decided||!enabled);
 $('#feedback-form').classList.toggle('hidden',Boolean(feedback));
 const saved=$('#feedback-saved');saved.classList.toggle('hidden',!feedback);
 if(feedback)saved.textContent=`Thank you for your feedback. Your rating: ${Number(feedback.rating)} out of 5 stars.${feedback.comment?'\n\n'+feedback.comment:''}`;
}
async function load(){
 try{
  const data=await request(''),e=data.estimate;current=e;
  const decisionDate=e.decidedAt?' on '+new Date(e.decidedAt).toLocaleDateString('en-US'):'';
  $('#review-content').innerHTML=`<p class="eyebrow">${esc(e.id)} · ${esc(e.status.toUpperCase())}</p>`+paper(e)+(e.status!=='sent'?`<p class="muted">This estimate was ${esc(e.status)}${decisionDate}. Your decision has been recorded.</p>`:'');
  $('#review-decision').classList.toggle('hidden',e.status!=='sent');renderFeedback(data.feedback,e,data.feedbackEnabled===true);
 }catch(err){current=null;$('#review-content').textContent=err.message;$('#review-decision').classList.add('hidden');$('#feedback-section').classList.add('hidden');}
}
$('#decision-form').addEventListener('click',event=>{const button=event.target.closest('[data-decision]');if(button)$('#decision-form').dataset.decision=button.dataset.decision;});
$('#decision-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget,decision=event.submitter?.dataset.decision||form.dataset.decision,error=$('#decision-error');error.textContent='';
 if(form.getAttribute('aria-busy')==='true'||!current||current.status!=='sent'||!['approved','declined'].includes(decision))return;
 const name=$('#signature').value.trim();if(!name){error.textContent='Please enter your full name.';return;}
 if(!window.confirm(`Confirm you want to ${decision==='approved'?'approve':'decline'} estimate ${current.id}?`))return;
 decisionButtons(true);
 try{await request('/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,signature:name,note:$('#decision-note').value})});await load();}
 catch(err){if(err.status===409)await load();else error.textContent=err.message;}
 finally{decisionButtons(false);}
});
function decisionButtons(disabled){$('#decision-form').setAttribute('aria-busy',String(disabled));document.querySelectorAll('.decision-buttons button').forEach(button=>button.disabled=disabled);}
$('#feedback-form').addEventListener('submit',async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button'),error=$('#feedback-error');if(button.disabled)return;error.textContent='';
 const rating=Number(new FormData(form).get('rating'));if(!Number.isInteger(rating)||rating<1||rating>5){error.textContent='Choose a rating from 1 to 5 stars.';return;}
 button.disabled=true;form.setAttribute('aria-busy','true');
 try{await request('/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating,comment:$('#feedback-comment').value.trim()})});await load();}
 catch(err){if(err.status===409)await load();else error.textContent=err.message;}
 finally{button.disabled=false;form.setAttribute('aria-busy','false');}
});
load();
