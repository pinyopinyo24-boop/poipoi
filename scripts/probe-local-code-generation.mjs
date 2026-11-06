// Real local-model probe through the production generation pipeline.
// Only a disposable fixture is created; application source is never applied.
import 'dotenv/config';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PoipoiCodeAgent } from '../server/core/PoipoiCodeAgent.ts';
import { checkCodeProposalTypes } from '../server/core/CodeProposalTypeCheck.ts';

const project = process.cwd();
const fixture = mkdtempSync(path.join(tmpdir(), 'poipoi-local-probe-'));
const target = 'server/core/Probe.ts';
const staged = process.argv.includes('--staged');
const original = 'export const version = 1;\n' + '// Preserve this existing source.\n'.repeat(500);
const expected = original.replace('version = 1', 'version = 2');
const matches = changes => changes.length === 1 && changes[0].path === target &&
  (staged ? changes[0].content === expected.replace('export const version = 2;\n',
    'export const version = 2;\nexport const displayVersion = version;\n')
    : changes[0].content === expected);
try {
  mkdirSync(path.join(fixture, 'server/core'), { recursive: true });
  writeFileSync(path.join(fixture, target), original);
  writeFileSync(path.join(fixture, 'package.json'), readFileSync(path.join(project, 'package.json')));
  writeFileSync(path.join(fixture, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, types: [], module: 'ESNext', moduleResolution: 'bundler', target: 'ES2022' },
    include: ['server/**/*.ts'],
  }));
  // JS can construct the isolated agent; TypeScript's private constructor is
  // a compile-time restriction. It uses the real project's compiler/provider.
  const agent = new PoipoiCodeAgent(fixture);
  console.log('REAL LOCAL MODEL PROBE:', staged ? 'STAGED' : 'SINGLE', 'disposable fixture only');
  const options = {
    onProgress: stage => console.log('STAGE:', stage),
    onModelResponse: (stage, response) => console.log('RESPONSE:', stage, response.finishReason, response.content.length),
    // Match the approval worker's handling of an inconclusive reviewer.
    // The exact source oracle and independent type check below still gate PASS.
    onReviewWarning: warning => console.log('REVIEW WARNING:', warning),
    validateGenerated: changes => matches(changes) ? [] : ['proposal or unchanged fixture verification did not match'],
  };
  const changes = staged ? await agent.generateStaged(
    `保存処理の基礎として${target}のexport const versionの値だけを1から2に変更する。` +
    `画面表示用に${target}のversion宣言の直後に export const displayVersion = version; を追加する。` +
    'それ以外の文字とコメントはすべて保持する。',
    'system', options,
  ) : await agent.generate(
    `Modify ${target}: change only the exported version from 1 to 2. Preserve every other character. Return an unapplied proposal.`,
    'system', {
      ...options,
      validateGenerated: changes => changes.length === 1 && changes[0].path === target && changes[0].content === expected
        ? [] : ['The resulting file must equal the original with only version = 1 changed to version = 2.'],
    });
  if (!matches(changes) || readFileSync(path.join(fixture, target), 'utf8') !== original)
    throw new Error('Probe failed: proposal or unchanged fixture verification did not match');
  const types = checkCodeProposalTypes(fixture, changes);
  if (!types.checked || types.errors.length) throw new Error('Type check failed: ' + types.errors.join('; '));
  console.log(staged ? 'LOCAL STAGED GENERATION PASS: both stages combined, types checked, source preserved, NOT APPLIED'
    : 'LOCAL GENERATION PASS: exact edit, source preserved, NOT APPLIED');
} catch (error) {
  console.error('LOCAL GENERATION FAIL:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
