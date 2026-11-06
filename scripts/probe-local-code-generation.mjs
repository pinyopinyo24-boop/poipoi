// Real local-model probe through the production generation pipeline.
// Only a disposable fixture is created; application source is never applied.
import 'dotenv/config';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PoipoiCodeAgent } from '../server/core/PoipoiCodeAgent.ts';

const project = process.cwd();
const fixture = mkdtempSync(path.join(tmpdir(), 'poipoi-local-probe-'));
const target = 'server/core/Probe.ts';
const original = 'export const version = 1;\n' + '// Preserve this existing source.\n'.repeat(500);
const expected = original.replace('version = 1', 'version = 2');
try {
  mkdirSync(path.join(fixture, 'server/core'), { recursive: true });
  writeFileSync(path.join(fixture, target), original);
  writeFileSync(path.join(fixture, 'package.json'), readFileSync(path.join(project, 'package.json')));
  // JS can construct the isolated agent; TypeScript's private constructor is
  // a compile-time restriction. It uses the real project's compiler/provider.
  const agent = new PoipoiCodeAgent(fixture);
  console.log('REAL LOCAL MODEL PROBE: disposable fixture only');
  const changes = await agent.generate(
    `Modify ${target}: change only the exported version from 1 to 2. Preserve every other character. Return an unapplied proposal.`,
    'system', {
      onProgress: stage => console.log('STAGE:', stage),
      onModelResponse: (stage, response) => console.log('RESPONSE:', stage, response.finishReason, response.content.length),
      validateGenerated: changes => changes.length === 1 && changes[0].path === target && changes[0].content === expected
        ? [] : ['The resulting file must equal the original with only version = 1 changed to version = 2.'],
    });
  if (changes.length !== 1 || changes[0].content !== expected || readFileSync(path.join(fixture, target), 'utf8') !== original)
    throw new Error('Probe failed: proposal or unchanged fixture verification did not match');
  console.log('LOCAL GENERATION PASS: exact edit, source preserved, NOT APPLIED');
} catch (error) {
  console.error('LOCAL GENERATION FAIL:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
