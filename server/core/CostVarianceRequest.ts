type UnitCostInput = { estimatedUnitCost: number; actualUnitCost: number; quantity: number };

// Only use the calculator when the user supplied all three labeled figures.
export function parseUnitCostVarianceRequest(request: string): UnitCostInput | null {
  if (!/(?:原価差異|差異額)/u.test(request) || !/(?:計算|算出|求めて|答えて)/u.test(request) ||
      /(?:計算|算出|回答)(?:は|を)?(?:しない|しなくて|不要)/u.test(request)) return null;

  const read = (label: string) => {
    const match = request.match(new RegExp(`(?:${label})[：:=\\s]*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*円?`, 'u'));
    return match ? Number(match[1].replaceAll(',', '')) : NaN;
  };
  const input = {
    estimatedUnitCost: read('見積(?:もり)?(?:単価|原価)?|予定原価'),
    actualUnitCost: read('実際(?:単価|原価)?|実績(?:単価|原価)?'),
    quantity: read('数量|個数|生産数'),
  };
  return Object.values(input).every(Number.isFinite) && input.estimatedUnitCost >= 0 &&
    input.actualUnitCost >= 0 && input.quantity > 0 ? input : null;
}

export function formatUnitCostVariance(input: UnitCostInput, variancePerUnit: number, totalVariance: number): string {
  const direction = totalVariance > 0 ? '不利' : totalVariance < 0 ? '有利' : '差異なし';
  return `原価差異額は${Math.abs(totalVariance)}円（${direction}）です。\n` +
    `計算式：（実績単価${input.actualUnitCost}円 − 見積単価${input.estimatedUnitCost}円）× 数量${input.quantity}個` +
    ` = ${variancePerUnit}円 × ${input.quantity}個 = ${totalVariance}円。`;
}
