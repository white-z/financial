/**
 * 模块 1 核心计算：PPP 标准化与同龄人水位对比
 *
 * 基准数据来源：Fidelity 2026 官方表格（Median Net Worth）
 * 与 macro 页面「收入成长轨迹」数据来源一致
 */

export interface AssetInputs {
  cash: number;           // 现金及等价物
  liquidInvest: number;   // 流动投资资产
  fixedIncome: number;    // 固收资产
  property: number;       // 房产及实物资产
}

export interface LiabilityInputs {
  consumption: number;    // 消费类负债（信用卡等）
  investment: number;     // 投资类负债（房贷等）
  student: number;        // 助学贷款
}

export interface MacroInputs {
  age: number;
  annualIncome: number;
  assets: AssetInputs;
  liabilities: LiabilityInputs;
  /** PPP 折算率：当地货币 / 美元（如中国约 3.5~4.0）*/
  pppRate: number;
}

export interface MacroResult {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  netWorthPPP: number;   // PPP 折算后等效美元净资产
  incomePPP: number;     // PPP 折算后等效美元年收入
  agePercentile: number; // 同龄人百分位（0-100）
  peerMedian: number;    // 同龄人中位数（美元）
}

/**
 * 2026 年各年龄段净资产基准数据（美元，PPP 调整后）
 * 来源：Fidelity 官方表格（Median Net Worth 列）
 * 字段：[p25, p50(median), p75, p90]；p25/p75/p90 由中位数按典型分布比例估算
 */
const AGE_BRACKETS: Record<string, [number, number, number, number]> = {
  "20s": [2_676,  6_689,  13_378,  23_412],   // median $6,689
  "30s": [9_803, 24_508,  49_016,  85_778],   // median $24,508
  "40s": [30_592, 76_479, 152_958, 267_677],  // median $76,479
  "50s": [77_186, 192_964, 385_928, 675_374], // median $192,964
  "60s": [116_368, 290_920, 581_840, 1_018_220], // median $290,920
  "70+": [116_368, 290_920, 581_840, 1_018_220], // 沿用 60s（Fidelity 表无 70s 净资产）
};

function getAgeBracket(age: number): string {
  if (age < 30) return "20s";
  if (age < 40) return "30s";
  if (age < 50) return "40s";
  if (age < 60) return "50s";
  if (age < 70) return "60s";
  return "70+";
}

/**
 * 基于 PPP 折算后净资产，以分段线性插值估算同龄人百分位
 * 区间：[0, p25] → 0-25；[p25, p50] → 25-50；[p50, p75] → 50-75；[p75, p90] → 75-90；[p90, ∞] → 90-100
 */
function interpolatePercentile(value: number, brackets: [number, number, number, number]): number {
  const [p25, p50, p75, p90] = brackets;

  if (value <= 0) return 0;
  if (value <= p25) return (value / p25) * 25;
  if (value <= p50) return 25 + ((value - p25) / (p50 - p25)) * 25;
  if (value <= p75) return 50 + ((value - p50) / (p75 - p50)) * 25;
  if (value <= p90) return 75 + ((value - p75) / (p90 - p75)) * 15;
  // 超过 p90 后用对数缩放，上限 100
  const excess = Math.log10(value / p90 + 1);
  return Math.min(100, 90 + excess * 10);
}

/** 计算总资产 */
export function calculateTotalAssets(assets: AssetInputs): number {
  return assets.cash + assets.liquidInvest + assets.fixedIncome + assets.property;
}

/** 计算总负债 */
export function calculateTotalLiabilities(liabilities: LiabilityInputs): number {
  return liabilities.consumption + liabilities.investment + liabilities.student;
}

/** 净资产 */
export function calculateNetWorth(totalAssets: number, totalLiabilities: number): number {
  return totalAssets - totalLiabilities;
}

/** PPP 标准化：将当地金额折算为等效美元 */
export function normalizePPP(localAmount: number, pppRate: number): number {
  if (pppRate <= 0) throw new Error("PPP 折算率必须大于 0");
  return localAmount / pppRate;
}

/** 宏观体检核心入口：返回完整计算结果 */
export function calculateMacroResult(inputs: MacroInputs): MacroResult {
  const totalAssets = calculateTotalAssets(inputs.assets);
  const totalLiabilities = calculateTotalLiabilities(inputs.liabilities);
  const netWorth = calculateNetWorth(totalAssets, totalLiabilities);
  const netWorthPPP = normalizePPP(netWorth, inputs.pppRate);
  const incomePPP = normalizePPP(inputs.annualIncome, inputs.pppRate);

  const bracket = getAgeBracket(inputs.age);
  const benchmarks = AGE_BRACKETS[bracket];
  const agePercentile = interpolatePercentile(netWorthPPP, benchmarks);
  const peerMedian = benchmarks[1];

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    netWorthPPP,
    incomePPP,
    agePercentile: Math.round(agePercentile * 10) / 10,
    peerMedian,
  };
}

/** 导出年龄段基准数据（供 UI 展示参考表格使用）*/
export { AGE_BRACKETS, getAgeBracket };
