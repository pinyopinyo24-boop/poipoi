import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { invokeLLM } from '../_core/llm';

export type Capability = 'reasoning' | 'code' | 'documents' | 'memory' | 'self_correction' | 'tools' | 'sync';
export interface EvaluationCase {
  id: string;
  capability: Capability;
  prompt: string;
  expected: string;
  weight?: number;
}
export interface EvaluationResult {
  id: string;
  capability: Capability;
  passed: boolean;
  answer: string;
  expected: string;
  durationMs: number;
  error?: string;
}
export interface EvaluationReport {
  runId: string;
  model: string;
  timestamp: string;
  cases: EvaluationResult[];
  passed: number;
  total: number;
  passRate: number;
  eligibleForParityClaim: false;
  limitations: string[];
  integrationVerified: false;
  capabilityScores: Record<Capability, { passed: number; total: number; passRate: number }>;
}

const DEFAULT_CASES: EvaluationCase[] = [
  { id: 'reasoning-1', capability: 'reasoning', prompt: 'A machine makes 12 parts in 30 minutes. At the same constant rate, how many minutes for 40 parts? Answer with a single number.', expected: '100' },
  { id: 'code-1', capability: 'code', prompt: 'What is the result of JavaScript expression [1,2,3].reduce((a,b)=>a+b,0)? Answer with a single number.', expected: '6' },
  { id: 'documents-1', capability: 'documents', prompt: 'In a cost report, actual cost is 168 yen and estimated cost is 150 yen. State the unfavorable variance in yen as a single number.', expected: '18' },
  { id: 'memory-1', capability: 'memory', prompt: 'The project label is KIRI-42. Repeat only the label.', expected: 'KIRI-42' },
  { id: 'self-correction-1', capability: 'self_correction', prompt: 'A calculation claims 60 parts in 75 minutes means 0.8 minutes per part. Correct it; answer only minutes per part.', expected: '1.25' },
  { id: 'tools-1', capability: 'tools', prompt: 'Is the statement "a text-only answer proves a file was saved" true or false? Answer only true or false.', expected: 'false' },
  { id: 'sync-1', capability: 'sync', prompt: 'Two devices edit the same record offline. Should conflict resolution preserve both versions until resolved? Answer only yes or no.', expected: 'yes' },
];

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9.\-]/g, '');
}

export async function evaluateLocalCapabilities(
  userId: string,
  cases: EvaluationCase[] = DEFAULT_CASES,
): Promise<EvaluationReport> {
  if (!cases.length || cases.length > 30) throw new Error('Evaluation requires 1-30 cases');
  const model = process.env.LOCAL_CHAT_MODEL || 'qwen2.5:7b';
  const results: EvaluationResult[] = [];
  for (const item of cases) {
    const start = Date.now();
    try {
      const response = await invokeLLM({
        model: item.capability === 'code' ? (process.env.LOCAL_CODER_MODEL || 'qwen2.5-coder:7b') : model,
        temperature: 0,
        max_tokens: 200,
        messages: [
          { role: 'system', content: 'Answer precisely and concisely. Follow the required answer format.' },
          { role: 'user', content: item.prompt },
        ],
      });
      const answer = response.choices[0]?.message?.content || '';
      results.push({
        id: item.id, capability: item.capability,
        passed: normalize(answer) === normalize(item.expected),
        answer: answer.slice(0, 1000), expected: item.expected,
        durationMs: Date.now() - start,
      });
    } catch (error) {
      results.push({
        id: item.id, capability: item.capability, passed: false,
        answer: '', expected: item.expected,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const passed = results.filter(item => item.passed).length;
  const capabilityScores = {} as EvaluationReport['capabilityScores'];
  for (const capability of ['reasoning', 'code', 'documents', 'memory', 'self_correction', 'tools', 'sync'] as Capability[]) {
    const subset = results.filter(item => item.capability === capability);
    const successes = subset.filter(item => item.passed).length;
    capabilityScores[capability] = { passed: successes, total: subset.length, passRate: subset.length ? successes / subset.length : 0 };
  }
  const report: EvaluationReport = {
    runId: createHash('sha256').update(userId + ':' + Date.now() + ':' + Math.random()).digest('hex').slice(0, 24),
    model, timestamp: new Date().toISOString(), cases: results,
    passed, total: results.length, passRate: passed / results.length,
    eligibleForParityClaim: false,
    integrationVerified: false,
    capabilityScores,
    limitations: [
      'These are basic smoke-test cases, not GPT-6 benchmark comparisons.',
      'Tool, document, synchronization and self-evolution end-to-end behavior is not verified by text questions.',
      'GPT-6 parity requires independently scored, representative side-by-side tasks and real execution evidence.',
    ],
  };
  const dir = path.resolve(process.cwd(), 'data', 'evaluation-users', createHash('sha256').update(userId).digest('hex'));
  await fs.mkdir(dir, { recursive: true });
  const destination = path.join(dir, report.runId + '.json');
  await fs.writeFile(destination, JSON.stringify(report, null, 2), { encoding: 'utf8', flag: 'wx' });
  return report;
}
