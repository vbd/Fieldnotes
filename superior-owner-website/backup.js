'use strict';
const $=id=>document.getElementById(id);
const status=(txt,isError=false)=>{const el=$('backup-status');el.textContent=txt;el.style.color=isError?'#e3a09c':'#8ccaab';};
let restoreSupported=false,restoring=false;
async function req(url,opts={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts});if(r.status===401){location.assign('/owner');throw Error('Please sign in to the owner Command Center.');}if(!r.ok){let msg='Request failed';try{msg=(await r.json()).error||msg;}catch{}const error=Error(msg);error.status=r.status;throw error;}return r;}
async function refreshCounts(){
 const [e,i]=await Promise.all([req('/api/estimates').then(r=>r.json()),req('/api/invoices').then(r=>r.json())]);
 let feedback='';try{const r=await(await req('/api/reviews')).json();feedback=` • ${r.reviews.length} customer responses`;}catch(error){if(error.status!==404)throw error;}
 $('record-count').textContent=`${e.estimates.length} estimates • ${i.invoices.length} invoices${feedback} ready for backup`;
}
(async()=>{try{
 const session=await(await req('/api/session')).json();restoreSupported=session.capabilities?.additiveRestore===true;
 if(!restoreSupported)$('restore-help').textContent='Import is unavailable on this deployment because it cannot preserve existing records. Downloaded backups remain available.';
 $('restore').disabled=!restoreSupported||!$('backup-file').files.length;
 await refreshCounts();
}catch(error){status(error.message,true);}})();
$('download').addEventListener('click',async()=>{
 const button=$('download');if(button.disabled)return;button.disabled=true;
 try{status('Preparing your file…');const response=await req('/api/backup');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Superior_Command_Center_Backup_${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status('Backup downloaded. Save the file in a private Google Drive folder or another safe location.');}
 catch(error){status(error.message,true);}finally{button.disabled=false;}
});
$('backup-file').addEventListener('change',()=>{$('selected').textContent=$('backup-file').files[0]?.name||'No file selected';$('restore').disabled=restoring||!restoreSupported||!$('backup-file').files.length;});
$('restore').addEventListener('click',async()=>{
 if(restoring||!restoreSupported)return;restoring=true;$('restore').disabled=true;
 try{
  const file=$('backup-file').files[0];if(!file)return;if(file.size>8*1024*1024)throw Error('Backup file is too large (8 MB maximum).');
  const raw=JSON.parse(await file.text());if(raw.app!=='Superior Maintenance and Remodeling - Command Center'||raw.version!==1||!Array.isArray(raw.estimates)||!Array.isArray(raw.invoices)||(raw.reviews!==undefined&&!Array.isArray(raw.reviews)))throw Error('Please select a valid Superior Command Center backup.');
  const count=`${raw.estimates.length} estimates, ${raw.invoices.length} invoices and ${raw.reviews?.length||0} customer responses`;
  if(!confirm(`Import ${count}? Existing records will be kept, and duplicate IDs will be skipped.`)){status('Import canceled.');return;}
  status('Importing missing records…');const result=await(await req('/api/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...raw,confirm:'RESTORE'})})).json();
  status(`Import complete: ${result.estimates} estimates, ${result.invoices} invoices and ${result.reviews||0} customer responses added. ${result.skipped||0} existing or conflicting records skipped.`);
  await refreshCounts();
 }catch(error){status(error.message,true);}finally{restoring=false;$('restore').disabled=!restoreSupported||!$('backup-file').files.length;}
});
const driveStatus=$('drive-connection-status'),driveDetails=$('drive-details');
let emailBackups=false,backupBusy=false;
async function checkDrive(){
 try{
  const s=await(await req('/api/google/status')).json();emailBackups=Boolean(s.email);$('drive-connect').disabled=backupBusy||!s.configured;$('drive-backup-now').disabled=backupBusy||!s.connected;
  $('drive-connect').textContent=emailBackups?'Connect Drive & email':'Connect Google Drive';
  driveStatus.textContent=!s.configured?(s.notice||'Google backup connection needs setup.'):s.connected?(emailBackups?'Google connected for Drive and email backups.':'Google Drive connected.'):'Connect your Google account to enable backups.';
  const details=[];
  if(emailBackups)details.push('Backups run after a new estimate is saved and when an invoice is created or paid. Copies go to your private Drive folder and '+s.email+'.');
  if(s.pendingCount)details.push(s.pendingCount+' backup'+(s.pendingCount===1?' is':'s are')+' waiting to finish.');
  if(s.latestRun&&s.latestRun.status!=='complete'){
   const drive={saved:'saved',failed:'failed',unknown:'unconfirmed',uploading:'in progress',pending:'waiting'}[s.latestRun.driveState]||'waiting';
   const email={sent:'sent',failed:'failed',unknown:'unconfirmed',sending:'in progress',pending:'waiting'}[s.latestRun.emailState]||'waiting';
   details.push('Latest backup: Drive '+drive+'; email '+email+'.');
  }
  if(s.lastBackupAt)details.push('Last completed backup: '+new Date(s.lastBackupAt).toLocaleString()+'.');
  if(emailBackups&&s.lastDriveBackupAt)details.push('Drive saved: '+new Date(s.lastDriveBackupAt).toLocaleString()+'.');
  if(emailBackups&&s.lastEmailBackupAt)details.push('Email sent: '+new Date(s.lastEmailBackupAt).toLocaleString()+'.');
  if(s.lastError)details.push('Backup needs attention: '+s.lastError);
  if(s.needsAttention)details.push('Check your backup folder and Gmail before retrying an unconfirmed delivery.');
  driveDetails.replaceChildren(document.createTextNode(details.join(' ')));
  if(s.folderUrl&&/^https:\/\/drive\.google\.com\/drive\/folders\/[A-Za-z0-9_-]+$/.test(s.folderUrl)){
   const link=document.createElement('a');link.href=s.folderUrl;link.textContent='Open private backup folder';link.target='_blank';link.rel='noopener noreferrer';
   driveDetails.append(document.createTextNode(' '),link);
  }
 }catch(error){driveStatus.textContent='Unable to check Google Drive.';driveDetails.textContent=error.message;}
}
$('drive-connect').addEventListener('click',()=>{location.href='/api/google/connect';});
$('drive-backup-now').addEventListener('click',async()=>{
 const button=$('drive-backup-now');if(button.disabled||backupBusy)return;backupBusy=true;button.disabled=true;
 try{
  driveStatus.textContent=emailBackups?'Saving to Drive and sending your backup email…':'Saving a new Drive backup…';
  const s=await(await req('/api/google/backup-now',{method:'POST',headers:{'Idempotency-Key':crypto.randomUUID()}})).json();
  if(emailBackups&&(!s.driveSaved||!s.emailSent))throw Error('The backup did not complete both deliveries. Check its status before trying again.');
  status(emailBackups?'Backup saved to Drive and sent to your email.':'Google Drive backup saved successfully.');
 }
 catch(error){status(error.message,true);}finally{backupBusy=false;await checkDrive();}
});
checkDrive();
const driveParam=new URLSearchParams(location.search).get('drive');
if(driveParam==='connected')status('Google authorized and first backup saved.');
if(driveParam==='backup-error')status('Google connected, but the first backup did not finish. Check its delivery status above.',true);
if(driveParam==='denied')status('Google authorization was not approved.',true);
if(driveParam==='error')status('Google authorization failed. Check Google OAuth settings and try again.',true);

let microsoftBusy=false;
async function checkMicrosoft(){
 const state=$('microsoft-status'),details=$('microsoft-details'),connect=$('microsoft-connect'),backup=$('microsoft-backup-now');
 try{
  const m=await(await req('/api/microsoft/status')).json();
  connect.disabled=microsoftBusy||!m.configured;
  backup.disabled=microsoftBusy||!m.connected;
  state.textContent=!m.configured?'Microsoft connection needs configuration.':m.connected?'Microsoft OneDrive connected.':'Microsoft OneDrive is ready to connect.';
  details.textContent=m.lastBackupAt?'Last confirmed OneDrive backup: '+new Date(m.lastBackupAt).toLocaleString():m.connected?'Connected. Save a test backup to confirm delivery.':'Your existing estimates and invoices remain in Cloudflare D1.';
 }catch(e){state.textContent='Microsoft backup not available on this deployment.';details.textContent=e.message;connect.disabled=true;backup.disabled=true;}
}
$('microsoft-connect').addEventListener('click',()=>{location.assign('/api/microsoft/connect');});
$('microsoft-backup-now').addEventListener('click',async()=>{
 if(microsoftBusy)return;microsoftBusy=true;$('microsoft-backup-now').disabled=true;
 try{
  $('microsoft-status').textContent='Uploading your private backup to OneDrive…';
  const result=await(await req('/api/microsoft/backup-now',{method:'POST'})).json();
  status(result.ok?'Microsoft OneDrive backup saved successfully.':'OneDrive backup was not confirmed.',!result.ok);
 }catch(e){status(e.message,true);}finally{microsoftBusy=false;await checkMicrosoft();}
});
checkMicrosoft();
