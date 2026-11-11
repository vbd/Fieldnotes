import test from 'node:test';
import assert from 'node:assert/strict';
import {fingerprintRows,verifyExistingRecords} from '../scripts/verify-record-preservation.mjs';

test('record conservation detects edits and deletions, permits new rows, and stores no raw customer fields',()=>{
 const record={id:'EST-test',kind:'estimate',status:'draft',created_at:'2026-01-01',review_token:'PRIVATE-REVIEW-TOKEN',data:'PRIVATE-CUSTOMER-DATA'};
 const baseline=fingerprintRows([record],[]);
 assert.doesNotMatch(JSON.stringify(baseline),/PRIVATE|EST-test/);
 assert.equal(verifyExistingRecords(baseline,fingerprintRows([record,{...record,id:'EST-new'}],[])),1);
 assert.throws(()=>verifyExistingRecords(baseline,{}),/changed during deployment/);
 assert.throws(()=>verifyExistingRecords(baseline,fingerprintRows([{...record,data:'modified'}],[])),/changed during deployment/);
});
