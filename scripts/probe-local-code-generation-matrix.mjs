// Real Ollama generation; only disposable source fixtures are tested/executed.
import 'dotenv/config';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { PoipoiCodeAgent } from '../server/core/PoipoiCodeAgent.ts';
import { checkCodeProposalTypes } from '../server/core/CodeProposalTypeCheck.ts';
import { scenarios, initialFiles } from './lib/generation-scenarios.mjs';
import { qualityScenarios } from './lib/generation-quality-scenarios.mjs';
import { verifyScenario } from './lib/verify-generation-scenario.mjs';

const selection = process.argv.find(arg => arg.startsWith('--case='))?.slice(7).split(',');
const suite = process.argv.find(arg => arg.startsWith('--suite='))?.slice(8) || 'core';
if (!['core','quality','all'].includes(suite)) throw Error('Unknown --suite value');
const available = suite==='quality' ? qualityScenarios : suite==='all' ? [...scenarios,...qualityScenarios] : scenarios;
if (process.argv.includes('--list')) {
  for (const scenario of available) console.log(scenario.id + ': ' + scenario.title);
  process.exit(0);
}
if (selection?.some(id => !available.some(scenario => scenario.id === id))) throw Error('Unknown --case value');
const selected = available.filter(scenario => !selection || selection.includes(scenario.id));
const project = process.cwd();
const report = path.join(project, 'data', 'code-generation-verification', new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid);
mkdirSync(report, { recursive: true });
const results = [];
console.log('REAL LOCAL GENERATION MATRIX: ' + selected.length + ' cases; disposable fixtures; NOT APPLIED');
console.log('REPORT:', report);
const coder = process.env.LOCAL_CODER_MODEL?.trim() || 'qwen2.5-coder:7b';
const sourceHashes=Object.fromEntries(['../server/core/PoipoiCodeAgent.ts','./probe-local-code-generation-matrix.mjs','./lib/generation-scenarios.mjs','./lib/generation-quality-scenarios.mjs','./lib/verify-generation-scenario.mjs','./lib/generation-runtime-worker.mjs'].map(file=>[file,createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex')]));
const manifest={model:coder,suite,sourceHashes,cases:selected.map(s=>({id:s.id,title:s.title,request:s.request})),startedAt:new Date().toISOString()};
writeFileSync(path.join(report,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
try {
  const endpoint=(process.env.LOCAL_AI_URL || 'http://localhost:11434').replace(/\/+$/,'');
  const response=await fetch(endpoint+'/api/tags',{signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('Ollama HTTP '+response.status);
  const models=(await response.json()).models??[];
  const installed=models.find(model=>model.name===coder);
  if(!installed)throw Error('Required local model not installed: '+coder);
  manifest.modelMetadata={digest:installed.digest,details:installed.details};
  manifest.endpointOrigin=new URL(endpoint).origin;
  writeFileSync(path.join(report,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
} catch(error) {
  writeFileSync(path.join(report,'preflight-error.json'),JSON.stringify({error:String(error)},null,2),{mode:0o600});
  console.error('MATRIX NOT STARTED:',error instanceof Error?error.message:String(error));
  process.exit(1);
}
for (const scenario of selected) {
  const started = Date.now(), warnings = [];
  const fixture = mkdtempSync(path.join(tmpdir(), 'poipoi-matrix-' + scenario.id + '-'));
  const files = initialFiles(scenario);
  let candidates = 0, validated = '', modelResponses = 0, acceptanceChecks = 0;
  const result = { id: scenario.id, title: scenario.title, status: 'failed', reviewStatus:'not-completed', modelResponses: 0, seconds: 0, warnings };
  const save = (name, data) => writeFileSync(path.join(report, scenario.id + name), JSON.stringify(data, null, 2), { mode: 0o600 });
  try {
    for (const [file, content] of Object.entries(files)) {
      mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true });
      writeFileSync(path.join(fixture, file), content);
    }
    writeFileSync(path.join(fixture, 'package.json'), readFileSync(path.join(project, 'package.json')));
    writeFileSync(path.join(fixture, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { strict: true, types: [], target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', esModuleInterop: true, skipLibCheck: true },
      include: ['server/**/*.ts','client/**/*.tsx'],
    }));
    symlinkSync(path.join(project, 'node_modules'), path.join(fixture, 'node_modules'), 'junction');
    const agent = new PoipoiCodeAgent(fixture);
    const options = {
      onProgress: phase => console.log('CASE:', scenario.id, phase),
      onModelResponse: (stage, response) => {
        modelResponses++;
        appendFileSync(path.join(report, scenario.id + '.responses.jsonl'), JSON.stringify({ at: new Date().toISOString(), stage, ...response }) + '\n', { mode: 0o600 });
      },
      onCandidate: (changes, errors) => save('.candidate-' + (++candidates) + '.json', { changes, errors }),
      onReviewWarning: warning => { warnings.push(warning); console.log('REVIEW WARNING:', scenario.id, warning); },
      validateGenerated: changes => {
        const errors = verifyScenario(scenario, changes);
        // Type/import failures use the same bounded correction path as actual
        // behavior failures, rather than surfacing only after generation ends.
        if (!errors.length) {
          const types = checkCodeProposalTypes(fixture, changes);
          save('.types-' + (acceptanceChecks + 1) + '.json', types);
          if (!types.checked) errors.push('No TypeScript configuration was checked');
          errors.push(...types.errors);
        }
        save('.acceptance-' + (++acceptanceChecks) + '.json', { errors });
        save('.acceptance.json', { errors });
        if (!errors.length) validated = JSON.stringify(changes);
        return errors;
      },
    };
    const changes = await (scenario.staged ? agent.generateStaged.bind(agent) : agent.generate.bind(agent))(scenario.request, 'system', options);
    if (validated !== JSON.stringify(changes)) throw Error('Final proposal has not passed runtime acceptance checks');
    for (const [file, original] of Object.entries(files)) if (readFileSync(path.join(fixture, file), 'utf8') !== original)
      throw Error('Generation modified an original fixture: ' + file);
    for (const file of scenario.required) if (!Object.hasOwn(files, file) && existsSync(path.join(fixture, file)))
      throw Error('Generation applied a new file: ' + file);
    save('.proposal.json', { changes });
    result.status = 'passed';
    result.reviewStatus = warnings.length ? 'inconclusive' : 'accepted';
    console.log('CASE PASS:', scenario.id, 'behavior, types, original source preserved; NOT APPLIED');
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
    console.error('CASE FAIL:', scenario.id, result.error);
  } finally {
    result.seconds = Math.round((Date.now() - started) / 1000);
    result.modelResponses = modelResponses;
    result.acceptanceChecks = acceptanceChecks;
    results.push(result);
    save('.result.json', result);
    rmSync(fixture, { recursive: true, force: true });
    writeFileSync(path.join(report, 'summary.json'), JSON.stringify({
      model: coder, suite, selectedCases:selected.map(s=>s.id), results,
      reviewComplete: results.every(result=>result.status==='passed' && result.reviewStatus==='accepted'),
      limitations: ['Pure fixture behavior only; React element output uses a test renderer, not a browser.', 'No actual CD hardware operations or production code were executed or applied.'],
    }, null, 2), { mode: 0o600 });
  }
}
const passed = results.filter(result => result.status === 'passed').length;
console.log('MATRIX RESULT:', passed + '/' + results.length, 'REPORT:', report);
console.log('REVIEW COMPLETE:', results.filter(result=>result.reviewStatus==='accepted').length + '/' + results.length);
if (passed !== results.length) process.exitCode = 1;
