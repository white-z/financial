"use client";

import { useState, useEffect } from "react";
import { FormSection, InputField, MetricCard, ResultPanel } from "@/components/ui";
import { calculateNavReturn, type NavReturnResult } from "@/lib/finance/micro-nav-return";
import { fmtPct, fmtDays, fmtNum } from "@/lib/format";

interface FormState {
  startDate: string; startNav: string;
  endDate: string;   endNav: string;
}

const INITIAL: FormState = { startDate: "", startNav: "", endDate: "", endNav: "" };

function validate(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!f.startDate) e.startDate = "请选择开始日期";
  if (!f.startNav || Number(f.startNav) <= 0) e.startNav = "期初净值须大于 0";
  if (!f.endDate) e.endDate = "请选择结束日期";
  if (!f.endNav || Number(f.endNav) <= 0) e.endNav = "期末净值须大于 0";
  if (f.startDate && f.endDate && new Date(f.endDate) <= new Date(f.startDate))
    e.endDate = "结束日期须晚于开始日期";
  return e;
}

interface NavReturnToolProps {
  initialInput?: Record<string, unknown> | null;
}

export function NavReturnTool({ initialInput }: NavReturnToolProps) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [result, setResult] = useState<NavReturnResult | null>(null);

  useEffect(() => {
    if (!initialInput || typeof initialInput !== "object") return;
    const next: FormState = { ...INITIAL };
    if (initialInput.startDate !== undefined) next.startDate = String(initialInput.startDate);
    if (initialInput.startNav !== undefined) next.startNav = String(initialInput.startNav);
    if (initialInput.endDate !== undefined) next.endDate = String(initialInput.endDate);
    if (initialInput.endNav !== undefined) next.endNav = String(initialInput.endNav);
    if (next.startDate !== "" || next.startNav !== "" || next.endDate !== "" || next.endNav !== "") setForm(next);
  }, [initialInput]);

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  function handleCalc() {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    try {
      setResult(calculateNavReturn({
        startDate: new Date(form.startDate), startNav: Number(form.startNav),
        endDate: new Date(form.endDate),     endNav: Number(form.endNav),
      }));
    } catch (e) { console.error(e); }
  }

  const isPositive = result && result.annualizedReturn >= 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 输入 */}
      <div className="space-y-4">
        <FormSection title="期初">
          <InputField label="开始日期" type="date" value={form.startDate} onChange={set("startDate")} error={errors.startDate} />
          <InputField label="期初单位净值" type="number" placeholder="1.0000" unit="元/份"
            value={form.startNav} onChange={set("startNav")} error={errors.startNav}
            step="0.0001" hint="通常为 1.0000 或买入时的净值" />
        </FormSection>
        <FormSection title="期末">
          <InputField label="结束日期" type="date" value={form.endDate} onChange={set("endDate")} error={errors.endDate} />
          <InputField label="期末单位净值" type="number" placeholder="1.1500" unit="元/份"
            value={form.endNav} onChange={set("endNav")} error={errors.endNav} step="0.0001" />
        </FormSection>
        <button className="btn-primary" onClick={handleCalc}>计算年化收益</button>
        <div className="form-section">
          <p className="text-[11px] font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>计算公式</p>
          <div className="space-y-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
            <p>总收益率 = (期末净值 - 期初净值) ÷ 期初净值</p>
            <p>年化收益率 = (期末净值 ÷ 期初净值)^(365÷持有天数) - 1</p>
          </div>
        </div>
      </div>

      {/* 结果 */}
      <div>
        {result ? (
          <ResultPanel>
            <div className="form-section">
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>计算结果</p>
              <div className="grid grid-cols-1 gap-3">
                <MetricCard label="年化收益率" value={fmtPct(result.annualizedReturn, 2)}
                  sub="按持有天数折算至年度" accentColor={isPositive ? "#22C55E" : "#EF4444"} />
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="总收益率" value={fmtPct(result.totalReturn, 4)} sub="期间实际涨幅"
                    accentColor={result.totalReturn >= 0 ? "#22C55E" : "#EF4444"} />
                  <MetricCard label="持有天数" value={fmtDays(result.holdingDays)}
                    sub={`${(result.holdingDays / 365).toFixed(1)} 年`} />
                </div>
              </div>
            </div>
            <div className="form-section">
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>净值变化</p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center rounded-[14px] p-4" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>期初净值</p>
                  <p className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{fmtNum(Number(form.startNav), 4)}</p>
                </div>
                <div className="flex flex-col items-center">
                  <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
                    <path d="M2 8h28M24 2l6 6-6 6" stroke={isPositive ? "#22C55E" : "#EF4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[10px] font-semibold mt-1" style={{ color: isPositive ? "#22C55E" : "#EF4444" }}>
                    {isPositive ? "+" : ""}{fmtPct(result.totalReturn, 2)}
                  </span>
                </div>
                <div className="flex-1 text-center rounded-[14px] p-4" style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
                  <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: "var(--text-muted)" }}>期末净值</p>
                  <p className="text-xl font-bold" style={{ color: isPositive ? "#22C55E" : "#EF4444" }}>{fmtNum(Number(form.endNav), 4)}</p>
                </div>
              </div>
            </div>
          </ResultPanel>
        ) : (
          <EmptyState icon="📐" text="填写起止净值并点击「计算年化收益」" />
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
