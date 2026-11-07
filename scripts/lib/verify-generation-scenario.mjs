import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initialFiles } from './generation-scenarios.mjs';
const require = createRequire(import.meta.url);
const ts = require('typescript');

export function verifyScenario(scenario, changes) {
  const errors = [], baseline = initialFiles(scenario);
  const sources = { ...baseline };
  for (const change of changes) {
    if (!scenario.required.includes(change.path)) errors.push('Unexpected changed path: ' + change.path);
    sources[change.path] = change.content;
  }
  for (const file of scenario.required) if (!changes.some(change => change.path === file)) errors.push('Required file missing: ' + file);
  if (sources['server/core/Reference.ts'] !== baseline['server/core/Reference.ts']) errors.push('Reference file changed');
  if (scenario.preserveExact && sources['server/core/LargeExisting.ts'] !== baseline['server/core/LargeExisting.ts'].replace('price + quantity', 'price * quantity'))
    errors.push('Existing file differs outside the requested expression');
  const modules = {}, dependencies = {};
  for (const [file, source] of Object.entries(sources)) {
    const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    dependencies[file] = {};
    for (const entry of ts.preProcessFile(source).importedFiles) {
      const specifier = entry.fileName;
      if (specifier === 'react') { dependencies[file][specifier] = 'react'; continue; }
      if (!specifier.startsWith('.')) { errors.push('Dependency outside pure fixture: ' + specifier); continue; }
      const name = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
      const resolved = [name, name + '.ts', name + '.tsx', name + '/index.ts'].find(name => Object.hasOwn(sources, name));
      if (!resolved) errors.push('Unresolved fixture import: ' + file + ' -> ' + specifier);
      else dependencies[file][specifier] = resolved;
    }
    if (scenario.imports?.[file]) {
      const imports = parsed.statements.filter(ts.isImportDeclaration);
      if (!imports.some(item => item.moduleSpecifier.text.includes(scenario.imports[file]))) errors.push('Required integration import missing: ' + file);
    }
    const output = ts.transpileModule(source, { fileName: file, reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true } });
    for (const diagnostic of output.diagnostics ?? []) if (diagnostic.category === ts.DiagnosticCategory.Error)
      errors.push(file + ' TS' + diagnostic.code + ': ' + ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '));
    modules[file] = output.outputText;
  }
  if (errors.length) return errors;
  try {
    const env = {};
    for (const key of ['SystemRoot','WINDIR','TEMP','TMP']) if (process.env[key]) env[key] = process.env[key];
    const output = execFileSync(process.execPath, ['--max-old-space-size=96', fileURLToPath(new URL('./generation-runtime-worker.mjs', import.meta.url))], {
      input: JSON.stringify({ modules, dependencies, tests: scenario.tests }), encoding: 'utf8', env, timeout: 5000,
      maxBuffer: 128000, windowsHide: true,
    });
    if (JSON.parse(output).ok !== true) errors.push('Runtime verification did not pass');
  } catch (error) {
    try {
      const failure = String(JSON.parse(String(error.stdout)).error);
      // Surface the original failing assertion, rather than only its label.
      // This gives the code generator the required calculation or edge case,
      // without changing or weakening the acceptance checks.
      const assertion = scenario.tests.split(/\r?\n/).find(line =>
        line.includes("'" + failure + "'") || line.includes('"' + failure + '"'));
      errors.push('Runtime acceptance failed: ' + failure +
        (assertion ? '\\nFailed assertion source: ' + assertion.trim().slice(0, 1800) : ''));
    } catch {
      errors.push('Runtime verification failed or timed out: ' + error.message);
    }
  }
  return errors;
}
