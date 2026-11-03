import {mkdir, readFile, writeFile, copyFile, rm} from 'node:fs/promises';
import {resolve, join} from 'node:path';
const base=resolve('../superior-owner-website'),dest=resolve('public');
await rm(dest,{recursive:true,force:true});
await mkdir(join(dest,'assets'),{recursive:true});
const files=['index.html','styles.css','script.js','owner.html','owner.css','owner.js','review.html','review.js','backup.html','backup.css','backup.js'];
for(const file of files){
 let s=await readFile(join(base,file),'utf8');
 if(file==='owner.html')s=s.replace(/<p class="preview-alert">[\s\S]*?<\/p>/g,'');
 if(file==='review.html')s=s.replace('href="owner.css"','href="/owner.css"').replace('src="review.js"','src="/review.js"');
 if(file==='backup.html'){
  s=s.replace('The free website can lose records when it restarts—download backups regularly.','Records are stored in Cloudflare D1. Download encrypted or privately stored copies regularly for disaster recovery.');
  s=s.replace('On the free Render plan, you might need to reconnect Google after a redeploy or restart. Until this page reports a successful cloud backup, download manual backups too.','Automatic Google Drive sync is not yet enabled. Use Download backup and save the file privately in Google Drive.');
  s=s.replace('Use this if Render loses your data.','Use this only when recovering from a saved backup.');
  s=s.replace('This is a manual backup solution, not automatic permanent storage. When the business starts taking real customer records, connect a durable database and automated off-site backups.','Cloudflare D1 is the primary database; downloaded copies are off-site disaster recovery backups.');
 }
 if(file==='backup.js'){
  s=s.replace("Setup needed: add Google OAuth client ID and secret to Render.","Automatic Google Drive sync not configured on this Cloudflare deployment.");
  s=s.replace("Free Render may require reconnection after restart.","D1 records are retained independently of app redeploys.");
 }
 await writeFile(join(dest,file),s);
}
await copyFile(join(base,'assets/superior-logo.webp'),join(dest,'assets/superior-logo.webp'));
console.log('Built public website assets for Cloudflare Workers; private server files were excluded.');
