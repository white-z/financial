"use client";

import { useState } from "react";
import { FormSection, InputField, MetricCard, ResultPanel } from "@/components/ui";
import { calculateDailyYield, type DailyYieldResult } from "@/lib/finance/micro-daily-yield";
import { fmtCNY, fmtPct, fmtNum } from "@/lib/format";

interface FormState {
  principal: string;
  annualRate: string;
  days: string;
}

const INITIAL: FormState = { principal: "", annualRate: "", days: "" };

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.principal || Number(f.principal) <= 0) e.principal = "本金须大于 0";
  if (!f.annualRate || Number(f.annualRate) <= 0) e.annualRate = "收益率须大于 0";
  if (!f.days || !Number.isInteger(Number(f.days)) || Number(f.days) <= 0) e.days = "天数须为正整数";
  return e;
}

export function DailyYieldTool() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [result, setResult] = useState<DailyYieldResult | null>(null);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleCalc() {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      setResult(calculateDailyYield({
        principal: Number(form.principal),
        annualRate: Number(form.annualRate) / 100,
        days: Number(form.days),
      }));
    } catch (e) { console.error(e); }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 输入 */}
      <div className="space-y-4">
        <FormSection title="计算参数">
          <InputField label="本金金额" type="number" placeholder="100000" unit="元"
            value={form.principal} onChange={set("principal")} error={errors.principal} />
          <InputField label="年化收益率" type="number" placeholder="3.65" unit="%"
            value={form.annualRate} onChange={set("annualRate")} error={errors.annualRate}
            step="0.01" hint="输入百分比数值，如 3.65 表示 3.65%" />
          <InputField label="计算天数" type="number" placeholder="365" unit="天"
            value={form.days} onChange={set("days")} error={errors.days}
            hint="正整数，如 30、90、365" />
        </FormSection>
        <button className="btn-primary" onClick={handleCalc}>计算收益</button>

        <div className="form-section">
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>计算公式</p>
          <div className="space-y-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
            <p>万份收益 = 年化收益率 ÷ 365 × 10000</p>
            <p>复利总金额 = 本金 × (1 + 年化÷365)^天数</p>
            <p>累计收益 = 复利总金额 - 本金</p>
          </div>
        </div>
      </div>

      {/* 结果 */}
      <div>
        {result ? (
          <ResultPanel>
            <div className="form-section">
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>计算结果</p>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="万份收益" value={fmtNum(result.unitYield, 4) + " 元"}
                  sub="每万份持有一天收益" accentColor="#3B82F6" />
                <MetricCard label="实际收益率" value={fmtPct(result.actualRate, 4)}
                  sub={`持有 ${form.days} 天`} />
                <MetricCard label="累计收益" value={fmtCNY(result.profit, 2)}
                  sub="复利计算" accentColor="#22C55E" />
                <MetricCard label="期末总金额" value={fmtCNY(result.totalAmount, 2)}
                  sub="本金 + 收益" />
              </div>
            </div>
            <div className="form-section">
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>本金 / 收益构成</p>
              <div className="h-3 rounded-full overflow-hidden flex" style={{ background: "var(--border-card)" }}>
                <div className="h-full rounded-l-full"
                  style={{ width: `${(Number(form.principal) / result.totalAmount * 100).toFixed(1)}%`, background: "#3B82F6" }} />
                <div className="h-full flex-1 rounded-r-full" style={{ background: "#22C55E" }} />
              </div>
              <div className="flex justify-between mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <span style={{ color: "#3B82F6" }}>● 本金 {(Number(form.principal) / result.totalAmount * 100).toFixed(1)}%</span>
                <span style={{ color: "#22C55E" }}>● 收益 {(result.profit / result.totalAmount * 100).toFixed(2)}%</span>
              </div>
            </div>
          </ResultPanel>
        ) : (
          <EmptyState icon="🏦" text="填写参数并点击「计算收益」" />
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="form-section flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-4 opacity-40">{icon}</div>
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>{text}</p>
    </div>
  );
}
