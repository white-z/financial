/**
 * 模块 1 辅助计算：Fidelity 生命周期净资产目标法则
 *
 * 规则：以当前年薪为基础，各年龄段对应目标倍数：
 * 30岁：1×，40岁：3×，50岁：6×，60岁：8×，65-70岁退休：10-20×
 */

export interface LifecycleTarget {
  age: number;
  label: string;
  multiplierMin: number;
  multiplierMax: number | null;
  targetMin: number;
  targetMax: number | null;
}

export interface LifecycleResult {
  annualIncome: number;
  targets: LifecycleTarget[];
  /** 当前年龄对应插值目标（用于状态判断） */
  currentTarget: number;
}

const FIDELITY_MILESTONES: Array<{
  age: number;
  label: string;
  multiplierMin: number;
  multiplierMax: number | null;
}> = [
  { age: 30, label: "30 岁",    multiplierMin: 1,  multiplierMax: null },
  { age: 40, label: "40 岁",    multiplierMin: 3,  multiplierMax: null },
  { age: 50, label: "50 岁",    multiplierMin: 6,  multiplierMax: null },
  { age: 60, label: "60 岁",    multiplierMin: 8,  multiplierMax: null },
  { age: 65, label: "65 岁退休", multiplierMin: 10, multiplierMax: 20  },
];

/**
 * 根据当前年龄在里程碑之间线性插值目标倍数
 * 低于 30 岁按 0 → 1× 线性，高于 65 岁按 10-20× 返回低值
 */
function interpolateCurrentMultiplier(age: number): number {
  if (age <= 22) return 0;
  if (age <= 30) return ((age - 22) / 8) * 1;
  if (age <= 40) return 1 + ((age - 30) / 10) * 2;
  if (age <= 50) return 3 + ((age - 40) / 10) * 3;
  if (age <= 60) return 6 + ((age - 50) / 10) * 2;
  if (age <= 65) return 8 + ((age - 60) / 5) * 2;
  return 10;
}

/** 计算所有里程碑的目标净资产，以及当前年龄对应插值目标 */
export function calculateLifecycleTargets(annualIncome: number, currentAge: number): LifecycleResult {
  const targets: LifecycleTarget[] = FIDELITY_MILESTONES.map((m) => ({
    age: m.age,
    label: m.label,
    multiplierMin: m.multiplierMin,
    multiplierMax: m.multiplierMax,
    targetMin: annualIncome * m.multiplierMin,
    targetMax: m.multiplierMax !== null ? annualIncome * m.multiplierMax : null,
  }));

  const currentMultiplier = interpolateCurrentMultiplier(currentAge);
  const currentTarget = annualIncome * currentMultiplier;

  return { annualIncome, targets, currentTarget };
}
