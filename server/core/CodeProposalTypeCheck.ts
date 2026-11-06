import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CodeChange } from './PoipoiCodeAgent';

const requireCompiler = createRequire(import.meta.url);

/** Type-check a virtual overlay. No generated file is written or executed. */
export function checkCodeProposalTypes(root: string, changes: readonly CodeChange[]) {
  const configFile = path.join(root, 'tsconfig.json');
  if (!existsSync(configFile)) return { checked: false, errors: [] as string[] };
  const ts = requireCompiler('typescript') as typeof import('typescript');
  const config = ts.readConfigFile(configFile, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, root);
  const canonical = (file: string) => {
    const absolute = path.resolve(file);
    return ts.sys.useCaseSensitiveFileNames ? absolute : absolute.toLowerCase();
  };
  const overlay = new Map(changes.map(change => [canonical(path.resolve(root, change.path)), change.content]));
  const directories = new Set<string>();
  for (const file of overlay.keys()) {
    let directory = path.dirname(file);
    while (!directories.has(directory)) {
      directories.add(directory);
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
  }
  const host = ts.createCompilerHost({ ...parsed.options, noEmit: true, incremental: false });
  const read = host.readFile.bind(host);
  const exists = host.fileExists.bind(host);
  const directoryExists = host.directoryExists?.bind(host);
  host.readFile = file => overlay.get(canonical(file)) ?? read(file);
  host.fileExists = file => overlay.has(canonical(file)) || exists(file);
  host.directoryExists = directory => directories.has(canonical(directory)) || Boolean(directoryExists?.(directory));
  host.getCurrentDirectory = () => root;
  host.getSourceFile = (file, languageVersion, onError) => {
    const content = host.readFile(file);
    if (content === undefined) { onError?.('Cannot read ' + file); return undefined; }
    return ts.createSourceFile(file, content, languageVersion, true);
  };
  const added = changes.filter(change => /\.[cm]?[jt]sx?$/.test(change.path)).map(change => path.resolve(root, change.path));
  const program = ts.createProgram([...new Set([...parsed.fileNames, ...added])],
    { ...parsed.options, noEmit: true, incremental: false }, host);
  const diagnostics = [...(config.error ? [config.error] : []), ...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
  const errors = diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error).slice(0, 20).map(item => {
    const location = item.file && item.start !== undefined ? item.file.getLineAndCharacterOfPosition(item.start) : undefined;
    return (item.file ? path.relative(root, item.file.fileName).replace(/\\/g, '/') : 'tsconfig.json') +
      (location ? ':' + (location.line + 1) + ':' + (location.character + 1) : '') +
      ' TS' + item.code + ': ' + ts.flattenDiagnosticMessageText(item.messageText, ' ');
  });
  return { checked: true, errors };
}
