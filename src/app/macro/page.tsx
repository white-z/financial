"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, FormSection, InputField, MetricCard, StatusBadge, ResultPanel } from "@/components/ui";
import { HistoryPanel, fmtTime, type HistoryItem } from "@/components/HistoryPanel";
import { calculateMacroResult, type MacroResult, AGE_BRACKETS } from "@/lib/finance/ppp";
import { calculateLifecycleTargets, type LifecycleResult } from "@/lib/finance/lifecycle-targets";
import { fmtWan, fmtUSD, fmtPct } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  saveMacroCheckAction,
  listMacroChecksAction,
  getMacroCheckByIdAction,
  deleteMacroCheckAction,
} from "@/app/actions/macro";
import type { MacroCheckRow } from "@/lib/supabase/repositories/macro";

interface FormState {
  age: string; annualIncome: string; pppRate: string;
  cash: string; liquidInvest: string; fixedIncome: string; property: string;
  liabConsumption: string; liabInvestment: string; liabStudent: string;
}

const INITIAL: FormState = {
  age: "", annualIncome: "", pppRate: "3.5",
  cash: "0", liquidInvest: "0", fixedIncome: "0", property: "0",
  liabConsumption: "0", liabInvestment: "0", liabStudent: "0",
};

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  const age = Number(f.age);
  if (!f.age || isNaN(age) || age < 18 || age > 90) e.age = "请输入 18–90 之间的年龄";
  if (!f.annualIncome || Number(f.annualIncome) <= 0) e.annualIncome = "请输入正数年收入";
  if (!f.pppRate || Number(f.pppRate) <= 0) e.pppRate = "PPP 折算率须大于 0";
  return e;
}

// Fidelity 收入与净资产基准（与同龄人 PPP 表同源，用于解释生命周期目标）
type FidelityIncomeRow = {
  label: string;                 // "20s" / "30" / "30s" ...
  age?: number;                  // 具体年龄（30/40/50/60/70），用于主表轨迹
  averageNetWorth?: number;      // 平均净资产（USD）
  medianNetWorth?: number;       // 中位数净资产（USD）
  medianIncome?: number;         // 中位数收入（USD）
  recommendedNetWorth?: number;  // 推荐净资产（USD）
  incomeMultiplier?: number;     // 收入倍数（1x / 3x / ...）
};

const FIDELITY_INCOME_ROWS: FidelityIncomeRow[] = [
  { label: "20s", averageNetWorth: 127730, medianNetWorth: 6689 },
  { label: "30", age: 30, medianIncome: 52002, recommendedNetWorth: 52002, incomeMultiplier: 1 },
  { label: "30s", averageNetWorth: 321549, medianNetWorth: 24508 },
  { label: "40", age: 40, medianIncome: 61970, recommendedNetWorth: 185910, incomeMultiplier: 3 },
  { label: "40s", averageNetWorth: 770892, medianNetWorth: 76479 },
  { label: "50", age: 50, medianIncome: 65000, recommendedNetWorth: 390000, incomeMultiplier: 6 },
  { label: "50s", averageNetWorth: 1369809, medianNetWorth: 192964 },
  { label: "60", age: 60, medianIncome: 62001, recommendedNetWorth: 496008, incomeMultiplier: 8 },
  { label: "60s", averageNetWorth: 1576784, medianNetWorth: 290920 },
  { label: "70", age: 70, medianIncome: 63455, recommendedNetWorth: 634550, incomeMultiplier: 10 },
];

const DB_ENABLED = isSupabaseConfigured();

export default function MacroPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [macroResult, setMacroResult] = useState<MacroResult | null>(null);
  const [lcResult, setLcResult] = useState<LifecycleResult | null>(null);
  const [showFidelitySource, setShowFidelitySource] = useState(false);
  // DB state
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | undefined>();
  const [deletingId, setDeletingId] = useState<string | undefined>();

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const n = useCallback((f: FormState, k: keyof FormState) => Number(f[k]) || 0, []);

  const runCalc = useCallback((f: FormState): { macro: MacroResult; lc: LifecycleResult } => {
    const macro = calculateMacroResult({
      age: n(f, "age"),
      annualIncome: n(f, "annualIncome"),
      assets: { cash: n(f, "cash"), liquidInvest: n(f, "liquidInvest"), fixedIncome: n(f, "fixedIncome"), property: n(f, "property") },
      liabilities: { consumption: n(f, "liabConsumption"), investment: n(f, "liabInvestment"), student: n(f, "liabStudent") },
      pppRate: n(f, "pppRate"),
    });
    const lc = calculateLifecycleTargets(n(f, "annualIncome"), n(f, "age"));
    return { macro, lc };
  }, [n]);

  function handleCalc() {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const { macro, lc } = runCalc(form);
    setMacroResult(macro);
    setLcResult(lc);
    setSavedId(null);
  }

  async function handleSave() {
    if (!macroResult || !DB_ENABLED) return;
    setIsSaving(true);
    const result = await saveMacroCheckAction({
      age: n(form, "age"),
      annual_income: n(form, "annualIncome"),
      ppp_rate: n(form, "pppRate"),
      assets_cash: n(form, "cash"),
      assets_invest_liquid: n(form, "liquidInvest"),
      assets_fixed_income: n(form, "fixedIncome"),
      assets_property: n(form, "property"),
      liab_consumption: n(form, "liabConsumption"),
      liab_investment: n(form, "liabInvestment"),
      liab_student: n(form, "liabStudent"),
      net_worth: macroResult.netWorth,
      net_worth_ppp: macroResult.netWorthPPP,
      income_ppp: macroResult.incomePPP,
      age_percentile: macroResult.agePercentile,
    });
    setIsSaving(false);
    if (result.success) {
      setSavedId(result.data.id);
      loadHistory();
    }
  }

  const loadHistory = useCallback(async () => {
    if (!DB_ENABLED) return;
    setIsHistoryLoading(true);
    const result = await listMacroChecksAction();
    setIsHistoryLoading(false);
    if (result.success) {
      setHistoryItems(result.data.map((r: MacroCheckRow): HistoryItem => ({
        id: r.id,
        time: fmtTime(r.created_at),
        label: `净资产 ${fmtWan(r.net_worth)}  |  PPP ${fmtUSD(r.net_worth_ppp)}`,
        sub: `${r.age} 岁 · 第 ${r.age_percentile.toFixed(0)} 百分位`,
      })));
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteMacroCheckAction(id);
    setDeletingId(undefined);
    if (savedId === id) setSavedId(null);
    loadHistory();
  }

  async function handleLoadFromHistory(id: string) {
    setLoadingId(id);
    const result = await getMacroCheckByIdAction(id);
    setLoadingId(undefined);
    if (!result.success || !result.data) return;
    const r = result.data;
    const newForm: FormState = {
      age: String(r.age), annualIncome: String(r.annual_income), pppRate: String(r.ppp_rate),
      cash: String(r.assets_cash), liquidInvest: String(r.assets_invest_liquid),
      fixedIncome: String(r.assets_fixed_income), property: String(r.assets_property),
      liabConsumption: String(r.liab_consumption), liabInvestment: String(r.liab_investment),
      liabStudent: String(r.liab_student),
    };
    setForm(newForm);
    setErrors({});
    setSavedId(r.id);
    const { macro, lc } = runCalc(newForm);
    setMacroResult(macro);
    setLcResult(lc);
  }

  const healthVariant = macroResult
    ? macroResult.agePercentile >= 60 ? "ahead" : macroResult.agePercentile >= 35 ? "on-track" : "behind"
    : "on-track";
  const healthLabel = { ahead: "超前 ↑", "on-track": "正常轨道", behind: "需追赶 ↓" }[healthVariant];

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <PageHeader back="/" tag="模块 01" tagColor="#3B82F6" icon="📊"
        title="全生命周期财务健康体检"
        subtitle="录入资产负债并设置 PPP 折算率，与 2026 年国际同龄人基准进行对比" />

      <main className="page-content pt-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── 输入表单 ── */}
          <div className="space-y-4">
            <FormSection title="基础信息">
              <InputField label="年龄" type="number" placeholder="32" unit="岁"
                value={form.age} onChange={set("age")} error={errors.age} min={18} max={90} />
              <InputField label="当前年收入" type="number" placeholder="200000" unit="元"
                value={form.annualIncome} onChange={set("annualIncome")} error={errors.annualIncome} />
              <InputField label="PPP 折算率（本地货币/美元）" type="number" placeholder="3.5" unit="×"
                value={form.pppRate} onChange={set("pppRate")} error={errors.pppRate}
                hint="中国约 3.5–4.0，输入 1 表示本身为美元" step="0.1" />
            </FormSection>

            <FormSection title="资产状况（元）">
              <InputField label="现金及等价物" type="number" placeholder="0" unit="元" value={form.cash} onChange={set("cash")} />
              <InputField label="流动投资资产" type="number" placeholder="0" unit="元" value={form.liquidInvest} onChange={set("liquidInvest")} />
              <InputField label="固收资产（债券/理财）" type="number" placeholder="0" unit="元" value={form.fixedIncome} onChange={set("fixedIncome")} />
              <InputField label="房产及实物资产" type="number" placeholder="0" unit="元" value={form.property} onChange={set("property")} />
            </FormSection>

            <FormSection title="负债状况（元）">
              <InputField label="消费类负债（信用卡等）" type="number" placeholder="0" unit="元" value={form.liabConsumption} onChange={set("liabConsumption")} />
              <InputField label="投资类负债（房贷等）" type="number" placeholder="0" unit="元" value={form.liabInvestment} onChange={set("liabInvestment")} />
              <InputField label="助学贷款" type="number" placeholder="0" unit="元" value={form.liabStudent} onChange={set("liabStudent")} />
            </FormSection>

            <button className="btn-primary" onClick={handleCalc}>生成体检报告</button>

            {/* 历史记录面板 */}
            <HistoryPanel
              title="历史体检记录"
              items={historyItems}
              isLoading={isHistoryLoading}
              isConfigured={DB_ENABLED}
              onLoad={handleLoadFromHistory}
              loadingId={loadingId}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
          </div>

          {/* ── 结果展示 ── */}
          <div>
            {macroResult && lcResult ? (
              <ResultPanel>
                {/* 净资产概览 */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>净资产概览</p>
                    {/* 保存按钮 */}
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
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="净资产" value={fmtWan(macroResult.netWorth)} sub="当地货币" />
                    <MetricCard label="PPP 折算净资产" value={fmtUSD(macroResult.netWorthPPP)} sub="等效美元" accentColor="#3B82F6" />
                    <MetricCard label="总资产" value={fmtWan(macroResult.totalAssets)} />
                    <MetricCard label="总负债" value={fmtWan(macroResult.totalLiabilities)} />
                  </div>
                  <div className="mt-3">
                    <MetricCard label="PPP 折算年收入" value={fmtUSD(macroResult.incomePPP)} sub="等效美元年薪" />
                  </div>
                </div>

                {/* 同龄人水位 */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>同龄人水位对比（2026）</p>
                    <StatusBadge variant={healthVariant} label={healthLabel} />
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "var(--text-muted)" }}>
                      <span>0%</span>
                      <span className="font-semibold" style={{ color: "#3B82F6" }}>你：第 {macroResult.agePercentile.toFixed(1)} 百分位</span>
                      <span>100%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border-card)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(2, macroResult.agePercentile)}%`, background: "linear-gradient(90deg, #3B82F6, #60A5FA)" }} />
                    </div>
                    <p className="mt-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      你超越了同龄人中约 <strong style={{ color: "var(--text-primary)" }}>{macroResult.agePercentile.toFixed(0)}%</strong> 的人；同龄中位数为 <strong style={{ color: "var(--text-primary)" }}>{fmtUSD(macroResult.peerMedian)}</strong>
                    </p>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-card)" }}>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ background: "var(--tag-bg)" }}>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>年龄段</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>P25</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>中位数</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>P75</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(AGE_BRACKETS).map(([bracket, [p25, p50, p75]]) => (
                          <tr key={bracket} style={{ borderTop: "1px solid var(--border-card)" }}>
                            <td className="px-3 py-2 font-medium" style={{ color: "var(--text-primary)" }}>{bracket}</td>
                            <td className="text-right px-3 py-2" style={{ color: "var(--text-secondary)" }}>{fmtUSD(p25)}</td>
                            <td className="text-right px-3 py-2" style={{ color: "var(--text-secondary)" }}>{fmtUSD(p50)}</td>
                            <td className="text-right px-3 py-2" style={{ color: "var(--text-secondary)" }}>{fmtUSD(p75)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Fidelity 目标表 */}
                <div className="form-section">
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
                    Fidelity 生命周期目标（基于年薪 {fmtWan(lcResult.annualIncome)}）
                  </p>
                  <p className="text-[12px] mb-3" style={{ color: "var(--text-secondary)" }}>
                    当前目标：<strong style={{ color: "#3B82F6" }}>{fmtWan(lcResult.currentTarget)}</strong>
                    &nbsp;（{macroResult.netWorth >= lcResult.currentTarget ? "✓ 已达标" : `差 ${fmtWan(lcResult.currentTarget - macroResult.netWorth)}`}）
                  </p>
                  <div className="space-y-2">
                    {lcResult.targets.map((t) => {
                      const reached = macroResult.netWorth >= t.targetMin;
                      return (
                        <div key={t.age} className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                          <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{t.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>
                              {fmtWan(t.targetMin)}{t.targetMax ? `–${fmtWan(t.targetMax)}` : ""}
                            </span>
                            <span className="text-[10px] font-bold" style={{ color: reached ? "#22C55E" : "var(--text-muted)" }}>
                              {reached ? "✓" : "○"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Fidelity 收入成长轨迹（基于官方表格） */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
                        收入成长轨迹（Fidelity 基准）
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                        单位为 2026 年美元（与上方 PPP 同源），用于理解「几倍年薪」规则
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFidelitySource((v) => !v)}
                      className="rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
                      style={{
                        background: "var(--bg-page)",
                        border: "1px solid var(--border-card)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {showFidelitySource ? "收起数据来源" : "查看数据来源表格"}
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-card)" }}>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ background: "var(--tag-bg)" }}>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>年龄</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>Fidelity 中位数收入</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>推荐净资产</th>
                          <th className="text-right px-3 py-2 font-semibold" style={{ color: "var(--text-muted)" }}>收入倍数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FIDELITY_INCOME_ROWS.filter((r) => r.age !== undefined).map((row) => (
                          <tr key={row.age} style={{ borderTop: "1px solid var(--border-card)" }}>
                            <td className="px-3 py-2 font-medium" style={{ color: "var(--text-primary)" }}>
                              {row.age} 岁
                            </td>
                            <td className="text-right px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                              {row.medianIncome ? fmtUSD(row.medianIncome) : "—"}
                            </td>
                            <td className="text-right px-3 py-2" style={{ color: "var(--text-secondary)" }}>
                              {row.recommendedNetWorth ? fmtUSD(row.recommendedNetWorth) : "—"}
                            </td>
                            <td className="text-right px-3 py-2 num" style={{ color: "var(--text-secondary)" }}>
                              {row.incomeMultiplier ? `${row.incomeMultiplier.toFixed(0)}×` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {showFidelitySource && (
                    <div className="mt-3 rounded-xl px-3 py-2" style={{ background: "rgba(15,23,42,0.6)", border: "1px solid var(--border-card)" }}>
                      <p className="text-[11px] mb-2 font-semibold" style={{ color: "var(--text-secondary)" }}>
                        数据来源原表（简化版）
                      </p>
                      <div className="overflow-auto">
                        <table className="min-w-full text-[11px]">
                          <thead>
                            <tr style={{ background: "var(--tag-bg)" }}>
                              <th className="text-left px-2 py-1" style={{ color: "var(--text-muted)" }}>Age</th>
                              <th className="text-right px-2 py-1" style={{ color: "var(--text-muted)" }}>Average Net Worth</th>
                              <th className="text-right px-2 py-1" style={{ color: "var(--text-muted)" }}>Median Net Worth</th>
                              <th className="text-right px-2 py-1" style={{ color: "var(--text-muted)" }}>Median Income</th>
                              <th className="text-right px-2 py-1" style={{ color: "var(--text-muted)" }}>Recommended Net Worth</th>
                              <th className="text-right px-2 py-1" style={{ color: "var(--text-muted)" }}>Income Multiplier</th>
                            </tr>
                          </thead>
                          <tbody>
                            {FIDELITY_INCOME_ROWS.map((row) => (
                              <tr key={row.label} style={{ borderTop: "1px solid var(--border-card)" }}>
                                <td className="px-2 py-1" style={{ color: "var(--text-secondary)" }}>{row.label}</td>
                                <td className="text-right px-2 py-1" style={{ color: "var(--text-secondary)" }}>
                                  {row.averageNetWorth ? fmtUSD(row.averageNetWorth) : "—"}
                                </td>
                                <td className="text-right px-2 py-1" style={{ color: "var(--text-secondary)" }}>
                                  {row.medianNetWorth ? fmtUSD(row.medianNetWorth) : "—"}
                                </td>
                                <td className="text-right px-2 py-1" style={{ color: "var(--text-secondary)" }}>
                                  {row.medianIncome ? fmtUSD(row.medianIncome) : "—"}
                                </td>
                                <td className="text-right px-2 py-1" style={{ color: "var(--text-secondary)" }}>
                                  {row.recommendedNetWorth ? fmtUSD(row.recommendedNetWorth) : "—"}
                                </td>
                                <td className="text-right px-2 py-1 num" style={{ color: "var(--text-secondary)" }}>
                                  {row.incomeMultiplier ? `${row.incomeMultiplier.toFixed(0)}×` : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="mt-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        注：表中数值为 Fidelity 公布的美元统计口径，本工具仅用于校准认知与解释「几倍年薪」目标，与上方 PPP 同龄人水位采用同一数据源。
                      </p>
                    </div>
                  )}
                </div>
              </ResultPanel>
            ) : (
              <div className="form-section flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4 opacity-40">📊</div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>填写左侧表单并点击「生成体检报告」查看结果</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
