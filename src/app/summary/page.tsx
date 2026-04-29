"use client";

import { useState } from "react";
import { PageHeader, FormSection, InputField, StatusBadge, ResultPanel } from "@/components/ui";
import { generateSummary, type SummaryResult } from "@/lib/finance/summary";
import { calculateMacroResult } from "@/lib/finance/ppp";
import { calculateCashFlow } from "@/lib/finance/cashflow";
import { fmtPct, fmtUSD } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getLatestMacroCheckAction } from "@/app/actions/macro";
import { getLatestCashflowAction } from "@/app/actions/cashflow";

interface FormState {
  age: string;
  annualIncomePPP: string;
  pppRate: string;
  netWorth: string;
  cashAmount: string;
  monthlyEssentialSpend: string;
  annualSpend: string;
  hasHighDebt: "yes" | "no";
}

const INITIAL: FormState = {
  age: "", annualIncomePPP: "", pppRate: "3.5", netWorth: "",
  cashAmount: "", monthlyEssentialSpend: "", annualSpend: "", hasHighDebt: "no",
};

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.age || Number(f.age) < 18 || Number(f.age) > 90) e.age = "请输入 18–90 之间的年龄";
  if (!f.annualIncomePPP || Number(f.annualIncomePPP) <= 0) e.annualIncomePPP = "请输入年收入";
  if (!f.pppRate || Number(f.pppRate) <= 0) e.pppRate = "PPP 折算率须大于 0";
  if (!f.netWorth) e.netWorth = "请输入净资产";
  if (!f.cashAmount || Number(f.cashAmount) < 0) e.cashAmount = "请输入现金金额";
  if (!f.monthlyEssentialSpend || Number(f.monthlyEssentialSpend) <= 0) e.monthlyEssentialSpend = "请输入月度开支";
  return e;
}

const STATUS_CONFIG = {
  ahead:    { label: "超前 ↑",   color: "#22C55E", desc: "净资产领先同龄人，财富积累态势良好" },
  on_track: { label: "正常轨道",  color: "#3B82F6", desc: "净资产处于正常区间，保持当前节奏" },
  behind:   { label: "需追赶 ↓", color: "#EF4444", desc: "净资产低于同龄基准，建议加速积累" },
};
const EMERGENCY_CONFIG = {
  comfortable:  { label: "充裕",    color: "#22C55E", badgeVariant: "ok" as const },
  adequate:     { label: "基本达标", color: "#3B82F6", badgeVariant: "on-track" as const },
  insufficient: { label: "严重不足", color: "#EF4444", badgeVariant: "danger" as const },
};

const DB_ENABLED = isSupabaseConfigured();

export default function SummaryPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [isAutoLoading, setIsAutoLoading] = useState(false);
  const [autoLoadMsg, setAutoLoadMsg] = useState("");

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  /** 从 Supabase 历史加载最新的宏观+现金流数据 */
  async function handleAutoLoad() {
    setIsAutoLoading(true);
    setAutoLoadMsg("");
    const [macroRes, cfRes] = await Promise.all([
      getLatestMacroCheckAction(),
      getLatestCashflowAction(),
    ]);
    setIsAutoLoading(false);

    const macro = macroRes.success && macroRes.data ? macroRes.data : null;
    const cf = cfRes.success && cfRes.data ? cfRes.data : null;

    if (!macro && !cf) {
      setAutoLoadMsg("未找到历史记录，请先在模块 1、2 中完成测算并保存");
      return;
    }

    setForm(f => ({
      ...f,
      ...(macro ? {
        age: String(macro.age),
        annualIncomePPP: String(macro.annual_income),
        pppRate: String(macro.ppp_rate),
        netWorth: String(macro.net_worth),
        cashAmount: String(macro.assets_cash),
      } : {}),
      ...(cf ? {
        annualSpend: String(cf.annual_spend),
        monthlyEssentialSpend: String(Math.round(cf.annual_spend / 12)),
      } : {}),
    }));

    const parts = [];
    if (macro) parts.push("模块 1 体检数据");
    if (cf) parts.push("模块 2 现金流数据");
    setAutoLoadMsg(`已加载${parts.join("与")}，请检查并补充其余字段`);
  }

  function handleCalc() {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const n = (k: keyof FormState) => Number(form[k]) || 0;
    const pppRate = n("pppRate");

    const macroResult = calculateMacroResult({
      age: n("age"),
      annualIncome: n("annualIncomePPP"),
      assets: {
        cash: n("cashAmount"),
        liquidInvest: 0,
        fixedIncome: 0,
        property: Math.max(0, n("netWorth") - n("cashAmount")),
      },
      liabilities: { consumption: 0, investment: 0, student: 0 },
      pppRate,
    });
    const adjustedMacro = { ...macroResult, netWorth: n("netWorth"), netWorthPPP: n("netWorth") / pppRate };

    const annualSpend = n("annualSpend") || n("monthlyEssentialSpend") * 12;
    const cashFlowResult = calculateCashFlow({
      annualIncome: n("annualIncomePPP"),
      annualSpend,
      targetAnnualSpend: annualSpend,
    });

    setResult(generateSummary({
      macroResult: adjustedMacro,
      cashFlowResult,
      age: n("age"),
      cashAmount: n("cashAmount"),
      monthlyEssentialSpend: n("monthlyEssentialSpend"),
      liabilityRates: form.hasHighDebt === "yes" ? [0.18] : [0.04],
    }));
  }

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>
      <PageHeader back="/" tag="模块 04" tagColor="#F59E0B" icon="🩺"
        title="极简版全景财务诊断"
        subtitle="整合关键财务数据，输出净资产健康度、负债风险、应急金状况与年龄段核心策略" />

      <main className="page-content pt-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ── 输入 ── */}
          <div className="space-y-4">

            {/* 历史快速加载 */}
            {DB_ENABLED && (
              <div className="form-section"
                style={{ border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.03)" }}>
                <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#F59E0B" }}>
                  从历史记录快速加载
                </p>
                <p className="text-[12px] mb-3" style={{ color: "var(--text-secondary)" }}>
                  自动读取模块 1 与模块 2 的最新保存记录，一键填充表单
                </p>
                <button
                  onClick={handleAutoLoad}
                  disabled={isAutoLoading}
                  className="w-full rounded-xl py-2.5 text-[13px] font-semibold transition-all"
                  style={{
                    background: "rgba(245,158,11,0.12)",
                    color: "#F59E0B",
                    border: "1px solid rgba(245,158,11,0.25)",
                    opacity: isAutoLoading ? 0.6 : 1,
                  }}
                >
                  {isAutoLoading ? "加载中…" : "加载最近测算数据"}
                </button>
                {autoLoadMsg && (
                  <p className="mt-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    {autoLoadMsg}
                  </p>
                )}
              </div>
            )}

            <FormSection title="基础信息">
              <InputField label="年龄" type="number" placeholder="32" unit="岁"
                value={form.age} onChange={set("age")} error={errors.age} min={18} max={90} />
              <InputField label="年收入（本地货币）" type="number" placeholder="200000" unit="元"
                value={form.annualIncomePPP} onChange={set("annualIncomePPP")} error={errors.annualIncomePPP} />
              <InputField label="PPP 折算率" type="number" placeholder="3.5" unit="×"
                value={form.pppRate} onChange={set("pppRate")} error={errors.pppRate}
                hint="建议与模块 1 保持一致" step="0.1" />
            </FormSection>

            <FormSection title="资产 & 流动性">
              <InputField label="净资产（本地货币）" type="number" placeholder="500000" unit="元"
                value={form.netWorth} onChange={set("netWorth")} error={errors.netWorth}
                hint="从模块 1 的净资产结果获取" />
              <InputField label="现金及等价物" type="number" placeholder="60000" unit="元"
                value={form.cashAmount} onChange={set("cashAmount")} error={errors.cashAmount} />
              <InputField label="月度基本生活开支" type="number" placeholder="8000" unit="元/月"
                value={form.monthlyEssentialSpend} onChange={set("monthlyEssentialSpend")}
                error={errors.monthlyEssentialSpend} />
            </FormSection>

            <FormSection title="负债状况">
              <div>
                <p className="text-[12.5px] font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                  是否有利率 &gt; 10% 的高息负债（信用卡/消费贷等）？
                </p>
                <div className="flex gap-3">
                  {(["no", "yes"] as const).map((v) => (
                    <button key={v}
                      onClick={() => setForm(f => ({ ...f, hasHighDebt: v }))}
                      className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200"
                      style={{
                        background: form.hasHighDebt === v
                          ? v === "yes" ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.12)"
                          : "var(--bg-page)",
                        color: form.hasHighDebt === v
                          ? v === "yes" ? "#EF4444" : "#22C55E"
                          : "var(--text-muted)",
                        border: `1px solid ${form.hasHighDebt === v
                          ? v === "yes" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"
                          : "var(--border-card)"}`,
                      }}
                    >
                      {v === "yes" ? "有" : "没有"}
                    </button>
                  ))}
                </div>
              </div>
            </FormSection>

            <button className="btn-primary" onClick={handleCalc}>生成全景诊断报告</button>
          </div>

          {/* ── 结果 ── */}
          <div>
            {result ? (
              <ResultPanel>
                {/* 净资产健康度 */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>净资产健康度</p>
                    <StatusBadge
                      variant={result.healthStatus === "ahead" ? "ahead" : result.healthStatus === "on_track" ? "on-track" : "behind"}
                      label={STATUS_CONFIG[result.healthStatus].label}
                    />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                    {STATUS_CONFIG[result.healthStatus].desc}
                  </p>
                  <div className="mt-3 rounded-xl p-3" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>PPP 折算净资产</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: STATUS_CONFIG[result.healthStatus].color }}>
                      {fmtUSD(Number(form.netWorth) / Number(form.pppRate))}
                    </p>
                  </div>
                </div>

                {/* 负债风险 */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>负债排雷</p>
                    <StatusBadge variant={result.hasHighRateDebt ? "danger" : "ok"}
                      label={result.hasHighRateDebt ? "⚠ 高风险" : "✓ 健康"} />
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{result.debtRiskMessage}</p>
                </div>

                {/* 应急金 */}
                <div className="form-section">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>紧急流动性测试</p>
                    <StatusBadge
                      variant={EMERGENCY_CONFIG[result.emergencyFundStatus].badgeVariant}
                      label={EMERGENCY_CONFIG[result.emergencyFundStatus].label}
                    />
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl font-bold" style={{ color: EMERGENCY_CONFIG[result.emergencyFundStatus].color }}>
                      {isFinite(result.emergencyFundMonths) ? result.emergencyFundMonths.toFixed(1) : "∞"}
                    </span>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>个月</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>{result.emergencyFundMessage}</p>
                </div>

                {/* 年龄策略 */}
                <div className="form-section"
                  style={{ border: "1px solid rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.04)" }}>
                  <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "#F59E0B" }}>
                    阶段性核心策略
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)", lineHeight: 1.75 }}>
                    {result.ageDirective}
                  </p>
                </div>
              </ResultPanel>
            ) : (
              <div className="form-section flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-4 opacity-40">🩺</div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {DB_ENABLED
                    ? "可先点击「加载最近测算数据」，或手动填写后点击「生成全景诊断报告」"
                    : "填写左侧数据并点击「生成全景诊断报告」"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
