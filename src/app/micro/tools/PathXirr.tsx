"use client";

import { useState, useEffect } from "react";
import { FormSection, InputField, MetricCard, ResultPanel } from "@/components/ui";
import { calculatePathXirr, type PathXirrResult } from "@/lib/finance/micro-path-xirr";
import { fmtCNY, fmtPct, fmtDays } from "@/lib/format";

interface FlowEntry { date: string; amount: string; }
interface FormState {
  initialDate: string; initialAmount: string;
  endDate: string;     finalValue: string;
}

const INITIAL_FORM: FormState = { initialDate: "", initialAmount: "", endDate: "", finalValue: "" };

function isFlowEntry(x: unknown): x is FlowEntry {
  return typeof x === "object" && x !== null && "date" in x && "amount" in x;
}

function validate(form: FormState, extras: FlowEntry[]) {
  const fe: Partial<Record<keyof FormState, string>> = {};
  const ee: string[] = extras.map(() => "");
  if (!form.initialDate) fe.initialDate = "请选择初始投入日期";
  if (!form.initialAmount || Number(form.initialAmount) <= 0) fe.initialAmount = "初始金额须大于 0";
  if (!form.endDate) fe.endDate = "请选择截止日期";
  if (!form.finalValue || Number(form.finalValue) < 0) fe.finalValue = "期末价值不能为负";
  if (form.initialDate && form.endDate && new Date(form.endDate) <= new Date(form.initialDate))
    fe.endDate = "截止日期须晚于初始投入日期";
  extras.forEach((e, i) => {
    if (e.date && !e.amount) ee[i] = "请填写补仓金额";
    if (!e.date && e.amount) ee[i] = "请填写补仓日期";
    if (e.date && form.initialDate && new Date(e.date) < new Date(form.initialDate))
      ee[i] = "补仓日期须晚于初始投入";
  });
  return { form: fe, extras: ee };
}

interface PathXirrToolProps {
  initialInput?: Record<string, unknown> | null;
}

export function PathXirrTool({ initialInput }: PathXirrToolProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [extras, setExtras] = useState<FlowEntry[]>([]);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [extraErrors, setExtraErrors] = useState<string[]>([]);
  const [result, setResult] = useState<PathXirrResult | null>(null);
  const [calcError, setCalcError] = useState("");

  useEffect(() => {
    if (!initialInput || typeof initialInput !== "object") return;
    const nextForm = { ...INITIAL_FORM };
    if (initialInput.initialDate !== undefined) nextForm.initialDate = String(initialInput.initialDate);
    if (initialInput.initialAmount !== undefined) nextForm.initialAmount = String(initialInput.initialAmount);
    if (initialInput.endDate !== undefined) nextForm.endDate = String(initialInput.endDate);
    if (initialInput.finalValue !== undefined) nextForm.finalValue = String(initialInput.finalValue);
    const hasForm = nextForm.initialDate !== "" || nextForm.initialAmount !== "" || nextForm.endDate !== "" || nextForm.finalValue !== "";
    if (hasForm) setForm(nextForm);
    const rawExtras = initialInput.extras;
    if (Array.isArray(rawExtras) && rawExtras.length > 0) {
      const entries: FlowEntry[] = rawExtras.map((e) =>
        isFlowEntry(e) ? { date: String(e.date), amount: String(e.amount) } : { date: "", amount: "" }
      ).filter((e) => e.date !== "" || e.amount !== "");
      if (entries.length > 0) setExtras(entries);
    }
  }, [initialInput]);

  const setF = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setExtra = (i: number, k: keyof FlowEntry) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setExtras(prev => prev.map((row, idx) => idx === i ? { ...row, [k]: e.target.value } : row));
  const addRow = () => setExtras(prev => [...prev, { date: "", amount: "" }]);
  const removeRow = (i: number) => setExtras(prev => prev.filter((_, idx) => idx !== i));

  function handleCalc() {
    const { form: fe, extras: ee } = validate(form, extras);
    setFormErrors(fe);
    setExtraErrors(ee);
    setCalcError("");
    if (Object.keys(fe).length > 0 || ee.some(e => e !== "")) return;
    try {
      const cashFlows = [
        { date: new Date(form.initialDate), amount: -Math.abs(Number(form.initialAmount)) },
        ...extras.filter(r => r.date && r.amount).map(r => ({
          date: new Date(r.date),
          amount: -Math.abs(Number(r.amount)),
        })),
      ];
      setResult(calculatePathXirr({ cashFlows, finalValue: Number(form.finalValue), endDate: new Date(form.endDate) }));
    } catch (e) {
      setCalcError("计算失败，请检查输入数据（XIRR 未收敛）");
      console.error(e);
    }
  }

  const isPositive = result && result.xirrRate >= 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* 输入 */}
      <div className="space-y-4">
        <FormSection title="初始投入">
          <InputField label="初始买入日期" type="date" value={form.initialDate} onChange={setF("initialDate")} error={formErrors.initialDate} />
          <InputField label="初始投入金额" type="number" placeholder="10000" unit="元" value={form.initialAmount} onChange={setF("initialAmount")} error={formErrors.initialAmount} />
        </FormSection>

        {/* 动态补仓 */}
        <div className="form-section">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>补仓记录（可选）</p>
            <button onClick={addRow} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{ background: "rgba(168,85,247,0.12)", color: "#A855F7", border: "1px solid rgba(168,85,247,0.2)" }}>
              + 添加补仓
            </button>
          </div>
          {extras.length === 0 && (
            <p className="text-[12px] text-center py-3" style={{ color: "var(--text-muted)" }}>无补仓记录（单笔投入）</p>
          )}
          <div className="space-y-3">
            {extras.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <InputField label={`补仓 ${i + 1} 日期`} type="date" value={row.date} onChange={setExtra(i, "date")} error={extraErrors[i]} />
                  <InputField label="金额" type="number" placeholder="5000" unit="元" value={row.amount} onChange={setExtra(i, "amount")} />
                </div>
                <button onClick={() => removeRow(i)}
                  className="mt-[26px] flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">✕</button>
              </div>
            ))}
          </div>
        </div>

        <FormSection title="截止信息">
          <InputField label="截止日期" type="date" value={form.endDate} onChange={setF("endDate")} error={formErrors.endDate} />
          <InputField label="期末持仓总价值" type="number" placeholder="12000" unit="元"
            value={form.finalValue} onChange={setF("finalValue")} error={formErrors.finalValue}
            hint="期末净值 × 持有份数，或直接输入市值" />
        </FormSection>
        {calcError && <p className="text-[12px] text-red-500 px-1">{calcError}</p>}
        <button className="btn-primary" onClick={handleCalc}>计算 XIRR 年化收益</button>
      </div>

      {/* 结果 */}
      <div>
        {result ? (
          <ResultPanel>
            <div className="form-section">
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-4" style={{ color: "var(--text-muted)" }}>XIRR 计算结果</p>
              <div className="grid grid-cols-2 gap-3">
                <MetricCard label="XIRR 年化收益率" value={fmtPct(result.xirrRate, 2)}
                  sub="含不规则现金流的真实年化" accentColor={isPositive ? "#A855F7" : "#EF4444"} className="col-span-2" />
                <MetricCard label="累计投入本金" value={fmtCNY(result.totalInvested)} sub="各笔投入总和" />
                <MetricCard label="累计收益" value={fmtCNY(result.profit)} sub="期末价值 - 总投入"
                  accentColor={result.profit >= 0 ? "#22C55E" : "#EF4444"} />
                <MetricCard label="持有天数" value={fmtDays(result.holdingDays)} sub={`${(result.holdingDays / 365).toFixed(1)} 年`} />
                <MetricCard label="期末总价值" value={fmtCNY(Number(form.finalValue))} sub="含本金与收益" />
              </div>
            </div>
            <div className="form-section">
              <p className="text-[11px] font-semibold tracking-widest uppercase mb-5" style={{ color: "var(--text-muted)" }}>本金 / 收益构成</p>
              <div className="flex items-center gap-6">
                <div className="pie-ring shrink-0" style={{
                  background: `conic-gradient(#A855F7 0% ${(result.principalRatio * 100).toFixed(1)}%, ${result.profit >= 0 ? "#22C55E" : "#EF4444"} ${(result.principalRatio * 100).toFixed(1)}% 100%)`,
                }} />
                <div className="space-y-2.5 flex-1">
                  {[
                    { label: "本金", color: "#A855F7", ratio: result.principalRatio, value: result.totalInvested },
                    { label: result.profit >= 0 ? "收益" : "亏损", color: result.profit >= 0 ? "#22C55E" : "#EF4444", ratio: result.profitRatio, value: Math.abs(result.profit) },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                        {row.label}
                      </span>
                      <span className="font-semibold" style={{ color: row.color }}>
                        {fmtPct(row.ratio, 1)} — {fmtCNY(row.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ResultPanel>
        ) : (
          <EmptyState icon="📉" text="填写投资记录并点击「计算 XIRR 年化收益」" />
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
