import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

test('credential checks reject unsafe inputs without echoing their contents',()=>{
 const dir=mkdtempSync(join(tmpdir(),'superior-secret-check-'));
 try{
  for(const value of ['', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_UNDERSCORE_TOKEN',
    'Bearer test-only-invalid-value', 'test-only-value\n', '"test-only-value"',
    'CLOUDFLARE_API_TOKEN=test-only-value']){
   const summary=join(dir,'summary');
   const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/validate-cloudflare-token.mjs',import.meta.url))],
    {env:{...process.env,CLOUDFLARE_API_TOKEN:value,GITHUB_STEP_SUMMARY:summary},encoding:'utf8'});
   assert.equal(result.status,1);
   const output=result.stdout+result.stderr+readFileSync(summary,'utf8');
   if(value&&!value.startsWith('CLOUDFLARE_API_'))assert.ok(!output.includes(value),'Credential contents must not be printed.');
   assert.match(output,/repository Actions secret/);
  }
  const sentinel='test-only-noncredential-for-format-check';
  const result=spawnSync(process.execPath,[fileURLToPath(new URL('../scripts/validate-cloudflare-token.mjs',import.meta.url))],
   {env:{...process.env,CLOUDFLARE_API_TOKEN:sentinel,GITHUB_STEP_SUMMARY:''},encoding:'utf8'});
  assert.equal(result.status,0);assert.ok(!(result.stdout+result.stderr).includes(sentinel));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
