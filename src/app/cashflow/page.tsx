"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader, FormSection, InputField, MetricCard, StatusBadge, ResultPanel } from "@/components/ui";
import { HistoryPanel, fmtTime, type HistoryItem } from "@/components/HistoryPanel";
import {
  calculateCashFlow,
  smartEstimateRetirementSpend,
  REPLACEMENT_PRESETS,
  SAVINGS_RATE_LABELS,
  type CashFlowResult,
  type ReplacementLevel,
} from "@/lib/finance/cashflow";
import { simulateFIREPath, type FIRESimulationResult } from "@/lib/finance/income-projection";
import { fmtWan, fmtPct, fmtSigned } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  saveCashflowAction,
  listCashflowsAction,
  getCashflowByIdAction,
  deleteCashflowAction,
} from "@/app/actions/cashflow";
import { getLatestMacroCheckAction } from "@/app/actions/macro";
import type { CashflowRow } from "@/lib/supabase/repositories/cashflow";
import backtesting from "@/static/backtesting.json";
import { Slider } from "@/components/slider";

type BacktestingPoint = { Date: string; Close: string };
type BacktestingMap = Record<string, BacktestingPoint[]>;

function parseClose(p: BacktestingPoint): number {
  return Number(String(p.Close).replace(/,/g, ""));
}

function extractYear(dateStr: string): number {
  const idx = dateStr.indexOf("年");
  if (idx === -1) return NaN;
  return Number(dateStr.slice(0, idx));
}

function getSp500SeriesChronological(): BacktestingPoint[] {
  const map = backtesting as BacktestingMap;
  const raw = map["s&p500"] ?? [];
  // 源数据为最近在前、最早在后，这里反转为按时间正序（最早 → 最新）
  return raw.slice().reverse();
}

function computeBacktestStats(
  seriesChron: BacktestingPoint[],
  startYear: number,
  endYear: number,
): {
  cagr: number | null;
  maxDrawdown: number | null; // 0-1 之间的正数，表示最大回撤比例
  actualYears: number | null;
} {
  if (!seriesChron || seriesChron.length < 2) {
    return { cagr: null, maxDrawdown: null, actualYears: null };
  }
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || startYear >= endYear) {
    return { cagr: null, maxDrawdown: null, actualYears: null };
  }

  const window = seriesChron.filter((pt) => {
    const y = extractYear(pt.Date);
    return Number.isFinite(y) && y >= startYear && y <= endYear;
  });

  if (window.length < 2) {
    return { cagr: null, maxDrawdown: null, actualYears: null };
  }

  const vStart = parseClose(window[0]);
  const vEnd = parseClose(window[window.length - 1]);
  if (!vStart || !vEnd || vStart <= 0) {
    return { cagr: null, maxDrawdown: null, actualYears: null };
  }

  const yearsActual = extractYear(window[window.length - 1].Date) - extractYear(window[0].Date);
  const cagr = yearsActual > 0 ? Math.pow(vEnd / vStart, 1 / yearsActual) - 1 : null;

  // 最大回撤：基于价格路径的峰值-谷值百分比
  let peak = vStart;
  let maxDD = 0; // 负数
  for (const pt of window) {
    const price = parseClose(pt);
    if (price > peak) {
      peak = price;
    }
    const dd = price / peak - 1; // <=0
    if (dd < maxDD) {
      maxDD = dd;
    }
  }

  const maxDrawdown = -maxDD; // 转为正数比例
  return {
    cagr: cagr ?? null,
    maxDrawdown: isFinite(maxDrawdown) ? maxDrawdown : null,
    actualYears: yearsActual,
  };
}

// ─── 表单状态 ────────────────────────────────────────────────
interface FormState {
  annualIncome: string;
  annualSpend: string;
  /** 当前年龄（始终显示，智能模式必填，FIRE 模拟可选） */
  currentAge: string;
  /** 当前净资产（可选，用于 FIRE 路径起始值，可从模块01导入） */
  currentNetWorth: string;
  /** 长期投资年化收益率，默认 6% */
  investmentReturn: string;
  targetAnnualSpend: string;   // 自定义模式下由用户输入
  targetMode: "custom" | "smart";
  retirementAge: string;
  replacementLevel: ReplacementLevel;
  inflationRate: string;       // 百分比字符串，如 "2.5"
}

const INITIAL: FormState = {
  annualIncome: "",
  annualSpend: "",
  currentAge: "",
  currentNetWorth: "",
  investmentReturn: "6",
  targetAnnualSpend: "",
  targetMode: "smart",
  retirementAge: "60",
  replacementLevel: "maintain",
  inflationRate: "2.5",
};

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.annualIncome || Number(f.annualIncome) <= 0) e.annualIncome = "请输入正数年收入";
  if (!f.annualSpend || Number(f.annualSpend) < 0)   e.annualSpend = "请输入有效年度开支";
  if (f.targetMode === "smart") {
    const age    = Number(f.currentAge);
    const retAge = Number(f.retirementAge);
    if (!f.currentAge || isNaN(age) || age < 18 || age > 80) e.currentAge = "请输入 18–80 之间的年龄";
    if (!f.retirementAge || isNaN(retAge) || retAge <= age || retAge > 90) e.retirementAge = "退休年龄须大于当前年龄且 ≤ 90";
  } else {
    if (!f.targetAnnualSpend || Number(f.targetAnnualSpend) <= 0) e.targetAnnualSpend = "请输入目标年度开支";
  }
  return e;
}

const DB_ENABLED = isSupabaseConfigured();

// ─── 格式化整数人民币 ────────────────────────────────────────
function fmtRMB(n: number) {
  return "¥" + Math.round(n).toLocaleString("zh-CN");
}

export default function CashFlowPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [result, setResult] = useState<CashFlowResult | null>(null);
  const [sp500YearRangeRaw, setSp500YearRangeRaw] = useState<[number, number] | null>(null);

  // DB 状态
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | undefined>();
  const [deletingId, setDeletingId] = useState<string | undefined>();

  // 导入模块01状态
  const [isMacroImporting, setIsMacroImporting] = useState(false);
  const [macroImportMsg, setMacroImportMsg] = useState<string | null>(null);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  // ─── 智能估算推导（纯派生，不写回 form state） ───────────
  const smartEstimate = useMemo(() => {
    if (form.targetMode !== "smart") return null;
    const spend  = Number(form.annualSpend);
    const age    = Number(form.currentAge);
    const retAge = Number(form.retirementAge);
    const infl   = Number(form.inflationRate) / 100;
    const ratio  = REPLACEMENT_PRESETS[form.replacementLevel].ratio;
    if (!spend || spend <= 0 || !age || age < 18 || retAge <= age) return null;
    return smartEstimateRetirementSpend({
      currentAnnualSpend: spend,
      currentAge: age,
      retirementAge: retAge,
      replacementRatio: ratio,
      inflationRate: infl,
    });
  }, [form.targetMode, form.annualSpend, form.currentAge, form.retirementAge, form.replacementLevel, form.inflationRate]);

  // 当前有效的目标开支（计算时使用）
  const effectiveTargetSpend = form.targetMode === "smart" && smartEstimate
    ? smartEstimate.targetAnnualSpend
    : Number(form.targetAnnualSpend);

  const sp500SeriesChron = useMemo(() => getSp500SeriesChronological(), []);
  const sp500YearRange = useMemo(() => {
    if (!sp500SeriesChron.length) return null;
    const firstYear = extractYear(sp500SeriesChron[0].Date);
    const lastYear = extractYear(sp500SeriesChron[sp500SeriesChron.length - 1].Date);
    if (!Number.isFinite(firstYear) || !Number.isFinite(lastYear)) return null;
    return { min: firstYear, max: lastYear };
  }, [sp500SeriesChron]);

  const effectiveStartYear = useMemo(() => {
    if (!sp500YearRange) return null;
    if (sp500YearRangeRaw) return sp500YearRangeRaw[0];
    const proposed = sp500YearRange.max - 30;
    return Math.max(sp500YearRange.min, proposed);
  }, [sp500YearRange, sp500YearRangeRaw]);

  const effectiveEndYear = useMemo(() => {
    if (!sp500YearRange) return null;
    if (sp500YearRangeRaw) return sp500YearRangeRaw[1];
    return sp500YearRange.max;
  }, [sp500YearRange, sp500YearRangeRaw]);

  const sp500Stats = useMemo(() => {
    if (!sp500YearRange || effectiveStartYear === null || effectiveEndYear === null) {
      return { cagr: null, maxDrawdown: null, actualYears: null };
    }
    return computeBacktestStats(sp500SeriesChron, effectiveStartYear, effectiveEndYear);
  }, [sp500SeriesChron, sp500YearRange, effectiveStartYear, effectiveEndYear]);

  // ─── FIRE 路径模拟（依赖 result 及年龄参数） ──────────────
  const fireSimulation = useMemo<FIRESimulationResult | null>(() => {
    if (!result) return null;
    const age = Number(form.currentAge);
    if (!age || age < 18 || age > 80) return null;
    return simulateFIREPath({
      currentAge: age,
      currentNetWorth: Number(form.currentNetWorth) || 0,
      currentIncome: Number(form.annualIncome),
      savingsRate: result.savingsRate,
      nestEggTarget: result.nestEggHigh,
      investmentReturn: (Number(form.investmentReturn) || 6) / 100,
      maxSimAge: 75,
    });
  }, [result, form.currentAge, form.currentNetWorth, form.annualIncome, form.investmentReturn]);

  // ─── 计算 ────────────────────────────────────────────────
  function handleCalc() {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setResult(calculateCashFlow({
      annualIncome: Number(form.annualIncome),
      annualSpend:  Number(form.annualSpend),
      targetAnnualSpend: effectiveTargetSpend,
    }));
    setSavedId(null);
  }

  // ─── 保存 ────────────────────────────────────────────────
  async function handleSave() {
    if (!result || !DB_ENABLED) return;
    setIsSaving(true);
    const res = await saveCashflowAction({
      annual_income:       Number(form.annualIncome),
      annual_spend:        Number(form.annualSpend),
      target_annual_spend: effectiveTargetSpend,
      savings_rate:        result.savingsRate,
      savings_rate_level:  result.savingsRateLevel,
      annual_surplus:      result.annualSurplus,
      income_gap:          result.incomeGap,
      nest_egg_low:        result.nestEggLow,
      nest_egg_high:       result.nestEggHigh,
    });
    setIsSaving(false);
    if (res.success) { setSavedId(res.data.id); loadHistory(); }
  }

  // ─── 历史 ────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!DB_ENABLED) return;
    setIsHistoryLoading(true);
    const res = await listCashflowsAction();
    setIsHistoryLoading(false);
    if (res.success) {
      setHistoryItems(res.data.map((r: CashflowRow): HistoryItem => ({
        id: r.id,
        time: fmtTime(r.created_at),
        label: `储蓄率 ${fmtPct(r.savings_rate)}  |  资产包 ${fmtWan(r.nest_egg_low, 0)}–${fmtWan(r.nest_egg_high, 0)}`,
        sub: `结余 ${fmtSigned(r.annual_surplus)}`,
      })));
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteCashflowAction(id);
    setDeletingId(undefined);
    if (savedId === id) setSavedId(null);
    loadHistory();
  }

  async function handleLoadFromHistory(id: string) {
    setLoadingId(id);
    const res = await getCashflowByIdAction(id);
    setLoadingId(undefined);
    if (!res.success || !res.data) return;
    const r = res.data;
    setForm(f => ({
      ...f,
      annualIncome:      String(r.annual_income),
      annualSpend:       String(r.annual_spend),
      targetAnnualSpend: String(r.target_annual_spend),
      targetMode: "custom", // 历史加载时切回自定义模式
    }));
    setErrors({});
    setSavedId(r.id);
    setResult(calculateCashFlow({
      annualIncome:      r.annual_income,
      annualSpend:       r.annual_spend,
      targetAnnualSpend: r.target_annual_spend,
    }));
  }

  // ─── 导入模块01 ──────────────────────────────────────────
  async function handleImportFromMacro() {
    if (!DB_ENABLED) return;
    setIsMacroImporting(true);
    setMacroImportMsg(null);
    const res = await getLatestMacroCheckAction();
    setIsMacroImporting(false);
    if (!res.success || !res.data) {
      setMacroImportMsg("暂无宏观记录，请先在模块 01 完成一次保存");
      setTimeout(() => setMacroImportMsg(null), 3000);
      return;
    }
    setForm(f => ({
      ...f,
      annualIncome:     String(res.data!.annual_income),
      currentAge:       String(res.data!.age),
      currentNetWorth:  String(res.data!.net_worth),
    }));
    setMacroImportMsg("✓ 已从模块 01 最新记录填充年收入、年龄与净资产");
    setTimeout(() => setMacroImportMsg(null), 2500);
  }

  // ─── 切换到智能估算模式 ───────────────────────────────────
  function handleSwitchToSmart() {
    setForm(f => ({ ...f, targetMode: "smart" }));
  }

  const savingsVariant = result
    ? result.savingsRateLevel === "excellent" || result.savingsRateLevel === "ideal" ? "ahead"
      : result.savingsRateLevel === "approaching" ? "on-track"
      : result.savingsRateLevel === "low" ? "warning"
      : "danger"
    : "on-track";

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <PageHeader back="/" tagColor="#22C55E" icon="💰"
        title="现金流与理想生活目标分析"
        subtitle="量化当前储蓄能力与退休目标之间的差距，测算终极目标资产包规模" />

      <main className="page-content pt-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── 输入表单 ─────────────────────────────────── */}
          <div className="space-y-4">

            {/* 当前收支 */}
            <FormSection title="当前收支状况">
              {DB_ENABLED && (
                <div>
                  <button
                    onClick={handleImportFromMacro}
                    disabled={isMacroImporting}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
                    style={{
                      background: "var(--primary-dim)",
                      color: "var(--primary)",
                      border: "1px solid rgba(0,229,255,0.2)",
                      opacity: isMacroImporting ? 0.6 : 1,
                    }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {isMacroImporting ? "读取中…" : "自动读取模块 01（收入、年龄、净资产）"}
                  </button>
                  {macroImportMsg && (
                    <p className="mt-1.5 text-[11px]"
                      style={{ color: macroImportMsg.startsWith("✓") ? "var(--success)" : "var(--warning)" }}>
                      {macroImportMsg}
                    </p>
                  )}
                </div>
              )}
              <InputField label="当前年收入" type="number" placeholder="200000" unit="元"
                value={form.annualIncome} onChange={set("annualIncome")} error={errors.annualIncome}
                hint="若输入月收入请自行 ×12" />
              <InputField label="当前年度总开支" type="number" placeholder="150000" unit="元"
                value={form.annualSpend} onChange={set("annualSpend")} error={errors.annualSpend} />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="当前年龄" type="number" placeholder="30" unit="岁"
                  value={form.currentAge} onChange={set("currentAge")} error={errors.currentAge}
                  hint="用于智能估算与路径模拟" />
                <InputField label="当前净资产（可选）" type="number" placeholder="0" unit="元"
                  value={form.currentNetWorth} onChange={set("currentNetWorth")}
                  hint="FIRE 模拟起始值" />
              </div>
            </FormSection>

            {/* 理想生活目标 */}
            <FormSection title="理想生活目标">
              {/* 退休年龄（单独一行） */}
              <InputField label="预期退休年龄" type="number" placeholder="60" unit="岁"
                value={form.retirementAge} onChange={set("retirementAge")} error={errors.retirementAge} />

              {/* 投资年化收益率 + 回测控制（整块占满宽度） */}
              <div className="mt-3 space-y-1.5">
                <label className="block text-[12.5px] font-medium" style={{ color: "var(--text-secondary)" }}>
                  投资年化收益率
                </label>
                <div className="relative max-w-xs">
                  <input
                    type="number"
                    className="form-input num"
                    step="0.5" min="0" max="20"
                    value={form.investmentReturn}
                    onChange={set("investmentReturn")}
                    style={{ paddingRight: 28 }}
                  />
                  <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px]"
                    style={{ color: "var(--text-muted)" }}>%</span>
                </div>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  默认 6%，你也可以基于 S&amp;P 500 历史回测区间自动填入更接近现实的长期权益类年化收益率。
                </p>

                {sp500YearRange && effectiveStartYear !== null && effectiveEndYear !== null && (
                  <div className="mt-2 space-y-1.5 rounded-[14px] p-3"
                    style={{ background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-card)" }}>
                    <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span>回测区间</span>
                      <span>
                        <span className="num" style={{ color: "var(--text-primary)" }}>
                          {effectiveStartYear}–{effectiveEndYear}
                        </span>
                        &nbsp;（约&nbsp;
                        <span className="num">
                          {sp500Stats.actualYears !== null ? sp500Stats.actualYears.toFixed(1) : "—"}
                        </span>
                        &nbsp;年）
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span>统计指标</span>
                      <span>
                        年化&nbsp;
                        <span className="num" style={{ color: "var(--primary)" }}>
                          {sp500Stats.cagr !== null ? `${(sp500Stats.cagr * 100).toFixed(1)}%` : "—"}
                        </span>
                        &nbsp; / 最大回撤&nbsp;
                        <span className="num" style={{ color: "#F97316" }}>
                          {sp500Stats.maxDrawdown !== null ? `-${(sp500Stats.maxDrawdown * 100).toFixed(1)}%` : "—"}
                        </span>
                      </span>
                    </div>

                    {/* 双端年份滑块：起点 / 终点 */}
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span>起始年份</span>
                        <span className="num">{effectiveStartYear}</span>
                      </div>
                      <div className="mt-1">
                        <Slider
                          min={sp500YearRange.min}
                          max={sp500YearRange.max}
                          step={1}
                          className="w-full"
                          value={[effectiveStartYear, effectiveEndYear]}
                          onValueChange={(vals) => {
                            if (!Array.isArray(vals) || vals.length !== 2) return;
                            let [start, end] = vals.map((v) => Number(v));
                            if (!Number.isFinite(start) || !Number.isFinite(end)) return;
                            if (start >= end) {
                              // 保证至少跨 1 年
                              if (start === sp500YearRange.min) {
                                end = start + 1;
                              } else {
                                start = end - 1;
                              }
                            }
                            start = Math.max(sp500YearRange.min, Math.min(start, sp500YearRange.max - 1));
                            end = Math.min(sp500YearRange.max, Math.max(end, sp500YearRange.min + 1));
                            setSp500YearRangeRaw([start, end]);
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                        <span>结束年份</span>
                        <span className="num">{effectiveEndYear}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (sp500Stats.cagr === null) return;
                        const cagrPct = (sp500Stats.cagr * 100).toFixed(1);
                        setForm(f => ({
                          ...f,
                          investmentReturn: cagrPct,
                        }));
                      }}
                      disabled={sp500Stats.cagr === null}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all disabled:opacity-60"
                      style={{
                        background: "rgba(15,23,42,0.9)",
                        border: "1px solid var(--border-card)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span style={{ fontSize: 12 }}>📈</span>
                      使用该区间 S&amp;P 500 年化收益率
                    </button>
                    <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      数据来源：S&amp;P 500 月度收盘价（src/static/backtesting.json），假设股息再投资、不含税费，仅用于长期权益资产假设参考。
                    </p>
                  </div>
                )}
              </div>

              {/* 模式切换 Toggle */}
              <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-card)" }}>
                <button
                  onClick={handleSwitchToSmart}
                  className="flex-1 rounded-[10px] py-2 text-[12px] font-semibold transition-all"
                  style={{
                    background: form.targetMode === "smart" ? "var(--primary-dim)" : "transparent",
                    color: form.targetMode === "smart" ? "var(--primary)" : "var(--text-muted)",
                    boxShadow: form.targetMode === "smart" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                    border: form.targetMode === "smart" ? "none" : "none",
                  }}
                >
                  ⚡ 智能估算
                </button>
                <button
                  onClick={() => setForm(f => ({ ...f, targetMode: "custom" }))}
                  className="flex-1 rounded-[10px] py-2 text-[12px] font-semibold transition-all"
                  style={{
                    background: form.targetMode === "custom" ? "var(--bg-card)" : "transparent",
                    color: form.targetMode === "custom" ? "var(--text-primary)" : "var(--text-muted)",
                    boxShadow: form.targetMode === "custom" ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  自定义输入
                </button>
              </div>

              {/* ── 智能估算面板 ─────────────────────────── */}
              {form.targetMode === "smart" && (
                <div className="space-y-4">

                  {/* 替代率三档 */}
                  <div>
                    <p className="text-[12px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                      退休消费替代率
                    </p>
                    <div className="flex gap-2">
                      {(Object.entries(REPLACEMENT_PRESETS) as [ReplacementLevel, typeof REPLACEMENT_PRESETS[ReplacementLevel]][]).map(([level, preset]) => {
                        const isActive = form.replacementLevel === level;
                        return (
                          <button
                            key={level}
                            onClick={() => setForm(f => ({ ...f, replacementLevel: level }))}
                            className="flex-1 rounded-[14px] py-3 text-center transition-all"
                            style={{
                              background: isActive ? "var(--primary-dim)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${isActive ? "rgba(0,229,255,0.3)" : "var(--border-card)"}`,
                              color: isActive ? "var(--primary)" : "var(--text-secondary)",
                            }}
                          >
                            <div className="text-[14px] font-bold num">{preset.sub}</div>
                            <div className="text-[10px] mt-0.5 font-medium">{preset.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 通胀率 */}
                  <div className="flex items-center gap-3">
                    <label className="text-[12px] font-medium shrink-0" style={{ color: "var(--text-secondary)" }}>
                      长期年化通胀率
                    </label>
                    <input
                      type="number"
                      className="form-input num"
                      style={{ maxWidth: 80, textAlign: "right" }}
                      step="0.5"
                      min="0"
                      max="10"
                      value={form.inflationRate}
                      onChange={set("inflationRate")}
                    />
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>%</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>(建议 2–3%)</span>
                  </div>

                  {/* 计算过程展示 */}
                  {smartEstimate ? (
                    <div className="rounded-[16px] p-4 space-y-2"
                      style={{ background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.15)" }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "var(--primary)" }}>
                        计算过程
                      </p>
                      <div className="space-y-1 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        <div className="flex justify-between">
                          <span>当前年度开支</span>
                          <span className="num">{fmtRMB(Number(form.annualSpend))}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>× 消费替代率 ({REPLACEMENT_PRESETS[form.replacementLevel].sub})</span>
                          <span className="num">{fmtRMB(Number(form.annualSpend) * REPLACEMENT_PRESETS[form.replacementLevel].ratio)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>× 通胀系数 (1+{form.inflationRate}%)^{smartEstimate.yearsToRetirement} 年</span>
                          <span className="num">× {smartEstimate.inflationFactor.toFixed(3)}</span>
                        </div>
                        <div
                          className="flex justify-between pt-2 mt-1 font-bold"
                          style={{ borderTop: "1px solid rgba(0,229,255,0.15)", color: "var(--primary)" }}
                        >
                          <span>≈ 退休首年预估开支</span>
                          <span className="num">{fmtRMB(smartEstimate.targetAnnualSpend)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[14px] p-3 text-[12px] text-center"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-card)", color: "var(--text-muted)" }}>
                      请填写当前年龄与退休年龄以生成估算
                    </div>
                  )}

                  {/* 只读结果框 */}
                  <div>
                    <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                      预估退休首年开支（自动计算）
                    </label>
                    <div className="relative">
                      <input
                        readOnly
                        className="form-input num"
                        value={smartEstimate ? Math.round(smartEstimate.targetAnnualSpend).toLocaleString("zh-CN") : ""}
                        placeholder="填写上方参数后自动计算"
                        style={{
                          background: "rgba(0,229,255,0.04)",
                          borderColor: smartEstimate ? "rgba(0,229,255,0.25)" : undefined,
                          color: "var(--primary)",
                          cursor: "default",
                        }}
                      />
                      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px]"
                        style={{ color: "var(--text-muted)" }}>元</span>
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      由智能估算模型自动计算，切换「自定义输入」可手动修改
                    </p>
                  </div>
                </div>
              )}

              {/* ── 自定义模式 ───────────────────────────── */}
              {form.targetMode === "custom" && (
                <InputField
                  label="理想/退休目标年度开支"
                  type="number"
                  placeholder="120000"
                  unit="元"
                  value={form.targetAnnualSpend}
                  onChange={set("targetAnnualSpend")}
                  error={errors.targetAnnualSpend}
                  hint="退休后每年花多少？基于 4% 法则计算所需资产包"
                />
              )}
            </FormSection>

            <button className="btn-primary" onClick={handleCalc}>生成分析报告</button>

            {/* 历史记录 */}
            <HistoryPanel
              title="历史现金流分析"
              items={historyItems}
              isLoading={isHistoryLoading}
              isConfigured={DB_ENABLED}
              onLoad={handleLoadFromHistory}
              loadingId={loadingId}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          </div>

          {/* ── 结果展示 ─────────────────────────────────── */}
          <div>
            {result ? (
              <ResultPanel>
                {/* 储蓄率 */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                      当前储蓄能力
                    </p>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        variant={savingsVariant as "ahead" | "on-track" | "behind" | "ok" | "warning" | "danger"}
                        label={
                          result.savingsRateLevel === "excellent" ? "优秀" :
                          result.savingsRateLevel === "ideal"     ? "理想" :
                          result.savingsRateLevel === "approaching" ? "接近目标" :
                          result.savingsRateLevel === "low"       ? "偏低" : "入不敷出"
                        }
                      />
                      {DB_ENABLED && (
                        <button
                          onClick={handleSave}
                          disabled={isSaving || !!savedId}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
                          style={{
                            background: savedId ? "rgba(34,197,94,0.12)" : "var(--tag-bg)",
                            color: savedId ? "#22C55E" : "var(--text-secondary)",
                            border: `1px solid ${savedId ? "rgba(34,197,94,0.3)" : "var(--border-card)"}`,
                            opacity: isSaving ? 0.6 : 1,
                          }}
                        >
                          {isSaving ? "保存中…" : savedId ? "✓ 已保存" : "保存记录"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "var(--text-muted)" }}>
                      <span>当前储蓄率</span>
                      <span className="font-bold text-base" style={{ color: "#22C55E" }}>{fmtPct(result.savingsRate)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-card)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, Math.max(0, result.savingsRate * 100))}%`,
                          background: result.savingsRate >= 0.15
                            ? "linear-gradient(90deg, #22C55E, #4ADE80)"
                            : result.savingsRate >= 0.08
                            ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
                            : "linear-gradient(90deg, #EF4444, #F87171)",
                        }} />
                    </div>
                  </div>
                  <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                    {SAVINGS_RATE_LABELS[result.savingsRateLevel]}
                  </p>
                </div>

                {/* 关键指标 */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="年度结余" value={fmtSigned(result.annualSurplus)}
                    sub={`储蓄率 ${fmtPct(result.savingsRate)}`}
                    accentColor={result.annualSurplus >= 0 ? "#22C55E" : "#EF4444"} />
                  <MetricCard label="收支缺口"
                    value={result.incomeGap > 0 ? `+${fmtWan(result.incomeGap)}` : `${fmtWan(Math.abs(result.incomeGap))} 有余`}
                    sub="目标开支 vs 当前收入"
                    accentColor={result.incomeGap > 0 ? "#F59E0B" : "#22C55E"} />
                </div>

                {/* 目标开支说明（智能估算时补充展示） */}
                {form.targetMode === "smart" && smartEstimate && (
                  <div className="form-section">
                    <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
                      智能估算依据
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-[12px] p-3" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>替代率</p>
                        <p className="text-[16px] font-bold num" style={{ color: "var(--text-primary)" }}>
                          {REPLACEMENT_PRESETS[form.replacementLevel].sub}
                        </p>
                      </div>
                      <div className="rounded-[12px] p-3" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>距退休</p>
                        <p className="text-[16px] font-bold num" style={{ color: "var(--text-primary)" }}>
                          {smartEstimate.yearsToRetirement} 年
                        </p>
                      </div>
                      <div className="rounded-[12px] p-3" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>通胀系数</p>
                        <p className="text-[16px] font-bold num" style={{ color: "var(--text-primary)" }}>
                          ×{smartEstimate.inflationFactor.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 终极资产包 */}
                <div className="form-section">
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>
                    终极目标资产包（4% 安全提款率法则）
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[14px] p-4 text-center" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>保守目标（5%）</p>
                      <p className="text-xl font-bold num" style={{ color: "#22C55E" }}>{fmtWan(result.nestEggLow, 0)}</p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>20 倍年开支</p>
                    </div>
                    <div className="rounded-[14px] p-4 text-center" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                      <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>标准目标（4%）</p>
                      <p className="text-xl font-bold num" style={{ color: "#3B82F6" }}>{fmtWan(result.nestEggHigh, 0)}</p>
                      <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>25 倍年开支</p>
                    </div>
                  </div>
                </div>

                {/* FIRE 达成路径 */}
                {fireSimulation && (() => {
                  const retAge = Number(form.retirementAge) || 60;
                  const curAge = Number(form.currentAge);
                  const reached = fireSimulation.targetReachedAge;
                  const isEarly = reached !== null && reached <= retAge;
                  return (
                    <div className="form-section">
                      <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
                        FIRE 达成路径预测
                      </p>

                      {/* 结论卡片 */}
                      {reached !== null ? (
                        <div className="rounded-[16px] p-4 mb-4 text-center"
                          style={{
                            background: isEarly ? "rgba(0,229,255,0.06)" : "rgba(245,158,11,0.06)",
                            border: `1px solid ${isEarly ? "rgba(0,229,255,0.2)" : "rgba(245,158,11,0.2)"}`,
                          }}>
                          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                            按储蓄率 {fmtPct(result.savingsRate)} · 年化 {form.investmentReturn}% · 收入成长模型
                          </p>
                          <p className="text-[28px] font-bold num mt-1 mb-0.5"
                            style={{ color: isEarly ? "var(--primary)" : "#F59E0B" }}>
                            {reached} 岁
                          </p>
                          <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                            预计达成 {fmtWan(fireSimulation.targetNestEgg, 0)} 目标
                          </p>
                          <p className="text-[11px] mt-2 font-semibold"
                            style={{ color: isEarly ? "var(--success)" : "var(--warning)" }}>
                            {isEarly
                              ? `✓ 较退休年龄提前 ${retAge - reached} 年`
                              : `⚠ 超出退休年龄 ${reached - retAge} 年，建议提高储蓄率`}
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-[16px] p-4 mb-4 text-center"
                          style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <p className="text-[14px] font-bold" style={{ color: "var(--danger)" }}>
                            按当前轨迹，75 岁前未能达成目标
                          </p>
                          <p className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>
                            建议提高储蓄率或调低目标开支
                          </p>
                        </div>
                      )}

                      {/* 路径里程碑表 */}
                      {fireSimulation.path.length > 0 && (
                        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-card)" }}>
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr style={{ background: "var(--tag-bg)" }}>
                                <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>年龄</th>
                                <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>预计年收入</th>
                                <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>年度储蓄</th>
                                <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>累积净资产</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fireSimulation.path
                                .filter(pt => pt.age >= curAge)
                                .map((pt) => (
                                  <tr key={pt.age}
                                    style={{
                                      borderTop: "1px solid var(--border-card)",
                                      background: pt.isTargetYear ? "rgba(0,229,255,0.05)" : undefined,
                                    }}>
                                    <td className="px-3 py-2 font-medium" style={{ color: pt.isTargetYear ? "var(--primary)" : "var(--text-primary)" }}>
                                      {pt.age} 岁{pt.isTargetYear ? " ✓" : ""}
                                    </td>
                                    <td className="text-right px-3 py-2 num" style={{ color: "var(--text-secondary)" }}>
                                      {fmtWan(pt.projectedIncome)}
                                    </td>
                                    <td className="text-right px-3 py-2 num" style={{ color: "var(--text-secondary)" }}>
                                      {fmtWan(pt.annualSavings)}
                                    </td>
                                    <td className="text-right px-3 py-2 num font-semibold"
                                      style={{ color: pt.isTargetYear ? "var(--primary)" : "var(--text-primary)" }}>
                                      {fmtWan(pt.nestEgg, 0)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* 进度条（至退休年龄） */}
                      {reached !== null && (
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] mb-1" style={{ color: "var(--text-muted)" }}>
                            <span>{curAge} 岁（今）</span>
                            <span style={{ color: isEarly ? "var(--primary)" : "#F59E0B" }}>{reached} 岁（达标）</span>
                            <span>{retAge} 岁（退休）</span>
                          </div>
                          <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "var(--border-card)" }}>
                            <div className="absolute left-0 top-0 h-full rounded-full"
                              style={{
                                width: `${Math.min(100, ((reached - curAge) / Math.max(1, retAge - curAge)) * 100)}%`,
                                background: isEarly
                                  ? "linear-gradient(90deg, #00E5FF, #00C4D4)"
                                  : "linear-gradient(90deg, #F59E0B, #FCD34D)",
                              }} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </ResultPanel>
            ) : (
              <div className="form-section flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4 opacity-40">💰</div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  填写左侧表单并点击「生成分析报告」查看结果
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
