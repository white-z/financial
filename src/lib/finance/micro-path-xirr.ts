/**
 * 工具 B：投资路径与定投补仓计算器
 *
 * 支持多次不规则现金流的 XIRR（扩展内部收益率）计算
 * 采用牛顿-拉弗森迭代法求解年化收益率
 */

export interface CashFlow {
  /** 日期 */
  date: Date;
  /**
   * 现金流金额：
   * - 投入为负数（如投入 1000 元，amount = -1000）
   * - 最终回收为正数（如回收 1200 元，amount = 1200）
   */
  amount: number;
}

export interface PathXirrInputs {
  /** 有序的现金流列表（含初始投入与后续补仓，使用负值） */
  cashFlows: CashFlow[];
  /** 截止日期的总价值（正数，作为最终回收金额） */
  finalValue: number;
  /** 截止日期 */
  endDate: Date;
}

export interface PathXirrResult {
  /** 持有天数（从首次投入到截止日） */
  holdingDays: number;
  /** 累计投入本金总和（正数） */
  totalInvested: number;
  /** 累计收益 = 期末总价值 - 投入本金 */
  profit: number;
  /** XIRR 年化收益率（小数形式） */
  xirrRate: number;
  /** 本金占比（0-1） */
  principalRatio: number;
  /** 收益占比（0-1） */
  profitRatio: number;
}

const MAX_ITERATIONS = 100;
const TOLERANCE = 1e-7;

/**
 * 计算给定利率 r 下的 XIRR NPV（净现值）
 * 基准日期为 cashFlows 中的第一个日期
 */
function npv(cashFlows: CashFlow[], rate: number): number {
  const t0 = cashFlows[0].date.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  return cashFlows.reduce((sum, cf) => {
    const days = (cf.date.getTime() - t0) / msPerDay;
    return sum + cf.amount / Math.pow(1 + rate, days / 365);
  }, 0);
}

/**
 * NPV 对 rate 的导数（用于牛顿法迭代）
 */
function npvDerivative(cashFlows: CashFlow[], rate: number): number {
  const t0 = cashFlows[0].date.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  return cashFlows.reduce((sum, cf) => {
    const days = (cf.date.getTime() - t0) / msPerDay;
    const t = days / 365;
    return sum + (-t * cf.amount) / Math.pow(1 + rate, t + 1);
  }, 0);
}

/**
 * 牛顿-拉弗森法求解 XIRR
 * @param cashFlows 完整现金流列表（含最终回收）
 * @param guess     初始猜测值（默认 0.1）
 */
export function calculateXIRR(cashFlows: CashFlow[], guess = 0.1): number {
  if (cashFlows.length < 2) throw new Error("至少需要两个现金流");

  let rate = guess;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const f = npv(cashFlows, rate);
    const df = npvDerivative(cashFlows, rate);

    if (Math.abs(df) < 1e-12) break; // 导数趋近 0，停止迭代

    const newRate = rate - f / df;
    if (Math.abs(newRate - rate) < TOLERANCE) return newRate;
    rate = newRate;

    // 防止 rate 发散到无效区间
    if (rate <= -1) rate = -0.999;
  }
  return rate;
}

/** 日期差（天数） */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

/** 投资路径 XIRR 计算核心入口 */
export function calculatePathXirr(inputs: PathXirrInputs): PathXirrResult {
  const { cashFlows, finalValue, endDate } = inputs;

  if (cashFlows.length === 0) throw new Error("现金流列表不能为空");
  if (finalValue < 0) throw new Error("期末总价值不能为负数");

  // 总投入本金（绝对值之和）
  const totalInvested = cashFlows.reduce((sum, cf) => sum + Math.abs(Math.min(cf.amount, 0)), 0);
  const profit = finalValue - totalInvested;

  // 构建完整现金流列表（添加期末回收）
  const allFlows: CashFlow[] = [
    ...cashFlows.map((cf) => ({ date: cf.date, amount: cf.amount })),
    { date: endDate, amount: finalValue },
  ];

  const xirrRate = calculateXIRR(allFlows);

  const firstDate = cashFlows[0].date;
  const holdingDays = daysBetween(firstDate, endDate);

  const total = totalInvested + profit;
  const principalRatio = total > 0 ? totalInvested / total : 1;
  const profitRatio = total > 0 ? profit / total : 0;

  return {
    holdingDays,
    totalInvested: Math.round(totalInvested * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    xirrRate: Math.round(xirrRate * 1000000) / 1000000,
    principalRatio: Math.round(principalRatio * 10000) / 10000,
    profitRatio: Math.round(profitRatio * 10000) / 10000,
  };
}
