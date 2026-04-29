/**
 * 模块 2 核心计算：现金流与理想生活目标分析
 *
 * 涵盖：结余计算、储蓄率判定、收支缺口、终极资产包（4% 规则）
 */

export interface CashFlowInputs {
  /** 年收入（若输入月收入，请先 × 12） */
  annualIncome: number;
  /** 当前年度总开支 */
  annualSpend: number;
  /** 理想/退休目标年度开支 */
  targetAnnualSpend: number;
}

export type SavingsRateLevel = "critical" | "low" | "approaching" | "ideal" | "excellent";

export interface CashFlowResult {
  annualSurplus: number;
  savingsRate: number;          // 0-1 之间的小数
  savingsRateLevel: SavingsRateLevel;
  incomeGap: number;            // 目标开支 - 当前收入（负值表示收入有结余）
  nestEggLow: number;           // 目标年开支 × 20（4.7% 提款率）
  nestEggHigh: number;          // 目标年开支 × 25（4% 提款率）
}

/** 储蓄率区间判定 */
function classifySavingsRate(rate: number): SavingsRateLevel {
  if (rate < 0)    return "critical";
  if (rate < 0.10) return "low";
  if (rate < 0.15) return "approaching";
  if (rate < 0.20) return "ideal";
  return "excellent";
}

/**
 * 储蓄率级别对应的中文提示
 */
export const SAVINGS_RATE_LABELS: Record<SavingsRateLevel, string> = {
  critical:   "入不敷出，需立即调整支出结构",
  low:        "储蓄率偏低（< 10%），建议优先提升",
  approaching: "接近目标区间（10%-15%），继续努力",
  ideal:      "理想区间（15%-20%），保持稳定",
  excellent:  "储蓄率优秀（> 20%），财富积累加速",
};

/**
 * 计算终极资产包范围（基于 4%-4.7% 安全提款率）
 * nestEggLow  = targetAnnualSpend × 20（对应 5% 提款率，偏保守估算）
 * nestEggHigh = targetAnnualSpend × 25（对应 4% 提款率，标准 FIRE 法则）
 */
export function calculateNestEggRange(targetAnnualSpend: number): { low: number; high: number } {
  return {
    low: targetAnnualSpend * 20,
    high: targetAnnualSpend * 25,
  };
}

// ─────────────────────────────────────────────────────────────
// 智能估算：退休首年开销预测
// 公式：E_ret = E_cur × R × (1 + i)^n
// ─────────────────────────────────────────────────────────────

export type ReplacementLevel = "basic" | "maintain" | "rich";

export const REPLACEMENT_PRESETS: Record<ReplacementLevel, { ratio: number; label: string; sub: string }> = {
  basic:    { ratio: 0.6, label: "基础养老", sub: "60%" },
  maintain: { ratio: 0.8, label: "维持现状", sub: "80%" },
  rich:     { ratio: 1.0, label: "充裕享受", sub: "100%" },
};

export interface SmartEstimateParams {
  currentAnnualSpend: number;
  currentAge: number;
  retirementAge: number;
  /** 退休消费替代率，如 0.8 表示退休后开销为退休前的 80% */
  replacementRatio: number;
  /** 长期年化通胀率，如 0.025 表示 2.5% */
  inflationRate: number;
}

export interface SmartEstimateResult {
  targetAnnualSpend: number;
  yearsToRetirement: number;
  inflationFactor: number;
  replacementRatio: number;
}

/**
 * 退休开销智能估算（终值公式）
 * E_ret = E_cur × R × (1 + i)^n
 */
export function smartEstimateRetirementSpend(params: SmartEstimateParams): SmartEstimateResult {
  const { currentAnnualSpend, currentAge, retirementAge, replacementRatio, inflationRate } = params;
  const n = Math.max(0, retirementAge - currentAge);
  const inflationFactor = Math.pow(1 + inflationRate, n);
  return {
    targetAnnualSpend: currentAnnualSpend * replacementRatio * inflationFactor,
    yearsToRetirement: n,
    inflationFactor,
    replacementRatio,
  };
}

/** 现金流分析核心入口 */
export function calculateCashFlow(inputs: CashFlowInputs): CashFlowResult {
  const annualSurplus = inputs.annualIncome - inputs.annualSpend;
  const savingsRate = inputs.annualIncome > 0 ? annualSurplus / inputs.annualIncome : 0;
  const savingsRateLevel = classifySavingsRate(savingsRate);
  const incomeGap = inputs.targetAnnualSpend - inputs.annualIncome;
  const { low: nestEggLow, high: nestEggHigh } = calculateNestEggRange(inputs.targetAnnualSpend);

  return {
    annualSurplus,
    savingsRate: Math.round(savingsRate * 10000) / 10000,
    savingsRateLevel,
    incomeGap,
    nestEggLow,
    nestEggHigh,
  };
}
