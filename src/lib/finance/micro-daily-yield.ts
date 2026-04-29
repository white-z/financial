/**
 * 工具 A：每日/万份收益计算器
 *
 * 适用于货币基金、短债基金等按日计收益产品
 */

export interface DailyYieldInputs {
  /** 本金金额（元） */
  principal: number;
  /** 年化收益率（以小数表示，如 3% 输入 0.03） */
  annualRate: number;
  /** 计算天数（正整数） */
  days: number;
}

export interface DailyYieldResult {
  /** 万份收益（元/万份） = 年化收益率 ÷ 365 × 10000 */
  unitYield: number;
  /** 复利累计后的总金额 */
  totalAmount: number;
  /** 累计收益 = 总金额 - 本金 */
  profit: number;
  /** 实际收益率（占本金的百分比，小数形式） */
  actualRate: number;
}

/** 万份收益计算（货币基金展示用） */
export function calculateUnitYield(annualRate: number): number {
  return (annualRate / 365) * 10000;
}

/** 复利累计收益计算 */
export function calculateDailyYield(inputs: DailyYieldInputs): DailyYieldResult {
  const { principal, annualRate, days } = inputs;

  if (principal < 0) throw new Error("本金不能为负数");
  if (annualRate < 0) throw new Error("年化收益率不能为负数");
  if (!Number.isInteger(days) || days <= 0) throw new Error("计算天数必须为正整数");

  const unitYield = calculateUnitYield(annualRate);
  // 复利公式：P × (1 + r/365)^n
  const totalAmount = principal * Math.pow(1 + annualRate / 365, days);
  const profit = totalAmount - principal;
  const actualRate = principal > 0 ? profit / principal : 0;

  return {
    unitYield: Math.round(unitYield * 10000) / 10000,
    totalAmount: Math.round(totalAmount * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    actualRate: Math.round(actualRate * 1000000) / 1000000,
  };
}
