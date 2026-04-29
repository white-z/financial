"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { InputField } from "@/components/ui";
import { OKX_MAINSTREAM_ASSETS, type OkxAssetScope, type OkxDurationBucket, type OkxPrincipalMetrics } from "@/lib/finance/okx";
import { fmtPct, fmtUsdt, type OkxFilterPreset } from "./okx-dashboard.shared";

interface FilterWorkbenchProps {
  minDate: string;
  maxDate: string;
  startDate: string;
  endDate: string;
  assetScope: OkxAssetScope;
  availableLeverages: number[];
  excludedLeverages: number[];
  excludedHoldBuckets: OkxDurationBucket[];
  excludeTopProfit: boolean;
  excludeTopLoss: boolean;
  filteredCount: number;
  totalCount: number;
  invalidRange: boolean;
  activeFilters: string[];
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onAssetScopeChange: (value: OkxAssetScope) => void;
  onToggleLeverage: (value: number) => void;
  onToggleHoldBucket: (bucket: OkxDurationBucket) => void;
  onToggleTopProfit: () => void;
  onToggleTopLoss: () => void;
  onApplyPreset: (preset: OkxFilterPreset) => void;
  onReset: () => void;
}

interface LeverageFilterSelectProps {
  availableLeverages: number[];
  excludedLeverages: number[];
  onToggleLeverage: (value: number) => void;
}

function LeverageFilterSelect({ availableLeverages, excludedLeverages, onToggleLeverage }: LeverageFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const selectedPreview = excludedLeverages.slice(0, 3);
  const hiddenCount = Math.max(0, excludedLeverages.length - selectedPreview.length);
  const triggerTone = excludedLeverages.length > 0
    ? {
        borderColor: "rgba(223,182,97,0.28)",
        background: "linear-gradient(180deg, rgba(223,182,97,0.12), rgba(223,182,97,0.06))",
        text: "#f4ece1",
        subtext: "rgba(244,236,225,0.74)",
        badgeBg: "rgba(223,182,97,0.16)",
        badgeBorder: "rgba(223,182,97,0.24)",
        badgeText: "#dfb661",
      }
    : {
        borderColor: "rgba(196,176,146,0.14)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
        text: "#f4ece1",
        subtext: "rgba(214,197,176,0.56)",
        badgeBg: "rgba(255,255,255,0.04)",
        badgeBorder: "rgba(196,176,146,0.12)",
        badgeText: "rgba(214,197,176,0.68)",
      };
  const leverageGroups = useMemo(() => {
    const groups = [
      { key: "defensive", label: "低杠杆", values: availableLeverages.filter((value) => value <= 5) },
      { key: "balanced", label: "中杠杆", values: availableLeverages.filter((value) => value > 5 && value <= 20) },
      { key: "aggressive", label: "高杠杆", values: availableLeverages.filter((value) => value > 20) },
    ];

    return groups.filter((group) => group.values.length > 0);
  }, [availableLeverages]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative z-10">
      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
        杠杆样本
      </p>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="mt-2 flex w-full items-start justify-between gap-3 rounded-[20px] border px-4 py-3 text-left shadow-[0_18px_48px_rgba(8,6,5,0.18)] transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfb661] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15110f]"
        style={{ borderColor: triggerTone.borderColor, background: triggerTone.background }}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[13px] font-semibold" style={{ color: triggerTone.text }}>
              剔除指定杠杆样本
            </p>
            <span
              className="inline-flex min-h-6 items-center rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
              style={{ borderColor: triggerTone.badgeBorder, background: triggerTone.badgeBg, color: triggerTone.badgeText }}
            >
              {excludedLeverages.length > 0 ? `${excludedLeverages.length} 档已排除` : "多选"}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-5" style={{ color: triggerTone.subtext }}>
            {excludedLeverages.length > 0
              ? "这些杠杆档位会被整体从样本池移除。"
              : "打开后可按杠杆档位精细剔除，不影响其它过滤条件。"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {excludedLeverages.length > 0 ? (
              <>
                {selectedPreview.map((value) => (
                  <span
                    key={value}
                    className="rounded-full border px-2.5 py-1 text-[11px]"
                    style={{ borderColor: "rgba(223,182,97,0.24)", background: "rgba(223,182,97,0.1)", color: "#dfb661" }}
                  >
                    {value}x
                  </span>
                ))}
                {hiddenCount > 0 ? (
                  <span
                    className="rounded-full border px-2.5 py-1 text-[11px]"
                    style={{ borderColor: "rgba(196,176,146,0.16)", background: "rgba(255,255,255,0.02)", color: "rgba(214,197,176,0.64)" }}
                  >
                    +{hiddenCount}
                  </span>
                ) : null}
              </>
            ) : (
              <span
                className="rounded-full border px-2.5 py-1 text-[11px]"
                style={{ borderColor: "rgba(196,176,146,0.16)", background: "rgba(255,255,255,0.02)", color: "rgba(214,197,176,0.54)" }}
              >
                当前保留全部杠杆样本
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border text-[11px] transition"
            style={{
              borderColor: open ? "rgba(223,182,97,0.24)" : "rgba(196,176,146,0.14)",
              background: open ? "rgba(223,182,97,0.12)" : "rgba(255,255,255,0.03)",
              color: open ? "#dfb661" : "rgba(214,197,176,0.54)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: "rgba(214,197,176,0.44)" }}>
            {availableLeverages.length} 档可选
          </span>
        </div>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-30 rounded-[24px] border p-4 shadow-[0_32px_80px_rgba(8,6,5,0.42)] backdrop-blur-sm"
          style={{
            borderColor: "rgba(196,176,146,0.18)",
            background: "linear-gradient(180deg, rgba(28,23,20,0.98), rgba(17,14,13,0.98))",
          }}
        >
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: "rgba(196,176,146,0.12)" }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214, 197, 176, 0.48)" }}>
                Leverage curation
              </p>
              <p className="mt-1 text-[14px] font-semibold" style={{ color: "#f4ece1" }}>
                把不想参与回测的杠杆档位切出去
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (excludedLeverages.length === 0) return;
                  for (const value of excludedLeverages) {
                    onToggleLeverage(value);
                  }
                }}
                className="rounded-full border px-3 py-1.5 text-[11px] transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfb661] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15110f]"
                style={{ borderColor: "rgba(196,176,146,0.14)", color: "rgba(214,197,176,0.72)" }}
              >
                全部保留
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border px-3 py-1.5 text-[11px] transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfb661] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15110f]"
                style={{ borderColor: "rgba(223,182,97,0.22)", color: "#dfb661" }}
              >
                完成选择
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {leverageGroups.map((group) => (
              <section
                key={group.key}
                className="rounded-[20px] border p-3"
                style={{ borderColor: "rgba(196,176,146,0.1)", background: "rgba(255,255,255,0.02)" }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214,197,176,0.5)" }}>
                    {group.label}
                  </p>
                  <span className="text-[10px]" style={{ color: "rgba(214,197,176,0.4)" }}>
                    {group.values.length} 档
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(92px,1fr))] gap-2">
                  {group.values.map((value) => {
                    const active = excludedLeverages.includes(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onToggleLeverage(value)}
                        className="flex min-h-11 items-center justify-between rounded-[16px] border px-3 py-2 text-left transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dfb661] focus-visible:ring-offset-2 focus-visible:ring-offset-[#15110f]"
                        style={{
                          borderColor: active ? "rgba(223,182,97,0.24)" : "rgba(196,176,146,0.12)",
                          background: active ? "rgba(223,182,97,0.1)" : "rgba(255,255,255,0.02)",
                          color: active ? "#f4ece1" : "rgba(214,197,176,0.78)",
                        }}
                      >
                        <span className="num text-[13px] font-semibold">{value}x</span>
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full border text-[10px]"
                          style={{
                            borderColor: active ? "rgba(223,182,97,0.26)" : "rgba(196,176,146,0.12)",
                            background: active ? "rgba(223,182,97,0.14)" : "transparent",
                            color: active ? "#dfb661" : "rgba(214,197,176,0.34)",
                          }}
                        >
                          {active ? "−" : "+"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FilterWorkbench({
  minDate,
  maxDate,
  startDate,
  endDate,
  assetScope,
  availableLeverages,
  excludedLeverages,
  excludedHoldBuckets,
  excludeTopProfit,
  excludeTopLoss,
  filteredCount,
  totalCount,
  invalidRange,
  activeFilters,
  onStartDateChange,
  onEndDateChange,
  onAssetScopeChange,
  onToggleLeverage,
  onToggleHoldBucket,
  onToggleTopProfit,
  onToggleTopLoss,
  onApplyPreset,
  onReset,
}: FilterWorkbenchProps) {
  const filteredOutCount = totalCount - filteredCount;

  function buttonStyle(active: boolean) {
    return active
      ? {
          borderColor: "rgba(223,182,97,0.28)",
          background: "rgba(223,182,97,0.12)",
          color: "#f4ece1",
        }
      : {
          borderColor: "rgba(196,176,146,0.14)",
          background: "rgba(255,255,255,0.02)",
          color: "rgba(214, 197, 176, 0.72)",
        };
  }

  return (
    <section
      className="rounded-[24px] border p-4 sm:rounded-[28px] sm:p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.16)", background: "linear-gradient(180deg, rgba(29, 24, 21, 0.92), rgba(18, 16, 15, 0.96))" }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
            Strategy sandbox
          </p>
          <h2 className="mt-2 text-[1.1rem] font-semibold" style={{ color: "#f4ece1" }}>
            像切换交易剧本一样筛样本
          </h2>
          <p className="mt-1 max-w-[64ch] text-sm" style={{ color: "rgba(214, 197, 176, 0.66)" }}>
            把时间、标的池、交易节奏和极值样本拆开控制，所有图表、标签和风险面板都会实时重算。
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="self-start rounded-full border px-3 py-1.5 text-[12px] transition"
          style={{ borderColor: "rgba(214, 197, 176, 0.18)", color: "rgba(214, 197, 176, 0.72)" }}
        >
          重置筛选
        </button>
      </div>

      <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
        {[
          { key: "full-sample" as OkxFilterPreset, label: "原始全样本", caption: "恢复默认观察角度" },
          { key: "mainstream-swing" as OkxFilterPreset, label: "主流中线剧本", caption: "主流币 + 去超短线" },
          { key: "stress-test" as OkxFilterPreset, label: "去极值压力测试", caption: "剔除最大盈利单和最大亏损单" },
        ].map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onApplyPreset(preset.key)}
            className="max-w-full rounded-[18px] border px-3 py-2 text-left leading-4 transition sm:rounded-full"
            style={{ borderColor: "rgba(196,176,146,0.14)", background: "rgba(255,255,255,0.02)" }}
          >
            <span className="block text-[12px] font-semibold" style={{ color: "#f4ece1" }}>
              {preset.label}
            </span>
            <span className="block text-[10px]" style={{ color: "rgba(214, 197, 176, 0.54)" }}>
              {preset.caption}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <InputField
            label="起始平仓日"
            type="date"
            min={minDate}
            max={maxDate}
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
            hint={`最早可选 ${minDate}`}
          />
          <InputField
            label="结束平仓日"
            type="date"
            min={minDate}
            max={maxDate}
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
            hint={`最晚可选 ${maxDate}`}
          />
        </div>

        <div className="grid min-w-0 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              标的池
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAssetScopeChange("all")}
                className="max-w-full rounded-full border px-3 py-2 text-[12px] leading-4 transition"
                style={buttonStyle(assetScope === "all")}
              >
                全部标的
              </button>
              <button
                type="button"
                onClick={() => onAssetScopeChange("mainstream-only")}
                className="max-w-full rounded-[18px] border px-3 py-2 text-[12px] leading-4 transition sm:rounded-full"
                style={buttonStyle(assetScope === "mainstream-only")}
              >
                仅主流币 ({OKX_MAINSTREAM_ASSETS.join(" / ")})
              </button>
            </div>
          </div>

          <LeverageFilterSelect
            availableLeverages={availableLeverages}
            excludedLeverages={excludedLeverages}
            onToggleLeverage={onToggleLeverage}
          />

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              节奏过滤
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { bucket: "lt1h" as OkxDurationBucket, label: "剔除超短线" },
                { bucket: "1to24h" as OkxDurationBucket, label: "剔除日内波段" },
                { bucket: "gt24h" as OkxDurationBucket, label: "剔除趋势持仓" },
              ].map((item) => (
                <button
                  key={item.bucket}
                  type="button"
                  onClick={() => onToggleHoldBucket(item.bucket)}
                  className="max-w-full rounded-full border px-3 py-2 text-[12px] leading-4 transition"
                  style={buttonStyle(excludedHoldBuckets.includes(item.bucket))}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              极值样本
            </p>
          </div>
          <button
            type="button"
            aria-pressed={excludeTopProfit}
            onClick={onToggleTopProfit}
            className="max-w-full rounded-[18px] border px-4 py-3 text-left transition"
            style={buttonStyle(excludeTopProfit)}
          >
            <p className="text-[13px] font-semibold">剔除收益额最高的那笔</p>
            <p className="mt-1 text-[11px]" style={{ color: excludeTopProfit ? "rgba(244,236,225,0.72)" : "rgba(214,197,176,0.54)" }}>
              用来判断净值是否过度依赖一笔爆发单。
            </p>
          </button>
          <button
            type="button"
            aria-pressed={excludeTopLoss}
            onClick={onToggleTopLoss}
            className="max-w-full rounded-[18px] border px-4 py-3 text-left transition"
            style={buttonStyle(excludeTopLoss)}
          >
            <p className="text-[13px] font-semibold">剔除亏损额最高的那笔</p>
            <p className="mt-1 text-[11px]" style={{ color: excludeTopLoss ? "rgba(244,236,225,0.72)" : "rgba(214,197,176,0.54)" }}>
              用来观察系统是否只是被个别失控单拖累。
            </p>
          </button>
        </div>

        <div className="rounded-[22px] border p-4 lg:col-span-2 xl:col-span-2" style={{ borderColor: "rgba(196,176,146,0.14)", background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
            当前样本
          </p>
          <p className="mt-2 num text-[1.45rem] font-semibold" style={{ color: "#f4ece1" }}>
            {filteredCount}
            <span className="text-[0.95rem]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
              {" "}
              / {totalCount} 笔
            </span>
          </p>
          <p className="mt-2 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
            {invalidRange
              ? "起始日期晚于结束日期，当前筛选无效。"
              : filteredOutCount > 0
                ? `当前已过滤掉 ${filteredOutCount} 笔交易，下面所有图表和标签都基于剩余样本重算。`
                : "当前展示全量样本，下面所有图表和标签都是原始统计。"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {activeFilters.length > 0 ? (
              activeFilters.map((item) => (
                <span
                  key={item}
                  className="rounded-full border px-3 py-1 text-[11px]"
                  style={{ borderColor: "rgba(223,182,97,0.18)", color: "#dfb661", background: "rgba(223,182,97,0.08)" }}
                >
                  {item}
                </span>
              ))
            ) : (
              <span
                className="rounded-full border px-3 py-1 text-[11px]"
                style={{ borderColor: "rgba(196,176,146,0.12)", color: "rgba(214, 197, 176, 0.58)", background: "rgba(255,255,255,0.02)" }}
              >
                当前没有启用额外过滤
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

interface PrincipalPanelProps {
  principalInput: string;
  principalValue: number | null;
  principalMetrics: OkxPrincipalMetrics | null;
  onChange: (value: string) => void;
  onClear: () => void;
}

export function PrincipalPanel({ principalInput, principalValue, principalMetrics, onChange, onClear }: PrincipalPanelProps) {
  return (
    <section
      className="rounded-[24px] border p-4 sm:rounded-[28px] sm:p-5"
      style={{
        borderColor: "rgba(196, 176, 146, 0.16)",
        background: "linear-gradient(180deg, rgba(29, 24, 21, 0.92), rgba(18, 16, 15, 0.96))",
      }}
    >
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
            Principal
          </p>
          <h2 className="mt-2 text-[1.1rem] font-semibold" style={{ color: "#f4ece1" }}>
            输入充值本金，切换为真实资金分析
          </h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(214, 197, 176, 0.66)" }}>
            仅缓存到当前浏览器本地，不上传。输入后会联动本金 ROI、资金回撤、最低资金水位与资金曲线。
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="self-start rounded-full border px-3 py-1.5 text-[12px] transition"
          style={{ borderColor: "rgba(214, 197, 176, 0.18)", color: "rgba(214, 197, 176, 0.72)" }}
        >
          清空缓存
        </button>
      </div>
      <InputField
        label="充值本金"
        type="number"
        placeholder="3000"
        unit="USDT"
        value={principalInput}
        onChange={(event) => onChange(event.target.value)}
        hint={principalValue ? `当前按 ${fmtUsdt(principalValue)} 重建资金轨迹` : "例如 3000；为空时保留纯收益视角"}
      />
      {principalInput.trim() && !principalValue && (
        <p className="mt-2 text-[12px]" style={{ color: "#f39ba6" }}>
          请输入大于 0 的本金数值。
        </p>
      )}
      {principalMetrics && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "rgba(155,211,174,0.22)", background: "rgba(155,211,174,0.08)" }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(155,211,174,0.72)" }}>
              资金终值
            </p>
            <p className="mt-2 num text-[1.25rem] font-semibold" style={{ color: "#9bd3ae" }}>
              {fmtUsdt(principalMetrics.currentCapital)}
            </p>
          </div>
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "rgba(223,182,97,0.22)", background: "rgba(223,182,97,0.08)" }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(223,182,97,0.72)" }}>
              本金回报率
            </p>
            <p className="mt-2 num text-[1.25rem] font-semibold" style={{ color: "#dfb661" }}>
              {fmtPct(principalMetrics.principalRoi)}
            </p>
          </div>
          <div className="rounded-[18px] border px-4 py-3" style={{ borderColor: "rgba(243,155,166,0.22)", background: "rgba(243,155,166,0.08)" }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(243,155,166,0.72)" }}>
              风险提示
            </p>
            <p className="mt-2 text-[13px] font-medium" style={{ color: "#f4ece1" }}>
              {principalMetrics.didBreachZero ? "历史波动会击穿这笔本金" : "这笔本金能承受历史路径中的所有回撤"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

export function NoSampleState() {
  return (
    <section
      className="mt-6 rounded-[24px] border p-5 sm:rounded-[28px] sm:p-6"
      style={{ borderColor: "rgba(196, 176, 146, 0.16)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
        No sample
      </p>
      <h2 className="mt-2 text-[1.1rem] font-semibold" style={{ color: "#f4ece1" }}>
        当前筛选后没有剩余交易
      </h2>
      <p className="mt-2 max-w-[62ch] text-sm leading-6" style={{ color: "rgba(214, 197, 176, 0.66)" }}>
        把时间范围放宽，或关闭“剔除收益额最高 / 亏损额最高”中的一个开关，页面会立刻恢复并重新计算所有分析。
      </p>
    </section>
  );
}
