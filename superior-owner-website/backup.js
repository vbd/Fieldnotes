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
async function checkDrive(){
 try{
  const s=await(await req('/api/google/status')).json();$('drive-connect').disabled=!s.configured;$('drive-backup-now').disabled=!s.connected;
  driveStatus.textContent=!s.configured?(s.notice||'Google Drive backup is not configured.'):s.connected?'Google Drive connected.':'Not connected to Google Drive yet.';
  driveDetails.textContent=(s.lastBackupAt?'Last cloud backup: '+new Date(s.lastBackupAt).toLocaleString()+'. ':'')+(s.lastError?'Backup error: '+s.lastError+'. ':'')+(s.folderUrl?'Backup folder: '+s.folderUrl+'. ':'');
 }catch(error){driveStatus.textContent='Unable to check Google Drive.';driveDetails.textContent=error.message;}
}
$('drive-connect').addEventListener('click',()=>{location.href='/api/google/connect';});
$('drive-backup-now').addEventListener('click',async()=>{
 const button=$('drive-backup-now');if(button.disabled)return;button.disabled=true;
 try{driveStatus.textContent='Saving a new Drive backup…';const s=await(await req('/api/google/backup-now',{method:'POST'})).json();driveStatus.textContent='Google Drive backup saved successfully.';driveDetails.textContent='Saved '+s.filename+' at '+new Date(s.savedAt).toLocaleString()+'. '+s.folderUrl;}
 catch(error){driveStatus.textContent='Google Drive backup failed.';driveDetails.textContent=error.message;}finally{await checkDrive();}
});
checkDrive();
const driveParam=new URLSearchParams(location.search).get('drive');
if(driveParam==='connected')status('Google Drive authorized and first backup saved.');
if(driveParam==='denied')status('Google authorization was not approved.',true);
if(driveParam==='error')status('Google authorization failed. Check Google OAuth settings and try again.',true);
