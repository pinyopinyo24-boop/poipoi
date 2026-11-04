import { describe, expect, it } from 'vitest';
import { parseUnitCostVarianceRequest, formatUnitCostVariance } from '../core/CostVarianceRequest';

describe('explicit cost variance questions', () => {
  it('extracts the labeled figures and formats a consistent answer', () => {
    const input = parseUnitCostVarianceRequest('見積単価127円、実績単価139円、数量17個です。原価差異額と有利・不利を、計算式付きで答えてください。');
    expect(input).toEqual({ estimatedUnitCost: 127, actualUnitCost: 139, quantity: 17 });
    const answer = formatUnitCostVariance(input!, 139 - 127, (139 - 127) * 17);
    expect(answer).toContain('原価差異額は204円（不利）');
    expect(answer).toContain('12円 × 17個 = 204円');
  });

  it('does not calculate when figures are missing or calculation is forbidden', () => {
    expect(parseUnitCostVarianceRequest('見積単価127円、数量17個の原価差異を計算して')).toBeNull();
    expect(parseUnitCostVarianceRequest('見積単価127円、実績単価139円、数量17個の原価差異は計算しないで')).toBeNull();
  });

  it('handles a favorable variance and zero variance', () => {
    const input = { estimatedUnitCost: 139, actualUnitCost: 127, quantity: 17 };
    expect(formatUnitCostVariance(input, -12, -204)).toContain('204円（有利）');
    expect(formatUnitCostVariance(input, 0, 0)).toContain('0円（差異なし）');
  });
});
