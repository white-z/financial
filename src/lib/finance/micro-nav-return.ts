/**
 * 工具 C：净值化年化收益率计算器
 *
 * 适用于基金、ETF 等净值产品的持有期绩效计算
 */

export interface NavReturnInputs {
  /** 起始日期 */
  startDate: Date;
  /** 期初单位净值（如 1.0000） */
  startNav: number;
  /** 结束日期 */
  endDate: Date;
  /** 期末单位净值 */
  endNav: number;
}

export interface NavReturnResult {
  /** 持有天数 */
  holdingDays: number;
  /** 总收益率（小数形式，如 0.15 表示 15%） */
  totalReturn: number;
  /** 年化收益率（小数形式） */
  annualizedReturn: number;
}

/** 计算两个日期之间的自然天数差 */
export function dateDiffInDays(startDate: Date, endDate: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/** 净值年化收益率计算 */
export function calculateNavReturn(inputs: NavReturnInputs): NavReturnResult {
  const { startDate, startNav, endDate, endNav } = inputs;

  if (startNav <= 0) throw new Error("期初净值必须大于 0");
  if (endNav <= 0) throw new Error("期末净值必须大于 0");

  const holdingDays = dateDiffInDays(startDate, endDate);
  if (holdingDays <= 0) throw new Error("结束日期必须晚于开始日期");

  const totalReturn = (endNav - startNav) / startNav;
  // 年化公式：(期末净值 / 期初净值)^(365/持有天数) - 1
  const annualizedReturn = Math.pow(endNav / startNav, 365 / holdingDays) - 1;

  return {
    holdingDays,
    totalReturn: Math.round(totalReturn * 1000000) / 1000000,
    annualizedReturn: Math.round(annualizedReturn * 1000000) / 1000000,
  };
}
