import { describe, expect, it } from 'vitest';
import { calculateMath, parseMathRequest } from '../core/AZMathEngine';

describe('AZ mathematical engine', () => {
  it('parses Japanese chat instructions and full-width notation', () => {
    expect(parseMathRequest('計算して：（３＋５）×２')).toEqual({ operation: 'calculate', expression: '(3+5)*2' });
    expect(parseMathRequest('2+2は？')).toEqual({ operation: 'calculate', expression: '2+2' });
    expect(parseMathRequest('微分して: x^3 + 2*x')).toEqual({ operation: 'differentiate', expression: 'x^3 + 2*x' });
    expect(parseMathRequest('方程式を解いて: x^2-5*x+6=0')).toEqual({ operation: 'solve', expression: 'x^2-5*x+6=0' });
    expect(parseMathRequest('定積分して: x^2, 0, 1')).toEqual({ operation: 'integrate', expression: 'x^2', lower: 0, upper: 1 });
    expect(parseMathRequest('どうして2+2=4？')).toBeNull();
  });

  it('handles arithmetic, elementary functions, statistics, and matrices', async () => {
    for (const [expression, expected] of [
      ['1/3+1/6', '0.5'], ['sin(pi/2)', '1'], ['mean([2,4,6])', '4'],
      ['det([[1,2],[3,4]])', '-2'], ['(3+5)*2', '16'],
      ['fraction(1,3)+fraction(1,6)', '1/2'], ['5 cm to mm', '50 mm'],
    ]) expect((await calculateMath({ operation: 'calculate', expression })).result).toBe(expected);
  });

  it('differentiates, simplifies, solves, and approximates definite integrals', async () => {
    expect((await calculateMath({ operation: 'differentiate', expression: 'x^3+2*x' })).result).toBe('3 * x ^ 2 + 2');
    expect((await calculateMath({ operation: 'simplify', expression: '2*x+3*x' })).result).toContain('5 * x');
    expect((await calculateMath({ operation: 'solve', expression: 'x^2-5*x+6=0' })).result).toMatch(/2, 3|3, 2/);
    expect((await calculateMath({ operation: 'integrate', expression: 'x^2', lower: 0, upper: 1 })).result).toContain('0.333333333333');
  });

  it('rejects unsafe syntax and missing figures', async () => {
    await expect(calculateMath({ operation: 'calculate', expression: 'import({evil:1})' })).rejects.toThrow();
    await expect(calculateMath({ operation: 'calculate', expression: 'x=5' })).rejects.toThrow();
    await expect(calculateMath({ operation: 'calculate', expression: '1/0' })).rejects.toThrow();
    await expect(calculateMath({ operation: 'solve', expression: 'x^4=0' })).rejects.toThrow();
  });
});
