/**
 * 收入成长轨迹预测 & FIRE 达成路径模拟
 *
 * 收入曲线不再使用拍脑袋的「职业成长率」，而是锚定 Fidelity 官方表格中的
 * Median Income（30 / 40 / 50 / 60 / 70 岁），通过插值得到任意年龄的
 * 基准中位数收入，再按「相对当前年龄的倍数」缩放到用户自身收入水平。
 *
 * 这样可以保证：
 *  - /macro 中展示的 Fidelity 收入表 与 /cashflow 中 FIRE 模拟使用的是同一条曲线
 *  - 用户当前收入作为归一化起点，后续各年龄收入按 Fidelity 增长形态放大/缩放
 */

// ── Fidelity 收入锚点（Median Income） ─────────────────────────

export const FIDELITY_INCOME_ANCHORS: Array<{ age: number; medianIncome: number }> = [
  { age: 30, medianIncome: 52_002 },
  { age: 40, medianIncome: 61_970 },
  { age: 50, medianIncome: 65_000 },
  { age: 60, medianIncome: 62_001 },
  { age: 70, medianIncome: 63_455 },
];

/** 线性插值获得任意年龄对应的 Fidelity 中位数收入 */
export function medianIncomeAtAge(age: number): number {
  if (FIDELITY_INCOME_ANCHORS.length === 0) return 0;
  if (age <= FIDELITY_INCOME_ANCHORS[0].age) {
    return FIDELITY_INCOME_ANCHORS[0].medianIncome;
  }
  const last = FIDELITY_INCOME_ANCHORS[FIDELITY_INCOME_ANCHORS.length - 1];
  if (age >= last.age) {
    return last.medianIncome;
  }

  for (let i = 0; i < FIDELITY_INCOME_ANCHORS.length - 1; i++) {
    const a = FIDELITY_INCOME_ANCHORS[i];
    const b = FIDELITY_INCOME_ANCHORS[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age);
      return a.medianIncome + (b.medianIncome - a.medianIncome) * t;
    }
  }

  return last.medianIncome;
}

/**
 * 基于 Fidelity 中位数收入曲线推算指定年龄的预测收入：
 * - 当前年龄的中位数 income_base(cur) 作为 1x 基准
 * - 目标年龄的中位数 income_base(target) 作为 kx
 * - 用户当前收入 × (income_base(target) / income_base(cur)) 得到对应缩放
 */
export function projectIncomeAtAge(
  currentIncome: number,
  currentAge: number,
  targetAge: number,
): number {
  if (targetAge <= currentAge) return currentIncome;
  const baseCurrent = medianIncomeAtAge(currentAge);
  const baseTarget = medianIncomeAtAge(targetAge);
  if (baseCurrent <= 0) return currentIncome;
  const factor = baseTarget / baseCurrent;
  return currentIncome * factor;
}

/** Fidelity 标准里程碑年龄 */
export const LIFECYCLE_MILESTONE_AGES = [30, 35, 40, 45, 50, 55, 60];

export interface LifecycleIncomePoint {
  age: number;
  projectedIncome: number;
  /** 相对当前收入的累计增幅（百分比，如 27 表示 +27%） */
  cumulativeGrowthPct: number;
}

/**
 * 返回所有未来里程碑年龄对应的收入预测数组
 * 只返回大于 currentAge 的年龄
 */
export function getLifecycleIncomeProjections(
  currentIncome: number,
  currentAge: number,
): LifecycleIncomePoint[] {
  return LIFECYCLE_MILESTONE_AGES
    .filter((age) => age > currentAge)
    .map((age) => {
      const projected = projectIncomeAtAge(currentIncome, currentAge, age);
      return {
        age,
        projectedIncome: projected,
        cumulativeGrowthPct: (projected / currentIncome - 1) * 100,
      };
    });
}

// ── FIRE 路径模拟 ─────────────────────────────────────────────

export interface FIRESimulationParams {
  currentAge: number;
  /** 起始净资产（默认 0） */
  currentNetWorth: number;
  /** 当前年收入 */
  currentIncome: number;
  /** 当前储蓄率（0-1） */
  savingsRate: number;
  /** 4% 法则目标资产包 */
  nestEggTarget: number;
  /** 长期年化投资收益率（如 0.06） */
  investmentReturn: number;
  /** 最大模拟年龄（默认 75） */
  maxSimAge?: number;
}

export interface FIREYearPoint {
  age: number;
  projectedIncome: number;
  annualSavings: number;
  nestEgg: number;
  progressPct: number;
  isTargetYear?: boolean;
}

export interface FIRESimulationResult {
  /** 首次达成目标的年龄，null 表示在 maxSimAge 前未达成 */
  targetReachedAge: number | null;
  yearsToTarget: number | null;
  /** 各关键节点的完整路径 */
  path: FIREYearPoint[];
  targetNestEgg: number;
}

/**
 * 逐年模拟净资产积累，使用收入成长模型动态计算每年储蓄。
 *
 * 计算逻辑：
 *  nestEgg(n+1) = nestEgg(n) × (1 + investmentReturn) + income(age) × savingsRate
 *
 * income(age) 通过 projectIncomeAtAge 以职业成长模型推算。
 */
export function simulateFIREPath(params: FIRESimulationParams): FIRESimulationResult {
  const {
    currentAge,
    currentNetWorth,
    currentIncome,
    savingsRate,
    nestEggTarget,
    investmentReturn,
    maxSimAge = 75,
  } = params;

  let nestEgg = currentNetWorth;
  let targetReachedAge: number | null = null;
  const rawPath: FIREYearPoint[] = [];

  for (let age = currentAge; age <= maxSimAge; age++) {
    const projectedIncome = projectIncomeAtAge(currentIncome, currentAge, age);
    const annualSavings = Math.max(0, projectedIncome * savingsRate);
    nestEgg = nestEgg * (1 + investmentReturn) + annualSavings;
    const progressPct = Math.min(100, (nestEgg / nestEggTarget) * 100);

    rawPath.push({ age, projectedIncome, annualSavings, nestEgg, progressPct });

    if (targetReachedAge === null && nestEgg >= nestEggTarget) {
      targetReachedAge = age;
      break;
    }
  }

  // 过滤为里程碑关键节点（+ 目标达成年）
  const milestoneSet = new Set(LIFECYCLE_MILESTONE_AGES);
  const keyPoints: FIREYearPoint[] = [];
  for (const pt of rawPath) {
    if (milestoneSet.has(pt.age) || pt.age === currentAge || pt.age === targetReachedAge) {
      keyPoints.push({
        ...pt,
        isTargetYear: pt.age === targetReachedAge,
      });
    }
  }
  // 若 targetReachedAge 不在 rawPath 末尾但在 milestoneSet 里，去重
  const seen = new Set<number>();
  const dedupedPath = keyPoints.filter((p) => {
    if (seen.has(p.age)) return false;
    seen.add(p.age);
    return true;
  });

  return {
    targetReachedAge,
    yearsToTarget: targetReachedAge !== null ? targetReachedAge - currentAge : null,
    path: dedupedPath,
    targetNestEgg: nestEggTarget,
  };
}
