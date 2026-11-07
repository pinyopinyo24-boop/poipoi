import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assessRealReports, selectRealCases } from './lib/real-generation-report.mjs';

const [directory, selection='all', destination] = process.argv.slice(2);
if (!directory || !destination) throw Error('Usage: summarize-real-generation.mjs artifacts selection output');
const files=[];
function walk(folder) { for(const item of readdirSync(folder,{withFileTypes:true})) {
  const file=path.join(folder,item.name); if(item.isDirectory())walk(file);else files.push(file);
} }
if(existsSync(directory))walk(directory);
const runtimeFiles=['../server/core/PoipoiCodeAgent.ts','./probe-local-code-generation-matrix.mjs','./lib/generation-scenarios.mjs','./lib/generation-quality-scenarios.mjs','./lib/verify-generation-scenario.mjs','./lib/generation-runtime-worker.mjs'];
const sourceHashes=Object.fromEntries(runtimeFiles.map(file=>[file,createHash('sha256').update(readFileSync(new URL(file,import.meta.url))).digest('hex')]));
const reports=[];
for(const file of files.filter(file=>file.endsWith('summary.json'))) {
  const summary=JSON.parse(readFileSync(file,'utf8'));
  const manifest=JSON.parse(readFileSync(path.join(path.dirname(file),'manifest.json'),'utf8'));
  for(const result of summary.results)reports.push({manifest,result});
}
const assessed=assessRealReports(selectRealCases(selection),reports,sourceHashes);
const report={...assessed,revision:process.env.GITHUB_SHA??null,model:'qwen2.5-coder:7b',sourceHashes,
  limitations:['Hosted CPU Ollama against disposable fixtures; not Windows PC acceptance.', 'React uses the fixture renderer, not a mounted browser UI.', 'No application, merge, APK build, deployment or device operations.']};
mkdirSync(destination,{recursive:true});
writeFileSync(path.join(destination,'summary.json'),JSON.stringify(report,null,2));
const safe=value=>String(value??'').replaceAll('|','\\|').replaceAll('\n',' ');
const markdown=[
  '# Real Qwen generation verification', '',
  'Revision: '+report.revision, '',
  `Runtime/types: ${assessed.runtimePassed}/${assessed.expectedCount}; automatic review complete: ${assessed.reviewComplete}/${assessed.expectedCount}.`, '',
  'Quality complete: '+assessed.qualityComplete, '',
  '| Case | Runtime/types | Automatic review | Model responses | Seconds | Warning/error |',
  '| --- | --- | --- | ---: | ---: | --- |',
  ...assessed.results.map(r=>`| ${r.id} | ${r.status} | ${r.reviewStatus} | ${r.modelResponses} | ${r.seconds} | ${safe([...(r.warnings??[]),r.error].filter(Boolean).join('; '))} |`), '',
  ...assessed.issues.map(issue=>'- '+issue), '',
  ...report.limitations.map(issue=>'- '+issue), '',
].join('\n');
writeFileSync(path.join(destination,'summary.md'),markdown);
console.log(markdown);
if(!assessed.runtimeComplete)process.exitCode=1;
