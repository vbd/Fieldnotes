'use strict';
/* Private Google Drive backup integration using the Google Drive drive.file scope.
 * Only creates and manages files inside a folder this application itself creates.
 * OAuth refresh credentials are encrypted locally, but Render Free disk is ephemeral:
 * reauthorize Google after a restart/redeploy to resume automatic offsite backups.
 */
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ROOT='https://www.googleapis.com/drive/v3';
const FOLDER_NAME='Superior Command Center - Automatic Backups';
const APP_NAME='Superior Maintenance and Remodeling - Command Center';
const SCOPE='https://www.googleapis.com/auth/drive.file';
const text = s => String(s || '');
class GoogleDriveBackup {
 constructor({dataDir,ownerPassword,getRecords}){
  this.clientId=text(process.env.GOOGLE_CLIENT_ID).trim();
  this.clientSecret=text(process.env.GOOGLE_CLIENT_SECRET).trim();
  this.redirectUri='https://superior-remodeling-owner-preview.onrender.com/api/google/callback';
  this.getRecords=getRecords;
  this.password=ownerPassword;
  this.tokenFile=path.join(dataDir,'.google-drive-auth.enc');
  this.tokens=null;this.states=new Map();this.folderId=null;this.lastBackupAt=null;this.lastError=null;
  this.queue=Promise.resolve();this.timer=null;
  try{if(fs.existsSync(this.tokenFile)){this.tokens=this.decrypt(JSON.parse(fs.readFileSync(this.tokenFile,'utf8')));}}catch(e){this.lastError='Google Drive authorization needs to be renewed.';}
 }
 configured(){return Boolean(this.clientId&&this.clientSecret);}
 connected(){return this.configured()&&Boolean(this.tokens?.refresh_token);}
 getStatus(){return {configured:this.configured(),connected:this.connected(),folderUrl:this.folderId?'https://drive.google.com/drive/folders/'+this.folderId:null,lastBackupAt:this.lastBackupAt,lastError:this.lastError,notice:'Render Free storage is temporary. Reconnect Google Drive after a server restart if needed.'};}
 key(salt){return crypto.pbkdf2Sync(this.password,salt,120000,32,'sha256');}
 encrypt(data){
  const salt=crypto.randomBytes(16),iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',this.key(salt),iv);
  const ciphertext=Buffer.concat([cipher.update(JSON.stringify(data),'utf8'),cipher.final()]);
  return {salt:salt.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
 }
 decrypt(data){
  const salt=Buffer.from(data.salt,'base64'),iv=Buffer.from(data.iv,'base64');
  const decipher=crypto.createDecipheriv('aes-256-gcm',this.key(salt),iv);
  decipher.setAuthTag(Buffer.from(data.tag,'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.ciphertext,'base64')),decipher.final()]).toString('utf8'));
 }
 authUrl(){
  if(!this.configured())throw Error('Google OAuth client credentials are not configured in Render yet.');
  const state=crypto.randomBytes(32).toString('hex');
  this.states.set(state,Date.now()+10*60*1000);
  const query=new URLSearchParams({client_id:this.clientId,redirect_uri:this.redirectUri,response_type:'code',scope:SCOPE,access_type:'offline',prompt:'consent',state});
  return 'https://accounts.google.com/o/oauth2/v2/auth?'+query;
 }
 async completeAuth(code,state){
  const expires=this.states.get(text(state));this.states.delete(text(state));
  if(!expires||Date.now()>expires)throw Error('Google approval expired. Start the connection again.');
  if(!code)throw Error('Google did not return an authorization code.');
  const form=new URLSearchParams({code,client_id:this.clientId,client_secret:this.clientSecret,redirect_uri:this.redirectUri,grant_type:'authorization_code'});
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(20000)});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.refresh_token)throw Error('Google did not provide a refresh token. Try Connect Google Drive again.');
  this.tokens={refresh_token:result.refresh_token};
  fs.writeFileSync(this.tokenFile,JSON.stringify(this.encrypt(this.tokens)),{mode:0o600});
  this.folderId=null;this.lastError=null;
  return await this.backupNow();
 }
 async accessToken(){
  if(!this.connected())throw Error('Connect Google Drive from Backup & Restore.');
  const form=new URLSearchParams({client_id:this.clientId,client_secret:this.clientSecret,refresh_token:this.tokens.refresh_token,grant_type:'refresh_token'});
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(20000)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.access_token)throw Error('Google authorization expired or was revoked. Reconnect Google Drive.');
  return data.access_token;
 }
 async driveRequest(url,options={}){
  const token=await this.accessToken();
  const headers={Authorization:'Bearer '+token,...options.headers};
  const response=await fetch(url,{...options,headers,signal:AbortSignal.timeout(30000)});
  if(!response.ok){const msg=await response.text().catch(()=>'');throw Error('Google Drive request failed ('+response.status+'): '+msg.slice(0,180));}
  return response.json();
 }
 async ensureFolder(){
  if(this.folderId)return this.folderId;
  // drive.file can access only files/folders made or opened by this OAuth app.
  const query=new URLSearchParams({q:"name = '"+FOLDER_NAME+"' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",fields:'files(id,name),nextPageToken',page_size:'100'});
  const found=await this.driveRequest(ROOT+'/files?'+query.toString());
  if(found.files?.length){this.folderId=found.files[0].id;return this.folderId;}
  const made=await this.driveRequest(ROOT+'/files?fields=id,name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:FOLDER_NAME,mimeType:'application/vnd.google-apps.folder'})});
  this.folderId=made.id;return made.id;
 }
 async createBackup(){
  const folder=await this.ensureFolder();
  const records=this.getRecords();
  const payload=Buffer.from(JSON.stringify({app:APP_NAME,version:1,exportedAt:new Date().toISOString(),estimates:records.estimates.filter(e=>e.status!=='declined'),invoices:records.invoices},null,2));
  const name='Superior_Command_Center_Backup_'+new Date().toISOString().replace(/[:.]/g,'-')+'_'+crypto.randomBytes(3).toString('hex')+'.json';
  const boundary='superior'+crypto.randomBytes(12).toString('hex');
  const meta=Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify({name,mimeType:'application/json',parents:[folder]})+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n');
  const body=Buffer.concat([meta,payload,Buffer.from('\r\n--'+boundary+'--')]);
  const result=await this.driveRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
  this.lastBackupAt=new Date().toISOString();this.lastError=null;
  return {fileId:result.id,filename:result.name,folderUrl:'https://drive.google.com/drive/folders/'+folder,savedAt:this.lastBackupAt};
 }
 backupNow(){
  if(!this.connected())return Promise.reject(Error('Google Drive is not connected.'));
  this.queue=this.queue.catch(()=>{}).then(()=>this.createBackup()).catch(e=>{this.lastError=e.message;console.error('Google Drive backup failed:',e.message);throw e;});
  return this.queue;
 }
 queueBackup(){
  if(!this.connected())return;
  if(this.timer)clearTimeout(this.timer);
  this.timer=setTimeout(()=>{this.timer=null;this.backupNow().catch(()=>{});},500);
 }
}
module.exports={GoogleDriveBackup};
