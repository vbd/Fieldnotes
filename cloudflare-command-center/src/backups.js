// Server-only Google authorization and recoverable Drive/Gmail backups.
// Tokens remain encrypted in D1; callers must protect owner routes themselves.
const APP = 'Superior Maintenance and Remodeling - Command Center';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const TOKEN = 'https://oauth2.googleapis.com/token';
const USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo';
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/gmail.send'];
const MAX_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const now = () => new Date().toISOString();
const random = (bytes = 24) => [...crypto.getRandomValues(new Uint8Array(bytes))].map(v => v.toString(16).padStart(2, '0')).join('');
const emailFor = env => String(env.BACKUP_EMAIL || 'superiormandr@gmail.com').trim().toLowerCase();
const folderFor = env => String(env.GOOGLE_DRIVE_BACKUP_FOLDER_ID || '1yaMI4U93EE9LaPkVuEVYkUzgaE8afHDp').trim();
const folderUrl = (env, folderId) => 'https://drive.google.com/drive/folders/' + encodeURIComponent(folderId || folderFor(env));
const configured = env => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET && /^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/.test(emailFor(env)) );
const connection = env => env.DB.prepare('SELECT * FROM backup_connections WHERE id=1').first();
const runRow = (env, id) => env.DB.prepare('SELECT * FROM backup_runs WHERE id=?').bind(id).first();
const hash = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(v => v.toString(16).padStart(2, '0')).join('');
const safeJSON = (value, status = 200) => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});
function redirect(req, result) {
  return new Response(null, {status:303, headers:{Location:new URL('/owner/backup?drive=' + result, req.url).toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
function base64(bytes) {
  const parts = [];
  for (let i = 0; i < bytes.length; i += 8192) parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(parts.join(''));
}
function unbase64(value) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}
async function tokenKey(env) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(String(env.SESSION_SECRET)), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'HKDF', hash:'SHA-256', salt:encoder.encode('superior-command-center'), info:encoder.encode('google-backup-refresh-token-v1')}, key, {name:'AES-GCM', length:256}, false, ['encrypt','decrypt']);
}
async function encryptToken(value, env) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({name:'AES-GCM', iv, additionalData:encoder.encode(emailFor(env))}, await tokenKey(env), encoder.encode(value));
  return JSON.stringify({version:1, iv:base64(iv), ciphertext:base64(new Uint8Array(ciphertext))});
}
async function decryptToken(value, env) {
  const encrypted = JSON.parse(value);
  if (encrypted.version !== 1) throw Error('Reconnect Google backups.');
  const clear = await crypto.subtle.decrypt({name:'AES-GCM', iv:unbase64(encrypted.iv), additionalData:encoder.encode(emailFor(env))}, await tokenKey(env), unbase64(encrypted.ciphertext));
  const token = new TextDecoder().decode(clear);
  if (!token || token.length > 16000) throw Error('Reconnect Google backups.');
  return token;
}
class GoogleFailure extends Error {
  constructor(message, {status=0, ambiguous=false}={}) { super(message); this.status=status; this.ambiguous=ambiguous; }
}
async function google(env, url, options={}, message='Google backup request failed.') {
  let response;
  try {
    response = await (env.BACKUP_FETCH || fetch)(url, {...options, redirect:'error', signal:AbortSignal.timeout(30000)});
  } catch { throw new GoogleFailure(message, {ambiguous:true}); }
  if (!response.ok) throw new GoogleFailure(message, {status:response.status, ambiguous:response.status>=500});
  return response;
}
async function jsonResponse(response, message) {
  try { return await response.json(); } catch { throw new GoogleFailure(message, {ambiguous:true}); }
}
async function accessToken(env, conn) {
  let refresh;
  try { refresh = await decryptToken(conn.refresh_token, env); }
  catch { throw Error('Google authorization needs to be renewed. Connect Google backups again.'); }
  const response = await google(env, TOKEN, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({client_id:String(env.GOOGLE_CLIENT_ID),client_secret:String(env.GOOGLE_CLIENT_SECRET),refresh_token:refresh,grant_type:'refresh_token'})}, 'Google authorization could not be refreshed. Connect Google backups again.');
  const result = await jsonResponse(response, 'Google authorization could not be refreshed.');
  if (typeof result.access_token !== 'string' || !result.access_token) throw Error('Google authorization could not be refreshed. Connect Google backups again.');
  return result.access_token;
}
async function drive(env, access, path, options={}) {
  return google(env, DRIVE + path, {...options, headers:{Authorization:'Bearer ' + access, ...options.headers}}, 'Google Drive backup request failed. Check the connected account and folder access.');
}
async function validateFolder(env, access, folderId) {
  const response = await drive(env, access, '/files/' + encodeURIComponent(folderId) + '?fields=id,mimeType,trashed,shared,capabilities(canAddChildren)');
  const folder = await jsonResponse(response, 'Google Drive folder could not be verified.');
  if (folder.id !== folderId || folder.mimeType !== 'application/vnd.google-apps.folder' || folder.trashed === true || folder.capabilities?.canAddChildren !== true) throw Error('The selected private Drive folder is unavailable or is not writable.');
  if (folder.shared !== false) throw Error('The selected backup folder must be verified private to the business Google account.');
}
async function createBackupFolder(env, access) {
  const response = await drive(env, access, '/files?fields=id,mimeType', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Superior Command Center Backups',mimeType:'application/vnd.google-apps.folder',description:'Private application-created backups for Superior Command Center'})});
  const folder = await jsonResponse(response,'Google Drive backup folder could not be created.');
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(folder.id || '') || folder.mimeType !== 'application/vnd.google-apps.folder') throw Error('Google Drive backup folder could not be verified.');
  await validateFolder(env,access,folder.id);
  return folder.id;
}
async function rememberError(env, message) {
  await env.DB.prepare('UPDATE backup_connections SET last_error=? WHERE id=1').bind(message).run();
}

export async function backupSnapshot(env) {
  const snapshot = await env.DB.batch([
    env.DB.prepare("SELECT data FROM records WHERE kind='estimate' ORDER BY created_at DESC"),
    env.DB.prepare("SELECT data FROM records WHERE kind='invoice' ORDER BY created_at DESC"),
    env.DB.prepare('SELECT data FROM customer_reviews ORDER BY created_at DESC')
  ]);
  const [estimates, invoices, reviews] = snapshot.map(result => result.results.map(row => JSON.parse(row.data)));
  return {app:APP, version:1, exportedAt:now(), estimates, invoices, reviews};
}

export async function backupStatus(env) {
  const conn = await connection(env);
  const pending = await env.DB.prepare("SELECT COUNT(*) AS count FROM backup_runs WHERE queued=1 AND status<>'complete'").first();
  const attention = await env.DB.prepare("SELECT COUNT(*) AS count FROM backup_runs WHERE status<>'complete' AND (email_state IN ('sending','unknown') OR drive_state IN ('uploading','unknown'))").first();
  const latest = await env.DB.prepare('SELECT created_at,completed_at,status,drive_state,email_state,last_error FROM backup_runs ORDER BY created_at DESC,id DESC LIMIT 1').first();
  const ready = configured(env);
  let connected = ready && Boolean(conn?.refresh_token) && conn.email === emailFor(env) && /^[A-Za-z0-9_-]{10,200}$/.test(conn.folder_id || '');
  let decryptError = false;
  if (connected) try { await decryptToken(conn.refresh_token, env); } catch { connected=false; decryptError=true; }
  return {
    configured:ready, connected, email:emailFor(env), folderUrl:conn?.folder_id ? folderUrl(env,conn.folder_id) : null,
    lastBackupAt:conn?.last_backup_at || null, lastDriveBackupAt:conn?.last_drive_backup_at || null,
    lastEmailBackupAt:conn?.last_email_backup_at || null,
    lastError:decryptError ? 'Google authorization needs to be renewed. Connect Google backups again.' : conn?.last_error || null,
    pendingCount:Number(pending?.count||0),needsAttention:Number(attention?.count||0)>0,
    latestRun:latest?{createdAt:latest.created_at,completedAt:latest.completed_at||null,status:latest.status,driveState:latest.drive_state,emailState:latest.email_state,lastError:latest.last_error||null}:null,
    notice:!ready ? 'Setup needed: configure the Google OAuth client securely in Cloudflare before connecting Google backups. Saved records and queued backups stay in D1.' : !connected ? 'Connect the business Google account to authorize private Drive files and emailed JSON backups. Saved records stay in D1 while backups wait.' : 'Each saved estimate and new invoice queues a recoverable JSON backup to your private Drive folder and business Gmail. Delivery times below show confirmed results.',
    schedule:'After each saved estimate and new invoice; pending deliveries retry every 15 minutes.'
  };
}

export async function startGoogleConnection(req, env) {
  if (!configured(env)) return safeJSON({error:'Configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET securely in Cloudflare before connecting Google backups.'}, 503);
  const state = random(32), expiry = Date.now() + 10*60*1000;
  await env.DB.prepare('DELETE FROM backup_oauth_states WHERE expires_at<?').bind(Date.now()).run();
  await env.DB.prepare('INSERT INTO backup_oauth_states(state_hash,expires_at) VALUES(?,?)').bind(await hash(state), expiry).run();
  const params = new URLSearchParams({client_id:String(env.GOOGLE_CLIENT_ID),redirect_uri:new URL('/api/google/callback',req.url).toString(),response_type:'code',scope:SCOPES.join(' '),access_type:'offline',prompt:'consent',include_granted_scopes:'false',login_hint:emailFor(env),state});
  return new Response(null, {status:303, headers:{Location:'https://accounts.google.com/o/oauth2/v2/auth?' + params,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}

export async function completeGoogleConnection(req, env) {
  const url = new URL(req.url), state = url.searchParams.get('state') || '';
  if (!configured(env) || !/^[a-f0-9]{64}$/.test(state)) return redirect(req, 'error');
  const claimed = await env.DB.prepare('DELETE FROM backup_oauth_states WHERE state_hash=? AND expires_at>?').bind(await hash(state),Date.now()).run();
  if (!claimed.meta?.changes) return redirect(req, 'error');
  if (url.searchParams.has('error')) return redirect(req, 'denied');
  const code = url.searchParams.get('code');
  if (!code || code.length>16000) return redirect(req, 'error');
  try {
    const response = await google(env, TOKEN, {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:String(env.GOOGLE_CLIENT_ID),client_secret:String(env.GOOGLE_CLIENT_SECRET),redirect_uri:new URL('/api/google/callback',req.url).toString(),grant_type:'authorization_code'})}, 'Google authorization failed. Connect Google backups again.');
    const result = await jsonResponse(response, 'Google authorization failed.');
    if (!result.access_token || !result.refresh_token) throw Error('Google did not grant offline backup authorization. Connect Google backups again.');
    if (typeof result.scope === 'string' && !['https://www.googleapis.com/auth/drive.file','https://www.googleapis.com/auth/gmail.send'].every(scope=>result.scope.split(' ').includes(scope))) throw Error('Google Drive and Gmail send permissions are both required for these backups.');
    const identityResponse = await google(env, USERINFO, {headers:{Authorization:'Bearer ' + result.access_token}}, 'The Google account could not be verified.');
    const identity = await jsonResponse(identityResponse, 'The Google account could not be verified.');
    if (identity.email_verified !== true || String(identity.email||'').toLowerCase() !== emailFor(env)) throw Error('Connect the selected business Google account to enable its backups.');
    const folderId = await createBackupFolder(env, result.access_token);
    const encrypted = await encryptToken(result.refresh_token, env);
    await env.DB.prepare('INSERT INTO backup_connections(id,email,folder_id,refresh_token,connected_at) VALUES(1,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,folder_id=excluded.folder_id,refresh_token=excluded.refresh_token,connected_at=excluded.connected_at,last_error=NULL').bind(emailFor(env),folderId,encrypted,now()).run();
  } catch (error) {
    await rememberError(env, error instanceof GoogleFailure || error?.message?.startsWith('Google ') || error?.message?.startsWith('The selected ') || error?.message?.startsWith('Connect the selected ') || error?.message?.startsWith('The Google ') ? error.message : 'Google authorization failed. Connect Google backups again.');
    return redirect(req, 'error');
  }
  try {
    await runCloudBackup(env, {runId:'connect-' + await hash(state),trigger:'connect'});
    return redirect(req, 'connected');
  } catch { return redirect(req, 'backup-error'); }
}

async function resultFor(env, run) {
  const conn = await connection(env);
  return {runId:run.id,filename:run.filename,savedAt:run.completed_at || null,folderUrl:conn?.folder_id ? folderUrl(env,conn.folder_id) : null,driveSaved:Boolean(run.drive_file_id),emailSent:run.email_state==='sent',status:run.status};
}
async function completeRun(env, runId) {
  const completed = now();
  await env.DB.batch([
    env.DB.prepare("UPDATE backup_runs SET status='complete',completed_at=?,last_error=NULL WHERE id=?").bind(completed,runId),
    env.DB.prepare('UPDATE backup_connections SET last_backup_at=?,last_email_backup_at=?,last_error=NULL WHERE id=1').bind(completed,completed)
  ]);
  return resultFor(env,await runRow(env,runId));
}
async function acquireLock(env, owner) {
  const time = Date.now();
  const lock = await env.DB.prepare("INSERT INTO backup_locks(id,owner,expires_at) VALUES('delivery',?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE backup_locks.expires_at<?").bind(owner,time+10*60*1000,time).run();
  if (!lock.meta?.changes) throw Error('Another cloud backup is in progress. Please check its status shortly.');
}
async function findUploadedFile(env, access, runId, folderId) {
  const q = "'" + folderId + "' in parents and trashed=false and appProperties has { key='superior_backup_run' and value='" + await hash(runId) + "' }";
  const response = await drive(env, access, '/files?' + new URLSearchParams({q,fields:'files(id,name,mimeType,size)',pageSize:'2'}));
  const result = await jsonResponse(response, 'The previous Drive backup could not be checked.');
  const found = result.files?.[0];
  if (!found) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(found.id || '') || found.mimeType && found.mimeType !== 'application/json' || Number(found.size || 0)>MAX_BYTES) throw Error('The previous Drive backup could not be verified.');
  return found;
}
async function uploadedPayload(env, access, fileId) {
  const response = await drive(env, access, '/files/' + encodeURIComponent(fileId) + '?alt=media');
  if (Number(response.headers.get('content-length') || 0)>MAX_BYTES) throw Error('The saved backup is too large for automatic email delivery.');
  const payload = await response.text();
  if (encoder.encode(payload).length>MAX_BYTES) throw Error('The saved backup is too large for automatic email delivery.');
  let backup;
  try { backup=JSON.parse(payload); } catch { throw Error('The saved Drive backup is not a valid recoverable backup.'); }
  if (backup.app!==APP || backup.version!==1 || !Array.isArray(backup.estimates) || !Array.isArray(backup.invoices) || !Array.isArray(backup.reviews)) throw Error('The saved Drive backup is not a valid recoverable backup.');
  return payload;
}
function mimeMessage(env, run, payload, runHash, folderId) {
  const boundary = 'superior-backup-' + runHash;
  const attachment = base64(encoder.encode(payload)).match(/.{1,76}/g)?.join('\r\n') || '';
  const message = [
    'From: ' + emailFor(env), 'To: ' + emailFor(env),
    'Subject: Superior Command Center backup - ' + run.created_at.slice(0,10),
    'Message-ID: <superior-backup-' + runHash + '@superior-command-center.workers.dev>',
    'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="' + boundary + '"', '',
    '--' + boundary, 'Content-Type: text/plain; charset=UTF-8', '',
    'Your complete Superior Command Center backup is attached as a JSON file.',
    'The same file is saved in your private Google Drive backup folder:', folderUrl(env,folderId),
    'Keep this attachment private. Restore missing records from Backup & Restore in your Command Center.', '',
    '--' + boundary, 'Content-Type: application/json; name="' + run.filename + '"',
    'Content-Disposition: attachment; filename="' + run.filename + '"',
    'Content-Transfer-Encoding: base64', '', attachment, '--' + boundary + '--', ''
  ].join('\r\n');
  return base64(encoder.encode(message)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

// Include this statement in the same D1 batch as the successful business write.
// A conditional source check makes a raced/failed invoice creation queue nothing.
export function backupQueueStatement(env, {runId,trigger='saved',sourceId,sourceKind,sourceData}={}) {
  if (typeof runId!=='string' || !/^[A-Za-z0-9:_-]{1,150}$/.test(runId)) throw Error('Invalid backup request.');
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(trigger)) throw Error('Invalid backup trigger.');
  if ((sourceId!==undefined || sourceKind!==undefined) && (typeof sourceId!=='string' || !['estimate','invoice'].includes(sourceKind))) throw Error('Invalid backup source.');
  if (sourceData!==undefined && (typeof sourceData!=='string' || sourceId===undefined)) throw Error('Invalid backup source.');
  const created = now();
  const filename = 'Superior_Command_Center_Backup_' + created.replace(/[:.]/g,'-') + '_' + runId.replace(/[^A-Za-z0-9_-]/g,'-') + '.json';
  if (sourceData!==undefined) return env.DB.prepare('INSERT INTO backup_runs(id,trigger,created_at,filename,queued) SELECT ?,?,?,?,1 WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND kind=? AND data=?) ON CONFLICT(id) DO NOTHING').bind(runId,trigger,created,filename,sourceId,sourceKind,sourceData);
  if (sourceId!==undefined) return env.DB.prepare('INSERT INTO backup_runs(id,trigger,created_at,filename,queued) SELECT ?,?,?,?,1 WHERE EXISTS (SELECT 1 FROM records WHERE id=? AND kind=?) ON CONFLICT(id) DO NOTHING').bind(runId,trigger,created,filename,sourceId,sourceKind);
  return env.DB.prepare('INSERT INTO backup_runs(id,trigger,created_at,filename,queued) VALUES(?,?,?,?,1) ON CONFLICT(id) DO NOTHING').bind(runId,trigger,created,filename);
}

// Catch-up processing never invents a daily email: only durable after-save events
// are delivered. A disconnected Google account cannot affect the saved record.
export async function processBackupQueue(env, {limit=3}={}) {
  const countLimit = Math.max(1,Math.min(10,Number.isInteger(limit)?limit:3));
  const initial = await backupStatus(env);
  if (!initial.connected) return {processed:0,pendingCount:initial.pendingCount,needsAttention:initial.needsAttention,blocked:initial.configured?'authorization':'configuration'};
  const candidates = await env.DB.prepare("SELECT id,attempts FROM backup_runs WHERE queued=1 AND status<>'complete' AND email_state NOT IN ('sending','unknown') AND next_attempt_at<=? ORDER BY created_at ASC,id ASC LIMIT ?").bind(Date.now(),countLimit).all();
  let processed = 0, failed = 0, blocked = null;
  for (const candidate of candidates.results) {
    try {
      await runCloudBackup(env,{runId:candidate.id,trigger:'queued'});
      processed++;
    } catch(error) {
      if (error.message==='Another cloud backup is in progress. Please check its status shortly.') { blocked='busy'; break; }
      failed++;
      const attempts = Number(candidate.attempts||0)+1;
      const retryAt = Date.now()+Math.min(6*60*60*1000,15*60*1000*2**Math.min(attempts-1,5));
      await env.DB.prepare('UPDATE backup_runs SET attempts=?,next_attempt_at=? WHERE id=?').bind(attempts,retryAt,candidate.id).run();
    }
  }
  const final = await backupStatus(env);
  return {processed,failed,pendingCount:final.pendingCount,needsAttention:final.needsAttention,...(blocked?{blocked}:{})};
}

export async function runCloudBackup(env, {runId='manual-' + random(16),trigger='manual'}={}) {
  if (!/^[A-Za-z0-9:_-]{1,150}$/.test(runId)) throw Error('Invalid backup request.');
  if (!configured(env)) throw Error('Google backups are not configured in Cloudflare yet.');
  const conn = await connection(env);
  if (!conn || conn.email!==emailFor(env) || !/^[A-Za-z0-9_-]{10,200}$/.test(conn.folder_id || '')) throw Error('Connect the selected business Google account before saving cloud backups.');
  let run = await runRow(env, runId);
  if (run?.status==='complete') return resultFor(env, run);
  const lockOwner = random();
  await acquireLock(env, lockOwner);
  try {
    run = await runRow(env, runId);
    if (run?.status==='complete') return resultFor(env, run);
    if (!run) {
      const created = now(), filename = 'Superior_Command_Center_Backup_' + created.replace(/[:.]/g,'-') + '_' + (await hash(runId)).slice(0,10) + '.json';
      await env.DB.prepare('INSERT INTO backup_runs(id,trigger,created_at,filename) VALUES(?,?,?,?)').bind(runId,['manual','scheduled','connect'].includes(trigger)?trigger:'manual',created,filename).run();
      run = await runRow(env, runId);
    }
    // A receipt can be durable even if the final status transaction failed.
    // Never send that already-confirmed email a second time while reconciling it.
    if (run.email_state==='sent' && run.email_message_id && run.drive_file_id) return await completeRun(env,runId);
    if (['sending','unknown'].includes(run.email_state)) {
      await env.DB.prepare("UPDATE backup_runs SET status='email_unknown',email_state='unknown',last_error=? WHERE id=?").bind('Email delivery is unconfirmed. Check Gmail before retrying this backup.',runId).run();
      throw Error('Email delivery is unconfirmed. Check Gmail before retrying this backup.');
    }
    const access = await accessToken(env, conn);
    await validateFolder(env,access,conn.folder_id);
    let payload;
    if (!run.drive_file_id) {
      const previous = await findUploadedFile(env,access,runId,conn.folder_id);
      if (previous) {
        await env.DB.prepare("UPDATE backup_runs SET drive_file_id=?,drive_state='saved',status='drive_saved' WHERE id=?").bind(previous.id,runId).run();
        run = await runRow(env,runId);
      } else {
        if (['uploading','unknown'].includes(run.drive_state)) throw Error('Drive delivery is unconfirmed. Check the backup folder before retrying this backup.');
        payload = JSON.stringify(await backupSnapshot(env),null,2);
        if (encoder.encode(payload).length>MAX_BYTES) throw Error('The backup exceeds the 8 MB automatic-delivery limit. Download a full backup and use a staged import for recovery.');
        const boundary = 'superior-' + random();
        const metadata = {name:run.filename,mimeType:'application/json',parents:[conn.folder_id],appProperties:{superior_backup_run:await hash(runId),superior_backup_app:'command-center-v1'}};
        const uploadBody = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + '\r\n--' + boundary + '\r\nContent-Type: application/json\r\n\r\n' + payload + '\r\n--' + boundary + '--\r\n';
        await env.DB.prepare("UPDATE backup_runs SET drive_state='uploading',status='uploading',last_error=NULL WHERE id=?").bind(runId).run();
        try {
          const uploaded = await google(env,UPLOAD + '?uploadType=multipart&fields=id,name', {method:'POST',headers:{Authorization:'Bearer ' + access,'Content-Type':'multipart/related; boundary=' + boundary},body:uploadBody}, 'The Drive backup could not be saved.');
          const file = await jsonResponse(uploaded,'Drive delivery is unconfirmed. Check the backup folder before retrying this backup.');
          if (!/^[A-Za-z0-9_-]+$/.test(file.id || '')) throw new GoogleFailure('Drive delivery is unconfirmed. Check the backup folder before retrying this backup.',{ambiguous:true});
          await env.DB.prepare("UPDATE backup_runs SET drive_file_id=?,drive_state='saved',status='drive_saved' WHERE id=?").bind(file.id,runId).run();
          run = await runRow(env,runId);
        } catch(error) {
          await env.DB.prepare('UPDATE backup_runs SET drive_state=? WHERE id=?').bind(error instanceof GoogleFailure&&!error.ambiguous?'failed':'unknown',runId).run();
          throw error instanceof GoogleFailure&&error.ambiguous ? Error('Drive delivery is unconfirmed. Check the backup folder before retrying this backup.') : error;
        }
      }
    }
    await env.DB.prepare('UPDATE backup_connections SET last_drive_backup_at=? WHERE id=1').bind(now()).run();
    if (!payload) payload = await uploadedPayload(env,access,run.drive_file_id);
    await env.DB.prepare("UPDATE backup_runs SET email_state='sending',status='sending' WHERE id=?").bind(runId).run();
    try {
      const response = await google(env,GMAIL,{method:'POST',headers:{Authorization:'Bearer ' + access,'Content-Type':'application/json'},body:JSON.stringify({raw:mimeMessage(env,run,payload,await hash(runId),conn.folder_id)})}, 'Gmail did not confirm the emailed backup.');
      const sent = await jsonResponse(response,'Email delivery is unconfirmed. Check Gmail before retrying this backup.');
      if (typeof sent.id!=='string' || !sent.id) throw new GoogleFailure('Email delivery is unconfirmed. Check Gmail before retrying this backup.',{ambiguous:true});
      await env.DB.prepare("UPDATE backup_runs SET email_state='sent',email_message_id=? WHERE id=?").bind(sent.id,runId).run();
    } catch(error) {
      const ambiguous = !(error instanceof GoogleFailure) || error.ambiguous;
      await env.DB.prepare('UPDATE backup_runs SET email_state=?,status=? WHERE id=?').bind(ambiguous?'unknown':'failed',ambiguous?'email_unknown':'email_failed',runId).run();
      throw Error(ambiguous?'Email delivery is unconfirmed. Check Gmail before retrying this backup.':'Gmail did not accept the backup email. Check Google permissions and try again.');
    }
    return await completeRun(env,runId);
  } catch(error) {
    // Every message allowed here originates in this module, never provider bodies.
    const message = error instanceof GoogleFailure ? error.message : /^(?:Google |Connect |Another |Email delivery |Drive delivery |The (?:backup|saved|previous|selected) |Gmail )/.test(error?.message||'') ? error.message : 'Cloud backup could not finish. Check its status before retrying.';
    await env.DB.prepare('UPDATE backup_runs SET last_error=? WHERE id=?').bind(message,runId).run();
    await rememberError(env,message);
    throw Error(message);
  } finally {
    await env.DB.prepare("DELETE FROM backup_locks WHERE id='delivery' AND owner=?").bind(lockOwner).run();
  }
}
