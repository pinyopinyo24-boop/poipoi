import { scenarios } from './generation-scenarios.mjs';
import { qualityScenarios } from './generation-quality-scenarios.mjs';

export const expectedModelDigest = 'dae161e27b0e90dd1856c8bb3209201fd6736d8eb66298e75ed87571486f4364';
export function selectRealCases(selection = 'all') {
  const available = [...scenarios, ...qualityScenarios];
  const selected = selection === 'all' ? available.map(s=>s.id)
    : selection === 'core' ? scenarios.map(s=>s.id)
    : selection === 'quality' ? qualityScenarios.map(s=>s.id)
    : selection.split(',').map(id=>id.trim());
  if (!selected.length || selected.some(id=>!available.some(s=>s.id===id))) throw Error('Unknown or empty real-generation selection');
  if (new Set(selected).size !== selected.length) throw Error('Duplicate case selection');
  return selected;
}

export function assessRealReports(expectedCases, reports, sourceHashes) {
  const issues = [], results = [];
  for (const id of expectedCases) {
    const matches = reports.filter(report=>report.result.id===id);
    if (matches.length !== 1) { issues.push(id+': expected one result, found '+matches.length); continue; }
    const {result, manifest} = matches[0];
    if (manifest.model !== 'qwen2.5-coder:7b' || manifest.modelMetadata?.digest !== expectedModelDigest)
      issues.push(id+': model identity/digest differs from the pinned real model');
    if (!manifest.cases?.some(s=>s.id===id)) issues.push(id+': case absent from manifest');
    if (JSON.stringify(Object.entries(manifest.sourceHashes??{}).sort()) !== JSON.stringify(Object.entries(sourceHashes).sort()))
      issues.push(id+': runtime source differs from the reviewed checkout');
    if (result.status === 'passed' && (!(result.modelResponses>0) || !(result.acceptanceChecks>0)))
      issues.push(id+': passing result lacks model/acceptance evidence');
    results.push(result);
  }
  for (const report of reports) if (!expectedCases.includes(report.result.id)) issues.push('Unexpected case: '+report.result.id);
  const runtimePassed = results.filter(r=>r.status==='passed').length;
  const reviewComplete = results.filter(r=>r.status==='passed' && r.reviewStatus==='accepted' && !r.warnings?.length).length;
  return { results, issues, runtimePassed, reviewComplete, expectedCount:expectedCases.length,
    runtimeComplete:!issues.length && runtimePassed===expectedCases.length,
    qualityComplete:!issues.length && reviewComplete===expectedCases.length };
}
