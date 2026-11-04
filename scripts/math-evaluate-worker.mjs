import { parentPort, workerData } from 'node:worker_threads';
import { create, all } from 'mathjs';

const math = create(all);
const functions = new Set([
  'sqrt', 'cbrt', 'nthRoot', 'abs', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'atan2', 'log', 'log2', 'log10', 'exp', 'pow',
  'round', 'floor', 'ceil', 'min', 'max', 'gcd', 'lcm', 'factorial',
  'combinations', 'permutations', 'fraction', 'complex',
  'sum', 'prod', 'mean', 'median', 'std', 'variance',
  'det', 'inv', 'transpose', 'dot', 'cross', 'lusolve', 'polynomialRoot',
]);
const operations = new Set(['+', '-', '*', '/', '^', '%', 'mod', '!', 'to']);

function validated(expression, symbols = new Set(['pi', 'e'])) {
  if (typeof expression !== 'string' || expression.length > 500 || !expression.trim()) throw Error('数式は1～500文字で指定してください。');
  const node = math.parse(expression);
  let count = 0;
  node.traverse(part => {
    if (++count > 256) throw Error('数式が複雑すぎます。');
    if (part.isFunctionNode) {
      if (!part.fn.isSymbolNode || !functions.has(part.fn.name)) throw Error('対応していない関数です。');
    } else if (part.isSymbolNode) {
      if (!symbols.has(part.name) && !functions.has(part.name) && !math.Unit.isValuelessUnit(part.name))
        throw Error('未知の変数または関数です: ' + part.name);
    } else if (part.isOperatorNode) {
      if (!operations.has(part.op)) throw Error('対応していない演算です。');
    } else if (part.isArrayNode) {
      if (part.items.length > 12) throw Error('行列または配列が大きすぎます。');
    } else if (!part.isConstantNode && !part.isParenthesisNode) {
      throw Error('この数式の構文は使用できません。');
    }
  });
  return node;
}

function polynomial(node) {
  if (node.isParenthesisNode) return polynomial(node.content);
  if (node.isConstantNode) {
    const n = Number(node.value);
    if (!Number.isFinite(n)) throw Error('有限の係数を入力してください。');
    return [n];
  }
  if (node.isSymbolNode && node.name === 'x') return [0, 1];
  if (!node.isOperatorNode) throw Error('方程式は3次以下の多項式に対応しています。');
  const values = node.args.map(polynomial);
  const plus = (a, b, sign = 1) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + sign * (b[i] ?? 0));
  const multiply = (a, b) => {
    const result = Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) result[i + j] += a[i] * b[j];
    return result;
  };
  let result;
  if (node.op === '+') result = values.reduce((a, b) => plus(a, b));
  else if (node.op === '-') result = values.length === 1 ? values[0].map(n => -n) : plus(values[0], values[1], -1);
  else if (node.op === '*') result = values.reduce((a, b) => multiply(a, b));
  else if (node.op === '/' && values[1]?.length === 1 && values[1][0] !== 0) result = values[0].map(n => n / values[1][0]);
  else if (node.op === '^' && values[1]?.length === 1 && Number.isInteger(values[1][0]) && values[1][0] >= 0 && values[1][0] <= 3) {
    result = [1];
    for (let i = 0; i < values[1][0]; i++) result = multiply(result, values[0]);
  } else throw Error('方程式は3次以下の多項式に対応しています。');
  if (result.length > 4 || result.some(n => !Number.isFinite(n))) throw Error('方程式は3次以下の有限な係数に対応しています。');
  return result;
}

function run() {
  const { operation, expression } = workerData;
  if (operation === 'solve') {
    const parts = expression.split('=');
    if (parts.length !== 2) throw Error('方程式は「左辺=右辺」で指定してください。');
    const left = polynomial(validated(parts[0], new Set(['x'])));
    const right = polynomial(validated(parts[1], new Set(['x'])));
    const coeff = Array.from({ length: Math.max(left.length, right.length) }, (_, i) => (left[i] ?? 0) - (right[i] ?? 0));
    while (coeff.length > 1 && coeff.at(-1) === 0) coeff.pop();
    if (coeff.length === 1) return coeff[0] === 0 ? 'すべての実数が解です。' : '解はありません。';
    const roots = math.polynomialRoot(...coeff);
    return 'x = ' + roots.map(root => math.format(root, { precision: 12 })).join(', ');
  }
  const symbols = operation === 'calculate' ? new Set(['pi', 'e']) : new Set(['pi', 'e', 'x', 'y']);
  const node = validated(expression, symbols);
  if (operation === 'differentiate') return math.derivative(node, 'x').toString();
  if (operation === 'simplify') return math.simplify(node).toString();
  if (operation === 'calculate') {
    const value = node.evaluate();
    if (typeof value === 'number' && !Number.isFinite(value)) throw Error('計算結果が有限の数ではありません。');
    return math.format(value, { precision: 14 });
  }
  if (operation === 'integrate') {
    const { lower, upper } = workerData;
    if (!Number.isFinite(lower) || !Number.isFinite(upper) || Math.abs(lower) > 1e9 || Math.abs(upper) > 1e9) throw Error('積分区間を確認してください。');
    const steps = 1024;
    const width = (upper - lower) / steps;
    let sum = 0;
    for (let i = 0; i <= steps; i++) {
      const value = node.evaluate({ x: lower + i * width });
      if (typeof value !== 'number' || !Number.isFinite(value)) throw Error('積分区間で有限の実数にならない式です。');
      sum += (i === 0 || i === steps ? 1 : i % 2 === 0 ? 2 : 4) * value;
    }
    return '約 ' + math.format(sum * width / 3, { precision: 12 }) + '（数値積分）';
  }
  throw Error('指定した計算方法には対応していません。');
}

try { parentPort.postMessage({ result: String(run()).slice(0, 2000) }); }
catch (error) { parentPort.postMessage({ error: error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300) }); }
