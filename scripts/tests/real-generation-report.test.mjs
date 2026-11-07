import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessRealReports, expectedModelDigest, selectRealCases } from '../lib/real-generation-report.mjs';

const hashes={engine:'reviewed hash'};
const fixture=(id='react-display')=>({manifest:{model:'qwen2.5-coder:7b',modelMetadata:{digest:expectedModelDigest},cases:[{id}],sourceHashes:hashes},
  result:{id,status:'passed',reviewStatus:'accepted',warnings:[],modelResponses:2,acceptanceChecks:1}});
test('retains eight original cases and four additional quality contracts',()=>{
  assert.equal(selectRealCases('core').length,8);assert.equal(selectRealCases('quality').length,4);assert.equal(selectRealCases('all').length,12);
  assert.deepEqual(selectRealCases('react-display,react-gauge'),['react-display','react-gauge']);
  assert.throws(()=>selectRealCases('missing'));assert.throws(()=>selectRealCases('react-display,react-display'));
});
test('distinguishes behavior acceptance from inconclusive automatic review',()=>{
  const report=fixture();report.result.reviewStatus='inconclusive';report.result.warnings=['review lacked evidence'];
  const assessed=assessRealReports(['react-display'],[report],hashes);
  assert.equal(assessed.runtimeComplete,true);assert.equal(assessed.qualityComplete,false);assert.equal(assessed.reviewComplete,0);
});
test('rejects missing or duplicated results instead of claiming a full matrix',()=>{
  assert.equal(assessRealReports(['react-display'],[],hashes).runtimeComplete,false);
  assert.equal(assessRealReports(['react-display'],[fixture(),fixture()],hashes).runtimeComplete,false);
});
test('rejects different model weights, source revisions, or fabricated passing counts',()=>{
  for(const change of [r=>r.manifest.modelMetadata.digest='different',r=>r.manifest.sourceHashes={},r=>r.result.modelResponses=0,r=>r.result.acceptanceChecks=0]) {
    const report=fixture();change(report);assert.equal(assessRealReports(['react-display'],[report],hashes).runtimeComplete,false);
  }
});
test('accepts complete matching real-model evidence',()=>{
  assert.equal(assessRealReports(['react-display'],[fixture()],hashes).qualityComplete,true);
});
