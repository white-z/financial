/**
 * 模块 4：极简版全景财务诊断逻辑
 *
 * 规则引擎：综合宏观体检与现金流数据，输出诊断结论和阶段性策略
 */

import type { MacroResult } from "./ppp";
import type { CashFlowResult } from "./cashflow";

export type HealthStatus = "ahead" | "on_track" | "behind";
export type EmergencyFundStatus = "insufficient" | "adequate" | "comfortable";

export interface SummaryInputs {
  macroResult: MacroResult;
  cashFlowResult: CashFlowResult;
  /** 用户年龄（影响阶段性策略） */
  age: number;
  /** 现金及等价物（当地货币，用于应急金判断） */
  cashAmount: number;
  /** 月度基本生活开支（当地货币） */
  monthlyEssentialSpend: number;
  /** 消费类负债利率列表（如信用卡 0.18、消费贷 0.12），用于排雷 */
  liabilityRates: number[];
}

export interface SummaryResult {
  /** 净资产健康度 */
  healthStatus: HealthStatus;
  healthLabel: string;
  /** 负债风险：是否存在利率 > 10% 的恶性负债 */
  hasHighRateDebt: boolean;
  debtRiskMessage: string;
  /** 应急金充足度 */
  emergencyFundStatus: EmergencyFundStatus;
  emergencyFundMonths: number;
  emergencyFundMessage: string;
  /** 年龄段核心策略 */
  ageDirective: string;
}

/** 净资产健康度判断：基于 PPP 净资产与同龄人中位数的比例 */
function evaluateHealthStatus(netWorthPPP: number, peerMedian: number): HealthStatus {
  if (peerMedian <= 0) return "on_track";
  const ratio = netWorthPPP / peerMedian;
  if (ratio >= 1.2) return "ahead";
  if (ratio >= 0.8) return "on_track";
  return "behind";
}

const HEALTH_LABELS: Record<HealthStatus, string> = {
  ahead:    "超前 — 资产积累领先同龄人，保持策略",
  on_track: "达标 — 处于正常轨道，继续稳步积累",
  behind:   "落后 — 净资产低于同龄基准，需加速积累",
};

/** 负债排雷：检测是否存在利率 > 10% 的恶性负债 */
function checkDebtRisk(liabilityRates: number[]): boolean {
  return liabilityRates.some((r) => r > 0.10);
}

/** 应急金充足度：以现金覆盖月度生活开支的月数判断 */
function evaluateEmergencyFund(cashAmount: number, monthlySpend: number): {
  status: EmergencyFundStatus;
  months: number;
} {
  if (monthlySpend <= 0) return { status: "comfortable", months: Infinity };
  const months = cashAmount / monthlySpend;
  const status: EmergencyFundStatus =
    months < 3 ? "insufficient" : months <= 6 ? "adequate" : "comfortable";
  return { status, months: Math.round(months * 10) / 10 };
}

const EMERGENCY_MESSAGES: Record<EmergencyFundStatus, string> = {
  insufficient: "应急金严重不足（< 3 个月），建议优先补充至 3 个月开支",
  adequate:     "应急金基本达标（3-6 个月），可维持当前水平",
  comfortable:  "应急金充裕（> 6 个月），财务安全垫充足",
};

/** 年龄段策略文案 */
function getAgeDirective(age: number): string {
  if (age < 30) {
    return "20 代首要任务：大幅提升储蓄率（目标 ≥ 20%），持续投资自身技能与职业发展，建立第一桶金基础。";
  }
  if (age < 40) {
    return "30 代核心警惕：防御「生活方式膨胀」，在收入增长时保持储蓄率不下滑，同步扩大投资规模。";
  }
  if (age < 50) {
    return "40 代重心转移：开始将部分风险资产逐步向固收与稳健类配置，同时优先偿还高息负债。";
  }
  if (age < 60) {
    return "50 代保值优先：加大固收类与防御性资产比重，详细规划退休所需资产包与提款节奏。";
  }
  return "60 代及以上：专注现金流稳定输出与支出结构精细化管理，控制大额非必要支出。";
}

/** 全景诊断核心入口 */
export function generateSummary(inputs: SummaryInputs): SummaryResult {
  const { macroResult, cashFlowResult, age, cashAmount, monthlyEssentialSpend, liabilityRates } = inputs;

  const healthStatus = evaluateHealthStatus(macroResult.netWorthPPP, macroResult.peerMedian);
  const healthLabel = HEALTH_LABELS[healthStatus];

  const hasHighRateDebt = checkDebtRisk(liabilityRates);
  const debtRiskMessage = hasHighRateDebt
    ? "⚠ 检测到利率 > 10% 的高息负债（如信用卡/消费贷），建议在投资前优先全额结清。"
    : "负债结构健康，无高息恶性负债。";

  const { status: emergencyFundStatus, months: emergencyFundMonths } =
    evaluateEmergencyFund(cashAmount, monthlyEssentialSpend);
  const emergencyFundMessage = EMERGENCY_MESSAGES[emergencyFundStatus];

  const ageDirective = getAgeDirective(age);

  // 将 cashFlowResult 纳入诊断的主要参考（储蓄率）—— 后续 UI 可基于此附加提示
  void cashFlowResult;

  return {
    healthStatus,
    healthLabel,
    hasHighRateDebt,
    debtRiskMessage,
    emergencyFundStatus,
    emergencyFundMonths,
    emergencyFundMessage,
    ageDirective,
  };
}

export { HEALTH_LABELS, EMERGENCY_MESSAGES };
