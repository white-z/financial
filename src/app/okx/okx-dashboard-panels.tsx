"use client";

import { MetricCard } from "@/components/ui";
import {
  type OkxAnalytics,
  type OkxBreakdownItem,
  type OkxDeskBriefing,
  type OkxLabel,
  type OkxPrincipalMetrics,
} from "@/lib/finance/okx";
import {
  assetColor,
  assetGlyph,
  fmtHours,
  fmtPct,
  fmtSignedUsdt,
  fmtUsdt,
  isLowSample,
  labelTone,
  leverageColor,
  leverageGlyph,
  OKX_LOW_SAMPLE_THRESHOLD,
} from "./okx-dashboard.shared";

interface OverviewMetricCardsProps {
  analytics: OkxAnalytics;
  principalMetrics: OkxPrincipalMetrics | null;
}

export function OverviewMetricCards({ analytics, principalMetrics }: OverviewMetricCardsProps) {
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 2xl:grid-cols-4">
      <MetricCard
        label="净盈亏"
        value={fmtSignedUsdt(analytics.overview.netPnl)}
        sub={`毛利润 ${fmtSignedUsdt(analytics.overview.grossPnl)} · 手续费 ${fmtUsdt(analytics.overview.totalFees)}`}
        accentColor={analytics.overview.netPnl >= 0 ? "#9bd3ae" : "#f39ba6"}
        style={{ background: "rgba(24, 20, 18, 0.92)" }}
      />
      <MetricCard
        label={principalMetrics ? "本金 ROI" : "利润因子"}
        value={principalMetrics ? fmtPct(principalMetrics.principalRoi) : analytics.overview.profitFactor.toFixed(2)}
        sub={principalMetrics ? `当前资金 ${fmtUsdt(principalMetrics.currentCapital)}` : `胜率 ${fmtPct(analytics.overview.winRate)}`}
        accentColor="#dfb661"
        style={{ background: "rgba(24, 20, 18, 0.92)" }}
      />
      <MetricCard
        label={principalMetrics ? "最大资金回撤" : "利润回撤"}
        value={principalMetrics ? fmtPct(principalMetrics.maxDrawdownRatio) : fmtPct(analytics.overview.maxProfitDrawdownRatio)}
        sub={
          principalMetrics
            ? `峰谷回撤 ${fmtUsdt(principalMetrics.maxDrawdownAmount)}`
            : `利润峰谷 ${fmtUsdt(analytics.overview.maxProfitDrawdownAmount)}`
        }
        accentColor="#f39ba6"
        style={{ background: "rgba(24, 20, 18, 0.92)" }}
      />
      <MetricCard
        label={principalMetrics ? "最低资金水位" : "累计低谷"}
        value={principalMetrics ? fmtUsdt(principalMetrics.lowestCapital) : fmtSignedUsdt(analytics.overview.lowestCumulativeNet)}
        sub={
          principalMetrics && principalMetrics.didBreachZero
            ? "曾跌破 0，说明本金不足以覆盖波动"
            : `平均杠杆 ${analytics.overview.avgLeverage.toFixed(1)}x`
        }
        accentColor={principalMetrics?.didBreachZero ? "#f39ba6" : "#8fb8a6"}
        style={{ background: "rgba(24, 20, 18, 0.92)" }}
      />
    </div>
  );
}

export function DeskBriefing({
  headline,
  summary,
  primaryEdge,
  mainLeak,
  bullets,
  actionItems,
  watchItems,
}: OkxDeskBriefing) {
  return (
    <section
      className="min-w-0 rounded-[24px] border p-4 sm:rounded-[30px] sm:p-6"
      style={{
        borderColor: "rgba(196, 176, 146, 0.16)",
        background:
          "radial-gradient(circle at top right, rgba(223, 182, 97, 0.12), transparent 34%), linear-gradient(180deg, rgba(29, 24, 21, 0.94), rgba(18, 16, 15, 0.98))",
      }}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: "rgba(214, 197, 176, 0.58)" }}>
            Desk verdict
          </p>
          <h2 className="mt-3 text-[1.45rem] font-semibold leading-tight" style={{ color: "#f4ece1" }}>
            {headline}
          </h2>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-6" style={{ color: "rgba(214, 197, 176, 0.72)" }}>
            {summary}
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[22px] border px-5 py-4" style={{ borderColor: "rgba(155,211,174,0.24)", background: "rgba(155,211,174,0.08)" }}>
              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(155,211,174,0.82)" }}>
                主利润引擎
              </p>
              <p className="mt-2 text-[1.02rem] font-semibold" style={{ color: "#f4ece1" }}>
                {primaryEdge.title}
              </p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.68)" }}>
                {primaryEdge.detail}
              </p>
            </div>

            <div className="rounded-[22px] border px-5 py-4" style={{ borderColor: "rgba(243,155,166,0.22)", background: "rgba(243,155,166,0.08)" }}>
              <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "rgba(243,155,166,0.82)" }}>
                主要风险泄漏
              </p>
              <p className="mt-2 text-[1.02rem] font-semibold" style={{ color: "#f4ece1" }}>
                {mainLeak.title}
              </p>
              <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.68)" }}>
                {mainLeak.detail}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {bullets.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-[18px] border px-4 py-3"
                style={{ borderColor: "rgba(196,176,146,0.12)", background: "rgba(255,255,255,0.02)" }}
              >
                <span className="mt-1 h-2.5 w-2.5 rounded-full" style={{ background: "#dfb661", boxShadow: "0 0 0 5px rgba(223,182,97,0.12)" }} />
                <p className="text-[13px] leading-6" style={{ color: "rgba(244, 236, 225, 0.82)" }}>
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <section className="rounded-[24px] border p-5" style={{ borderColor: "rgba(223,182,97,0.18)", background: "rgba(223,182,97,0.06)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(223,182,97,0.82)" }}>
              马上执行
            </p>
            <div className="mt-3 grid gap-3">
              {actionItems.map((item, index) => (
              <div key={item} className="flex gap-3">
                <span className="num text-[12px] font-semibold" style={{ color: "#dfb661" }}>
                  {index + 1}.
                </span>
                <p className="min-w-0 text-[13px] leading-6" style={{ color: "#f4ece1" }}>
                  {item}
                </p>
              </div>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border p-5" style={{ borderColor: "rgba(196,176,146,0.14)", background: "rgba(24, 20, 18, 0.9)" }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              低样本提醒
            </p>
            <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
              少于 {OKX_LOW_SAMPLE_THRESHOLD} 笔的结果默认只看，不直接当成可放大的 edge。
            </p>
            <div className="mt-4 grid gap-2">
              {watchItems.length > 0 ? (
                watchItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-[16px] border px-4 py-3 text-[12px] leading-5"
                    style={{ borderColor: "rgba(196,176,146,0.12)", background: "rgba(255,255,255,0.02)", color: "rgba(244, 236, 225, 0.78)" }}
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div
                  className="rounded-[16px] border px-4 py-3 text-[12px] leading-5"
                  style={{ borderColor: "rgba(196,176,146,0.12)", background: "rgba(255,255,255,0.02)", color: "rgba(244, 236, 225, 0.78)" }}
                >
                  当前榜单没有明显会误导判断的极端小样本。
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

interface BreakdownRankingPanelProps {
  title: string;
  subtitle: string;
  items: OkxBreakdownItem[];
  positiveHeading: string;
  positiveCaption: string;
  negativeHeading: string;
  negativeCaption: string;
  iconFor: (label: string) => string;
  accentFor: (label: string) => string;
}

function BreakdownRankingPanel({
  title,
  subtitle,
  items,
  positiveHeading,
  positiveCaption,
  negativeHeading,
  negativeCaption,
  iconFor,
  accentFor,
}: BreakdownRankingPanelProps) {
  const profitable = items.filter((item) => item.netPnl >= 0).slice(0, 6);
  const losing = items.filter((item) => item.netPnl < 0).slice().reverse().slice(0, 6).reverse();
  const maxAbs = Math.max(...items.map((item) => Math.abs(item.netPnl)), 1);

  function renderList(list: OkxBreakdownItem[], tone: "profit" | "loss") {
    const positiveTone = tone === "profit";

    return (
      <div className="grid gap-3">
        {list.map((item, index) => {
          const width = `${(Math.abs(item.netPnl) / maxAbs) * 100}%`;
          const color = positiveTone ? "#9bd3ae" : "#f39ba6";
          const lowSample = isLowSample(item);

          return (
            <div
              key={`${tone}-${item.key}`}
              className="rounded-[18px] border p-4"
              style={{
                borderColor: `${color}24`,
                background: positiveTone ? "rgba(155,211,174,0.07)" : "rgba(243,155,166,0.07)",
                opacity: lowSample ? 0.78 : 1,
              }}
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-semibold"
                    style={{ background: `${accentFor(item.label)}18`, color: accentFor(item.label) }}
                  >
                    {iconFor(item.label)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="break-words text-[13px] font-semibold" style={{ color: "#f4ece1" }}>
                        {index + 1}. {item.label}
                      </p>
                      {lowSample ? (
                        <span
                          className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
                          style={{ borderColor: "rgba(223,182,97,0.22)", color: "#dfb661", background: "rgba(223,182,97,0.1)" }}
                        >
                          低样本
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px]" style={{ color: "rgba(214, 197, 176, 0.6)" }}>
                      {item.count} 笔 · 胜率 {fmtPct(item.winRate)}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="num text-[13px] font-semibold" style={{ color }}>
                    {fmtSignedUsdt(item.netPnl)}
                  </p>
                  <p className="text-[11px]" style={{ color: "rgba(214, 197, 176, 0.6)" }}>
                    手续费 {fmtUsdt(item.totalFees)}
                  </p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width,
                    background: positiveTone
                      ? "linear-gradient(90deg, rgba(155,211,174,0.35), rgba(155,211,174,0.95))"
                      : "linear-gradient(90deg, rgba(243,155,166,0.35), rgba(243,155,166,0.95))",
                  }}
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "rgba(214, 197, 176, 0.62)" }}>
                <span>单笔均值 {fmtSignedUsdt(item.avgNetPnl)}</span>
                <span>频次占比 {fmtPct(item.share)}</span>
                {lowSample ? <span>先观察，不直接加码</span> : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section
      className="min-w-0 rounded-[24px] border p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          {title}
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          {subtitle}
        </p>
        <p className="mt-2 text-[11px]" style={{ color: "rgba(214, 197, 176, 0.52)" }}>
          少于 {OKX_LOW_SAMPLE_THRESHOLD} 笔的项目会标记为低样本，防止把偶然结果误判为稳定优势。
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <div className="mb-3 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(155,211,174,0.78)" }}>
              {positiveHeading}
            </p>
            <span className="text-[11px]" style={{ color: "rgba(214, 197, 176, 0.54)" }}>
              {positiveCaption}
            </span>
          </div>
          {renderList(profitable, "profit")}
        </div>
        <div>
          <div className="mb-3 flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: "rgba(243,155,166,0.82)" }}>
              {negativeHeading}
            </p>
            <span className="text-[11px]" style={{ color: "rgba(214, 197, 176, 0.54)" }}>
              {negativeCaption}
            </span>
          </div>
          {renderList(losing, "loss")}
        </div>
      </div>
    </section>
  );
}

export function LeverageRankingPanel({ items }: { items: OkxBreakdownItem[] }) {
  return (
    <BreakdownRankingPanel
      title="杠杆净盈亏排行"
      subtitle="直接验证哪档杠杆是甜点区，哪档是毒药区。"
      items={items}
      positiveHeading="Sweet spots"
      positiveCaption="甜点杠杆榜"
      negativeHeading="Poison zones"
      negativeCaption="高危拖累榜"
      iconFor={leverageGlyph}
      accentFor={leverageColor}
    />
  );
}

export function AssetRankingPanel({ items }: { items: OkxBreakdownItem[] }) {
  return (
    <BreakdownRankingPanel
      title="币种净盈亏排行"
      subtitle="把利润引擎和亏损黑洞拆开看，更容易判断该加码哪里、该砍掉哪里。"
      items={items}
      positiveHeading="Profit engines"
      positiveCaption="正向贡献榜"
      negativeHeading="Loss traps"
      negativeCaption="负向拖累榜"
      iconFor={assetGlyph}
      accentFor={assetColor}
    />
  );
}

export function DurationPerformance({ items }: { items: OkxBreakdownItem[] }) {
  return (
    <section
      className="min-w-0 rounded-[24px] border p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          持仓时长表现
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          看哪种节奏最适合你赚钱，哪种节奏最容易回吐。
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-[20px] border p-4"
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background: item.netPnl >= 0 ? "rgba(155, 211, 174, 0.08)" : "rgba(243, 155, 166, 0.08)",
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              {item.label}
            </p>
            <p className="mt-2 num text-[1.5rem] font-semibold" style={{ color: item.netPnl >= 0 ? "#9bd3ae" : "#f39ba6" }}>
              {fmtSignedUsdt(item.netPnl)}
            </p>
            <div className="mt-3 grid gap-1 text-[12px]" style={{ color: "rgba(244, 236, 225, 0.72)" }}>
              <div>{item.count} 笔</div>
              <div>胜率 {fmtPct(item.winRate)}</div>
              <div>单笔均值 {fmtSignedUsdt(item.avgNetPnl)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InsightChip({ label }: { label: OkxLabel }) {
  const tone = labelTone(label.label);

  return (
    <div className="min-w-0 rounded-[18px] border px-4 py-3" style={{ borderColor: `${tone.fg}33`, background: tone.bg }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: `${tone.fg}cc` }}>
        tag
      </p>
      <p className="mt-1 text-[14px] font-semibold" style={{ color: tone.fg }}>
        {label.label}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: "rgba(244, 236, 225, 0.72)" }}>
        {label.detail}
      </p>
    </div>
  );
}

export function LabelsPanel({ labels }: { labels: OkxLabel[] }) {
  return (
    <section
      className="min-w-0 rounded-[24px] border p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          账户画像标签
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          这些标签把交易记录翻译成更容易做决策的语言。
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {labels.map((label, i) => (
          <InsightChip key={`${label.key}-${label.label}-${i}`} label={label} />
        ))}
      </div>
    </section>
  );
}

export function RiskScalePanel({ analytics }: { analytics: OkxAnalytics }) {
  const riskScaleHighlights = [
    {
      label: "风险回报",
      value: analytics.overview.riskRewardRatio.toFixed(2),
      unit: "R",
      sub: `平均单笔 ${fmtSignedUsdt(analytics.overview.avgNetPnl)}`,
      tone: { fg: "#dfb661", bg: "rgba(223, 182, 97, 0.1)", border: "rgba(223, 182, 97, 0.22)" },
    },
    {
      label: "平均仓位收益率",
      value: fmtPct(analytics.overview.avgPositionRoi),
      unit: "",
      sub: "按单笔净盈亏 / 保证金估算",
      tone: { fg: "#d97757", bg: "rgba(217, 119, 87, 0.1)", border: "rgba(217, 119, 87, 0.22)" },
    },
    {
      label: "平均多 / 空单收益",
      value: fmtSignedUsdt(analytics.overview.avgLongNetPnl),
      unit: "",
      sub: `平均空单 ${fmtSignedUsdt(analytics.overview.avgShortNetPnl)}`,
      tone: { fg: "#9bd3ae", bg: "rgba(155, 211, 174, 0.1)", border: "rgba(155, 211, 174, 0.22)" },
    },
    {
      label: "平均持仓时间",
      value: fmtHours(analytics.overview.avgHoldHours),
      unit: "",
      sub: `最长持仓 ${fmtHours(analytics.overview.maxHoldHours)}`,
      tone: { fg: "#8fb8a6", bg: "rgba(143, 184, 166, 0.1)", border: "rgba(143, 184, 166, 0.22)" },
    },
  ];

  const riskScaleDetails = [
    {
      label: "平均杠杆",
      value: `${analytics.overview.avgLeverage.toFixed(1)} x`,
      sub: `最大亏损 ${fmtSignedUsdt(analytics.overview.maxLoss)}`,
      tone: "#d97757",
    },
    {
      label: "平均保证金",
      value: fmtUsdt(analytics.overview.avgMarginUsed),
      sub: `中位数 ${fmtUsdt(analytics.overview.medianMarginUsed)}`,
      tone: "#9bd3ae",
    },
    {
      label: "平均名义仓位",
      value: fmtUsdt(analytics.overview.avgNominalValue),
      sub: `中位数 ${fmtUsdt(analytics.overview.medianNominalValue)}`,
      tone: "#8fb8a6",
    },
    {
      label: "单笔盈利上沿",
      value: fmtSignedUsdt(analytics.overview.maxProfit),
      sub: `单笔亏损下沿 ${fmtSignedUsdt(analytics.overview.maxLoss)}`,
      tone: "#9bd3ae",
    },
    {
      label: "保证金峰值",
      value: fmtUsdt(analytics.overview.maxMarginUsed),
      sub: "看单笔下注能重到什么程度",
      tone: "#dfb661",
    },
    {
      label: "名义仓位峰值",
      value: fmtUsdt(analytics.overview.maxNominalValue),
      sub: "对应最大风险敞口的上限",
      tone: "#d97757",
    },
    {
      label: "资本效率 / 资金费",
      value: fmtPct(analytics.overview.capitalEfficiency),
      sub: `资金费 ${fmtSignedUsdt(analytics.overview.totalFunding, 2)}`,
      tone: analytics.overview.totalFunding >= 0 ? "#8fb8a6" : "#f39ba6",
    },
  ];

  return (
    <section
      className="min-w-0 rounded-[24px] border p-5"
      style={{ borderColor: "rgba(196, 176, 146, 0.14)", background: "rgba(24, 20, 18, 0.92)" }}
    >
      <div className="mb-4">
        <h3 className="text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
          风险与规模面板
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
          从仓位轻重和波动承受力看这套打法。
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {riskScaleHighlights.map((item) => (
          <div key={item.label} className="min-w-0 rounded-[18px] border p-4" style={{ borderColor: item.tone.border, background: item.tone.bg }}>
            <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: `${item.tone.fg}cc` }}>
              {item.label}
            </p>
            <p className="mt-2 num text-[1.35rem] font-semibold" style={{ color: "#f4ece1" }}>
              {item.value}
              {item.unit ? <span style={{ color: item.tone.fg }}> {item.unit}</span> : null}
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.62)" }}>
              {item.sub}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3">
        {riskScaleDetails.map((item) => (
          <div
            key={item.label}
            className="rounded-[18px] border p-4"
            style={{ borderColor: `${item.tone}26`, background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: "rgba(214, 197, 176, 0.52)" }}>
                  {item.label}
                </p>
                <p className="mt-2 num text-[1.15rem] font-semibold" style={{ color: item.tone }}>
                  {item.value}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.62)" }}>
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.tone, boxShadow: `0 0 0 5px ${item.tone}18` }} />
            {item.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
