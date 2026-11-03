'use strict';
const $=id=>document.getElementById(id);
const status=(txt,isError=false)=>{const el=$('backup-status');el.textContent=txt;el.style.color=isError?'#e3a09c':'#8ccaab';};
async function req(url,opts={}){const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opts});if(r.status===401){location.assign('/owner');throw Error('Please sign in to the owner Command Center.');}if(!r.ok){let msg='Request failed';try{msg=(await r.json()).error||msg;}catch{}throw Error(msg);}return r;}
(async()=>{try{const r=await req('/api/estimates');const e=await r.json();const i=await (await req('/api/invoices')).json();$('record-count').textContent=`${e.estimates.length} estimates • ${i.invoices.length} invoices ready for backup`;}catch(e){status(e.message,true);}})();
$('download').addEventListener('click',async()=>{try{status('Preparing your file…');const response=await req('/api/backup');const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Superior_Command_Center_Backup_${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);status('Backup downloaded. Save the file in a PRIVATE Google Drive folder or another safe location.');}catch(e){status(e.message,true);}});
$('backup-file').addEventListener('change',()=>{$('selected').textContent=$('backup-file').files[0]?.name||'No file selected';$('restore').disabled=!$('backup-file').files.length;});
$('restore').addEventListener('click',async()=>{try{const f=$('backup-file').files[0];if(!f)return;if(f.size>8*1024*1024)throw Error('Backup file is too large (8 MB maximum).');const raw=JSON.parse(await f.text());if(raw.app!=='Superior Maintenance and Remodeling - Command Center'||raw.version!==1||!Array.isArray(raw.estimates)||!Array.isArray(raw.invoices))throw Error('Please select a valid Superior Command Center backup.');const count=`${raw.estimates.length} estimates and ${raw.invoices.length} invoices`;if(!confirm(`RESTORE ${count}? This REPLACES all current records and cannot be undone. Download a backup of your current records first.`))return;const typed=prompt('To replace the current records, type RESTORE in all capital letters:');if(typed!=='RESTORE'){status('Restore canceled.');return;}status('Restoring records…');const body=JSON.stringify({...raw,confirm:'RESTORE'});const response=await req('/api/restore',{method:'POST',headers:{'Content-Type':'application/json'},body});const result=await response.json();status(`Restore complete: ${result.estimates} estimates and ${result.invoices} invoices. Return to Command Center to view them.`);$('record-count').textContent=`${result.estimates} estimates • ${result.invoices} invoices ready for backup`;}catch(e){status(e.message,true);}});

const driveStatus=$('drive-connection-status'),driveDetails=$('drive-details');
async function checkDrive(){
 try{
  const r=await req('/api/google/status');const s=await r.json();
  $('drive-connect').disabled=!s.configured;
  $('drive-backup-now').disabled=!s.connected;
  driveStatus.textContent=!s.configured?'Setup needed: add Google OAuth client ID and secret to Render.':s.connected?'Google Drive connected.':'Not connected to Google Drive yet.';
  driveDetails.textContent=(s.lastBackupAt?'Last cloud backup: '+new Date(s.lastBackupAt).toLocaleString()+'. ':'')+(s.lastError?'Backup error: '+s.lastError+'. ':'')+(s.folderUrl?'Backup folder: '+s.folderUrl+'. ':'')+'Free Render may require reconnection after restart.';
 }catch(e){driveStatus.textContent='Unable to check Google Drive.';driveDetails.textContent=e.message;}
}
$('drive-connect').addEventListener('click',()=>{location.href='/api/google/connect';});
$('drive-backup-now').addEventListener('click',async()=>{
 try{driveStatus.textContent='Saving a new Drive backup…';const r=await req('/api/google/backup-now',{method:'POST'});const s=await r.json();driveStatus.textContent='Google Drive backup saved successfully.';driveDetails.textContent='Saved '+s.filename+' at '+new Date(s.savedAt).toLocaleString()+'. '+s.folderUrl;}
 catch(e){driveStatus.textContent='Google Drive backup failed.';driveDetails.textContent=e.message;}
});
checkDrive();
const driveParam=new URLSearchParams(location.search).get('drive');
if(driveParam==='connected')status('Google Drive authorized and first backup saved.');
if(driveParam==='denied')status('Google authorization was not approved.',true);
if(driveParam==='error')status('Google authorization failed. Check Google OAuth settings and try again.',true);
