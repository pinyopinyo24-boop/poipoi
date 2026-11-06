import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';

let codeCalls = 0, wrongOutput = false;
const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = JSON.parse(Buffer.concat(chunks).toString());
  const properties = body.format?.properties;
  let content: string;
  // Reproduce the real failure: the final reviewer names preservation clause
  // 2 without providing any evidence. The source oracle must still gate PASS.
  if (properties?.complete) content = JSON.stringify({ complete: false, missing: [2] });
  else if (properties?.accepted) content = JSON.stringify({ accepted: false, issues: [{
    path: 'server/core/Probe.ts', requirement: 'unsupported requirement',
    problem: 'controlled unsupported review', evidence: 'invented source',
  }] });
  else {
    codeCalls++;
    const oldText = `export const version = ${codeCalls === 1 ? 1 : 2};`;
    const newText = codeCalls === 1 ? 'export const version = 2;' :
      'export const version = 2;\nexport const displayVersion = version' + (wrongOutput ? ' + 1' : '') + ';';
    content = JSON.stringify({ changes: [{ path: 'server/core/Probe.ts', edits: [{ oldText, newText }] }] });
  }
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ message: { role: 'assistant', content }, done: true, done_reason: 'stop' }));
});
beforeAll(async () => { await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); });
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

for (const invalid of [false, true]) it(`runs the actual staged CLI and checks the result despite unsupported reviews (invalid: ${invalid})`, async () => {
  codeCalls = 0;
  wrongOutput = invalid;
  const child = spawn(process.execPath, ['--import', 'tsx', path.resolve('scripts/probe-local-code-generation.mjs'), '--staged'], {
    cwd: process.cwd(), env: { ...process.env, LOCAL_AI_URL: 'http://127.0.0.1:' + (server.address() as any).port },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const status = await new Promise<number | null>((resolve, reject) => {
    child.once('exit', resolve);
    child.once('error', reject);
  });
  expect(codeCalls, output).toBe(2);
  expect(output).toContain('REAL LOCAL MODEL PROBE: STAGED');
  expect(output).toContain('機能を段階生成 1/2');
  expect(output).toContain('機能を段階生成 2/2');
  expect(output).toContain('REVIEW WARNING:');
  expect(status, output).toBe(invalid ? 1 : 0);
  expect(output.includes('LOCAL STAGED GENERATION PASS')).toBe(!invalid);
  if (invalid) expect(output).toContain('proposal or unchanged fixture verification did not match');
}, 20000);
