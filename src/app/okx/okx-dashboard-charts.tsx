"use client";

import { useId } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  OkxBarPoint,
  OkxCapitalSeriesPoint,
  OkxMedianRegressionMetric,
  OkxScatterPoint,
  OkxSeriesPoint,
} from "@/lib/finance/okx";
import { compactDateLabel, fmtDigits, fmtPct, fmtSignedUsdt, fmtUsdt, PALETTE, pickTicks } from "./okx-dashboard.shared";

function buildLinePath(values: number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return { x, y };
  });

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L ${points[points.length - 1].x.toFixed(2)} ${height} L ${points[0].x.toFixed(2)} ${height} Z`;
  const zeroY = min <= 0 && max >= 0 ? height - ((0 - min) / range) * height : null;

  return { line, area, zeroY, min, max };
}

function fmtHoursShort(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}分钟`;
  if (hours < 24) return `${hours.toFixed(1)}小时`;
  return `${(hours / 24).toFixed(1)}天`;
}

function formatMedianRegressionValue(item: OkxMedianRegressionMetric, value: number): string {
  if (item.key === "netPnl") return fmtSignedUsdt(value, 2);
  if (item.key === "holdHours") return fmtHoursShort(value);
  return fmtUsdt(value, 2);
}

function describeMedianRegressionDelta(item: OkxMedianRegressionMetric): string {
  const delta = item.currentValue - item.baselineValue;
  if (Math.abs(delta) < 1e-9) return "几乎贴着中轴";

  return `${delta > 0 ? "高于" : "低于"}中位数 ${formatMedianRegressionValue(item, Math.abs(delta))}`;
}

function medianRegressionTone(item: OkxMedianRegressionMetric, delta: number): { fg: string; soft: string } {
  if (item.key === "netPnl") {
    return delta >= 0
      ? { fg: "#9bd3ae", soft: "rgba(155, 211, 174, 0.18)" }
      : { fg: "#f39ba6", soft: "rgba(243, 155, 166, 0.18)" };
  }

  return delta >= 0
    ? { fg: "#dfb661", soft: "rgba(223, 182, 97, 0.18)" }
    : { fg: "#8fb8a6", soft: "rgba(143, 184, 166, 0.18)" };
}

interface HeroCurveProps {
  title: string;
  subtitle: string;
  points: Array<OkxSeriesPoint | OkxCapitalSeriesPoint>;
  valueAccessor: (point: OkxSeriesPoint | OkxCapitalSeriesPoint) => number;
  color: string;
  fill: string;
  yFormatter: (value: number) => string;
}

export function HeroCurve({ title, subtitle, points, valueAccessor, color, fill, yFormatter }: HeroCurveProps) {
  const gradientId = useId().replace(/:/g, "");
  const width = 760;
  const height = 240;
  const values = points.map(valueAccessor);
  const { line, area, zeroY, min, max } = buildLinePath(values, width, height);
  const ticks = pickTicks(points, 5);

  return (
    <section
      className="min-w-0 overflow-hidden rounded-[24px] border p-4 sm:rounded-[28px] sm:p-6"
      style={{
        borderColor: "rgba(196, 176, 146, 0.16)",
        background: "linear-gradient(180deg, rgba(29, 24, 21, 0.92), rgba(18, 16, 15, 0.96))",
      }}
    >
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
            Curve
          </p>
          <h2 className="mt-2 text-[1.15rem] font-semibold" style={{ color: "#f4ece1" }}>
            {title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: "rgba(214, 197, 176, 0.68)" }}>
            {subtitle}
          </p>
        </div>
        <div className="text-left text-[12px] sm:text-right" style={{ color: "rgba(214, 197, 176, 0.76)" }}>
          <div>区间下沿 {yFormatter(min)}</div>
          <div>区间上沿 {yFormatter(max)}</div>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <svg viewBox={`0 0 ${width} ${height + 28}`} className="h-auto min-w-[34rem] w-full overflow-visible sm:min-w-0">
          <defs>
            <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" stopColor={fill} stopOpacity="0.55" />
              <stop offset="100%" stopColor={fill} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {zeroY !== null && (
            <line
              x1="0"
              x2={width}
              y1={zeroY}
              y2={zeroY}
              stroke="rgba(214, 197, 176, 0.18)"
              strokeDasharray="5 7"
            />
          )}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
          {ticks.map((tick) => {
            const index = points.findIndex((point) => point.label === tick);
            const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
            return (
              <g key={tick}>
                <line x1={x} x2={x} y1={height + 4} y2={height + 12} stroke="rgba(214, 197, 176, 0.22)" />
                <text x={x} y={height + 24} textAnchor="middle" fill="rgba(214, 197, 176, 0.54)" fontSize="11">
                  {tick.slice(5)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

interface FlowBarsProps {
  title: string;
  subtitle: string;
  points: OkxBarPoint[];
}

export function FlowBars({ title, subtitle, points }: FlowBarsProps) {
  const peak = Math.max(...points.map((point) => Math.abs(point.netPnl)), 1);
  const ticks = new Set(pickTicks(points, 5));
  const best = points.reduce((current, point) => (point.netPnl > current.netPnl ? point : current), points[0]);
  const worst = points.reduce((current, point) => (point.netPnl < current.netPnl ? point : current), points[0]);
  const last = points[points.length - 1];
  ticks.add(best.label);
  ticks.add(worst.label);
  ticks.add(last.label);

  return (
    <section
      className="min-w-0 rounded-[24px] border p-4 sm:p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          {title}
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          {subtitle}
        </p>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {[
          { label: "最佳窗口", point: best, tone: "#9bd3ae" },
          { label: "最差窗口", point: worst, tone: "#f39ba6" },
          { label: "最新窗口", point: last, tone: "#dfb661" },
        ].map(({ label, point, tone }) => (
          <div key={label} className="rounded-[18px] border px-4 py-3" style={{ borderColor: `${tone}33`, background: `${tone}14` }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: `${tone}cc` }}>
              {label}
            </p>
            <p className="mt-2 num text-[1.1rem] font-semibold" style={{ color: "#f4ece1" }}>
              {fmtSignedUsdt(point.netPnl)}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.62)" }}>
              {compactDateLabel(point.label)}
            </p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto pb-2">
        <div
          className="grid h-52 min-w-max grid-flow-col auto-cols-[minmax(24px,1fr)] items-end gap-1.5"
          style={{ minWidth: `${Math.max(440, points.length * 28)}px` }}
        >
          {points.map((point) => {
            const height = `${Math.max(10, (Math.abs(point.netPnl) / peak) * 100)}%`;
            const positive = point.netPnl >= 0;
            const highlighted = ticks.has(point.label);

            return (
              <div key={point.label} className="flex min-w-0 flex-col items-center gap-2">
                <span
                  className="num h-4 text-[10px] leading-none"
                  style={{ color: highlighted ? (positive ? "#9bd3ae" : "#f39ba6") : "transparent" }}
                >
                  {highlighted ? `${point.netPnl >= 0 ? "+" : ""}${Math.round(point.netPnl)}` : "0"}
                </span>
                <div
                  className="relative flex h-full w-full items-end justify-center overflow-hidden rounded-t-[16px] rounded-b-[8px]"
                  style={{ background: highlighted ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.035)" }}
                >
                  <div
                    className="w-full rounded-t-[16px]"
                    style={{
                      height,
                      background: positive
                        ? "linear-gradient(180deg, rgba(155,211,174,0.96), rgba(95,169,127,0.55))"
                        : "linear-gradient(180deg, rgba(243,155,166,0.88), rgba(196,91,106,0.45))",
                      opacity: highlighted ? 1 : 0.72,
                    }}
                  />
                </div>
                <span
                  className="text-[10px] whitespace-nowrap"
                  style={{ color: highlighted ? "rgba(214, 197, 176, 0.72)" : "rgba(214, 197, 176, 0.18)" }}
                >
                  {highlighted ? compactDateLabel(point.label) : "·"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

interface BreakdownStatCardProps {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; accent?: string; detail?: string }>;
  total: number;
}

export function BreakdownStatCard({ title, subtitle, items, total }: BreakdownStatCardProps) {
  return (
    <section
      className="min-w-0 rounded-[24px] border p-4 sm:p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          {title}
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          {subtitle}
        </p>
      </div>

      <div className="grid gap-2">
        {items.map((item, index) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          const accent = item.accent ?? PALETTE[index % PALETTE.length];
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: accent }} />
                  <span className="truncate text-[13px] font-medium" style={{ color: "#f4ece1" }}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="num text-[1.1rem] font-semibold" style={{ color: accent }}>
                    {item.value}
                  </span>
                  <span className="num text-[11px]" style={{ color: "rgba(214,197,176,0.45)" }}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(214,197,176,0.08)" }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: accent, opacity: 0.7 }}
                />
              </div>
              {item.detail && (
                <p className="mt-0.5 text-[11px]" style={{ color: "rgba(214,197,176,0.5)" }}>
                  {item.detail}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

interface ScatterPlotProps {
  title: string;
  subtitle: string;
  points: OkxScatterPoint[];
  xFormatter: (value: number) => string;
}

export function ScatterPlot({ title, subtitle, points, xFormatter }: ScatterPlotProps) {
  const width = 560;
  const height = 260;
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const minY = Math.min(...points.map((point) => point.y), 0);
  const maxY = Math.max(...points.map((point) => point.y), 0);
  const yRange = maxY - minY || 1;
  const zeroY = height - ((0 - minY) / yRange) * height;

  return (
    <section
      className="min-w-0 rounded-[24px] border p-4 sm:p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          {title}
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          {subtitle}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <svg viewBox={`0 0 ${width} ${height + 30}`} className="h-auto min-w-[28rem] w-full sm:min-w-0">
          <line x1="0" x2={width} y1={zeroY} y2={zeroY} stroke="rgba(214, 197, 176, 0.18)" strokeDasharray="5 7" />
          <line x1="0" x2="0" y1="0" y2={height} stroke="rgba(214, 197, 176, 0.18)" />
          {points.map((point, index) => {
            const x = (point.x / maxX) * width;
            const y = height - ((point.y - minY) / yRange) * height;
            const color = point.y >= 0 ? "#9bd3ae" : "#f39ba6";
            return (
              <circle
                key={`${point.asset}-${point.x}-${point.y}-${index}`}
                cx={x}
                cy={y}
                r="5.5"
                fill={color}
                fillOpacity="0.8"
                stroke={`${color}66`}
                strokeWidth="4"
              />
            );
          })}
          {[0, 0.5, 1].map((ratio) => {
            const x = ratio * width;
            const value = ratio * maxX;
            return (
              <g key={ratio}>
                <line x1={x} x2={x} y1={height + 2} y2={height + 10} stroke="rgba(214, 197, 176, 0.18)" />
                <text x={x} y={height + 24} textAnchor="middle" fill="rgba(214, 197, 176, 0.52)" fontSize="11">
                  {xFormatter(value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}

interface MedianRegressionBarsProps {
  items: OkxMedianRegressionMetric[];
}

interface MetricBarCardProps {
  item: OkxMedianRegressionMetric;
}

const HISTOGRAM_BINS = 20;

function buildHistogram(values: number[], bins: number): Array<{ binStart: number; binEnd: number; count: number }> {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = range / bins;

  const result = Array.from({ length: bins }, (_, i) => ({
    binStart: min + i * step,
    binEnd: min + (i + 1) * step,
    count: 0,
  }));

  for (const v of values) {
    const idx = Math.min(bins - 1, Math.floor((v - min) / step));
    result[idx].count += 1;
  }

  return result;
}

function MetricBarCard({ item }: MetricBarCardProps) {
  const delta = item.currentValue - item.baselineValue;
  const tone = medianRegressionTone(item, delta);

  const bins = buildHistogram(item.values, HISTOGRAM_BINS);
  const chartData = bins.map((b) => ({
    binMid: (b.binStart + b.binEnd) / 2,
    binLabel: formatMedianRegressionValue(item, (b.binStart + b.binEnd) / 2),
    binRange: `${formatMedianRegressionValue(item, b.binStart)} ~ ${formatMedianRegressionValue(item, b.binEnd)}`,
    count: b.count,
  }));

  return (
    <div
      className="rounded-[20px] border p-4"
      style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214,197,176,0.56)" }}>
            {item.label}
          </p>
          <p className="mt-1 num text-[1.35rem] font-semibold" style={{ color: tone.fg }}>
            {formatMedianRegressionValue(item, item.currentValue)}
            <span className="ml-2 text-[12px] font-normal" style={{ color: "rgba(214,197,176,0.5)" }}>
              均值
            </span>
          </p>
        </div>
        <span
          className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] leading-4"
          style={{ borderColor: `${tone.fg}40`, background: tone.soft, color: tone.fg }}
        >
          {describeMedianRegressionDelta(item)}
        </span>
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={chartData} barCategoryGap="8%" margin={{ top: 16, right: 4, bottom: 0, left: 0 }}>
          <XAxis dataKey="binLabel" hide />
          <YAxis
            allowDecimals={false}
            tickCount={4}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "rgba(214,197,176,0.45)" }}
            tickFormatter={(v) => `${v}笔`}
            width={32}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            contentStyle={{
              background: "rgba(24,20,18,0.96)",
              border: "1px solid rgba(196,176,146,0.18)",
              borderRadius: 10,
              fontSize: 12,
              color: "#f4ece1",
            }}
            itemStyle={{ color: "#f4ece1" }}
            labelStyle={{ color: "rgba(214,197,176,0.6)" }}
            formatter={(value) => [`${value} 笔`, "交易数"]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.binRange ?? ""}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {chartData.map((entry) => {
              const distFromMedian = Math.abs(entry.binMid - item.baselineValue) / (item.maxValue - item.minValue || 1);
              const opacity = Math.max(0.25, 1 - distFromMedian * 1.6);
              return <Cell key={entry.binMid} fill={tone.fg} fillOpacity={opacity} />;
            })}
          </Bar>
          {/* 中位数参考线 */}
          <ReferenceLine
            x={formatMedianRegressionValue(item, item.baselineValue)}
            stroke="#f4ece1"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{ value: "中位数", position: "top", fontSize: 10, fill: "rgba(244,236,225,0.6)" }}
          />
          {/* 均值参考线（仅当与中位数差距明显时显示） */}
          {Math.abs(delta) / (item.maxValue - item.minValue || 1) > 0.03 && (
            <ReferenceLine
              x={formatMedianRegressionValue(item, item.currentValue)}
              stroke={tone.fg}
              strokeWidth={1.5}
              label={{ value: "均值", position: "top", fontSize: 10, fill: tone.fg }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-1 flex justify-between text-[11px]" style={{ color: "rgba(214,197,176,0.4)" }}>
        <span>{formatMedianRegressionValue(item, item.minValue)}</span>
        <span>{formatMedianRegressionValue(item, item.maxValue)}</span>
      </div>
    </div>
  );
}

export function MedianRegressionBars({ items }: MedianRegressionBarsProps) {
  return (
    <section
      className="min-w-0 rounded-[24px] border p-4 sm:p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-5">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          分布直方图
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          每笔交易按数值分桶，柱越高代表越多笔落在该区间。白色虚线为中位数，彩色线为均值。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <MetricBarCard key={item.key} item={item} />
        ))}
      </div>
    </section>
  );
}
