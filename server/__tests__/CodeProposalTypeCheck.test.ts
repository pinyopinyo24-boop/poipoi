import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkCodeProposalTypes } from '../core/CodeProposalTypeCheck';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'proposal-types-'));
  roots.push(root);
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, types: [], module: 'ESNext', moduleResolution: 'bundler', target: 'ES2022' },
    include: ['**/*.ts'],
  }));
  writeFileSync(join(root, 'main.ts'), 'export const original = true;');
  return root;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

it('resolves combined new modules and checks unchanged callers without applying the proposal', () => {
  const root = fixture();
  writeFileSync(join(root, 'main.ts'), "import { count } from './core'; export const total: number = count;");
  writeFileSync(join(root, 'core.ts'), 'export const count = 1;');
  const good = [{ path: 'core.ts', content: "export { count } from './generated/count';" },
    { path: 'generated/count.ts', content: 'export const count = 2;' }];
  expect(checkCodeProposalTypes(root, good)).toEqual({ checked: true, errors: [] });
  const bad = checkCodeProposalTypes(root, [{ ...good[0] }, { ...good[1], content: "export const count = 'two';" }]);
  expect(bad.errors.join('\n')).toContain('main.ts:1:');
  expect(bad.errors.join('\n')).toContain('TS2322');
  expect(readFileSync(join(root, 'core.ts'), 'utf8')).toBe('export const count = 1;');
  expect(existsSync(join(root, 'generated'))).toBe(false);
  expect(existsSync(join(root, 'main.js'))).toBe(false);
});

it('rejects an unresolved import before approval', () => {
  const result = checkCodeProposalTypes(fixture(), [{ path: 'main.ts', content: "export { value } from './missing';" }]);
  expect(result.errors.join('\n')).toContain('TS2307');
});

it('does not claim a check when the project has no TypeScript configuration', () => {
  const root = fixture();
  rmSync(join(root, 'tsconfig.json'));
  expect(checkCodeProposalTypes(root, [])).toEqual({ checked: false, errors: [] });
});
