import { Worker } from 'node:worker_threads';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type MathOperation = 'calculate' | 'simplify' | 'differentiate' | 'solve' | 'integrate';
export type MathRequest = { operation: MathOperation; expression: string; lower?: number; upper?: number };

export function isMathematicalQuestion(text: string): boolean {
  return /\d/u.test(text) && /(?:計算|求め|解いて|微分|積分|方程式|平方根|平均|分散|標準偏差|面積|体積|確率|割合)/u.test(text);
}

export function parseMathRequest(text: string): MathRequest | null {
  const normalized = text.normalize('NFKC').trim()
    .replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll('π', 'pi');
  const plain = normalized.match(/^([\d\s().+*/^%-]{3,500}?)(?:\s*(?:=\s*)?\?|は\s*\?)$/u);
  if (plain && /[+*/^%-]/u.test(plain[1]) && !/^\d{4}-\d{1,2}-\d{1,2}$/u.test(plain[1].trim()))
    return { operation: 'calculate', expression: plain[1].trim() };
  const match = normalized.match(/^(計算(?:して|する)?|数式(?:を)?計算(?:して)?|簡単にして|式を整理して|微分して|方程式を解いて|定積分して)[：:\s]+(.{1,500})$/u);
  if (!match) return null;
  const operation: MathOperation = match[1].startsWith('微分') ? 'differentiate' :
    match[1].startsWith('方程式') ? 'solve' : match[1].startsWith('定積分') ? 'integrate' :
    /簡単|整理/u.test(match[1]) ? 'simplify' : 'calculate';
  if (operation === 'integrate') {
    const terms = match[2].match(/^(.+),\s*(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/u);
    return terms ? { operation, expression: terms[1].trim(), lower: Number(terms[2]), upper: Number(terms[3]) } : null;
  }
  return { operation, expression: match[2].replace(/[。?？]\s*$/u, '').trim() };
}

export async function calculateMath(input: MathRequest): Promise<{ operation: MathOperation; expression: string; result: string }> {
  if (!['calculate', 'simplify', 'differentiate', 'solve', 'integrate'].includes(input.operation) ||
      typeof input.expression !== 'string' || input.expression.length > 500 ||
      (input.operation === 'integrate' && (!Number.isFinite(input.lower) || !Number.isFinite(input.upper))))
    throw Error('計算方法または数式が不正です。');
  const result = await new Promise<string>((resolve, reject) => {
    const source = path.resolve(process.cwd(), 'scripts/math-evaluate-worker.mjs');
    const built = path.resolve(process.cwd(), 'dist/math-evaluate-worker.mjs');
    const worker = new Worker(existsSync(source) ? source : built, {
      workerData: input, execArgv: [], resourceLimits: { maxOldGenerationSizeMb: 192, stackSizeMb: 2 },
    });
    let finished = false;
    const finish = (error: Error | null, value?: string) => {
      if (finished) return;
      finished = true; clearTimeout(timer); void worker.terminate();
      if (error) reject(error); else resolve(value!);
    };
    const timer = setTimeout(() => finish(Error('計算が制限時間を超えました。')), 5000);
    worker.once('message', (message: { result?: string; error?: string }) => {
      const value = message?.result;
      finish(message?.error ? Error(message.error) :
        typeof value !== 'string' || !value.trim() || value === 'undefined' || value === 'NaN'
          ? Error('計算結果を確定できませんでした。') : null, value);
    });
    worker.once('error', error => finish(error));
    worker.once('exit', code => { if (code !== 0) finish(Error('計算処理を完了できませんでした。')); });
  });
  return { ...input, result };
}
