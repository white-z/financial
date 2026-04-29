"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { type OkxAnalytics, type OkxTrade } from "@/lib/finance/okx";
import { FilterWorkbench, NoSampleState, PrincipalPanel } from "./okx-dashboard-controls";
import { BreakdownStatCard, FlowBars, HeroCurve, MedianRegressionBars } from "./okx-dashboard-charts";
import {
  AssetRankingPanel,
  DeskBriefing,
  DurationPerformance,
  LabelsPanel,
  LeverageRankingPanel,
  OverviewMetricCards,
  RiskScalePanel,
} from "./okx-dashboard-panels";
import { fmtUsdt } from "./okx-dashboard.shared";
import { TradeFirewallWidget, ExitFirewallWidget } from "./okx-trade-firewall";
import { useOkxDashboardState } from "./use-okx-dashboard-state";

const dashboardBackground = {
  minHeight: "100vh",
  overflowX: "hidden",
  background:
    "radial-gradient(circle at top left, rgba(217, 119, 87, 0.13), transparent 32%), radial-gradient(circle at 85% 16%, rgba(143, 184, 166, 0.12), transparent 28%), linear-gradient(180deg, #100d0c 0%, #0b0908 100%)",
} as const;

interface OkxDashboardProps {
  analytics: OkxAnalytics;
  trades: OkxTrade[];
}

export function OkxDashboard({ analytics: initialAnalytics, trades }: OkxDashboardProps) {
  const state = useOkxDashboardState({ analytics: initialAnalytics, trades });

  const filterWorkbench = (
    <FilterWorkbench
      minDate={initialAnalytics.period.createdFrom}
      maxDate={initialAnalytics.period.closedTo}
      startDate={state.startDate}
      endDate={state.endDate}
      assetScope={state.assetScope}
      availableLeverages={state.availableLeverages}
      excludedLeverages={state.excludedLeverages}
      excludedHoldBuckets={state.excludedHoldBuckets}
      excludeTopProfit={state.excludeTopProfit}
      excludeTopLoss={state.excludeTopLoss}
      filteredCount={state.filteredTrades.length}
      totalCount={trades.length}
      invalidRange={state.invalidDateRange}
      activeFilters={state.activeFilters}
      onStartDateChange={state.setStartDate}
      onEndDateChange={state.setEndDate}
      onAssetScopeChange={state.setAssetScope}
      onToggleLeverage={state.toggleLeverage}
      onToggleHoldBucket={state.toggleHoldBucket}
      onToggleTopProfit={state.toggleTopProfit}
      onToggleTopLoss={state.toggleTopLoss}
      onApplyPreset={state.applyPreset}
      onReset={state.resetFilters}
    />
  );

  if (!state.analytics || !state.deskBriefing) {
    return (
      <div style={dashboardBackground}>
        <PageHeader back="/" icon="⟁" tagColor="#d97757" title="OKX 合约复盘室" subtitle={state.headerSubtitle} />

        <main className="page-content pt-8 pb-16 sm:pt-10 sm:pb-10">
          {filterWorkbench}
          <NoSampleState />
        </main>
        <ExitFirewallWidget />
        <TradeFirewallWidget />
      </div>
    );
  }

  const analytics = state.analytics;
  const principalColor = state.principalMetrics ? "#dfb661" : "#d97757";

  return (
    <div style={dashboardBackground}>
      <PageHeader back="/" icon="⟁" tagColor="#d97757" title="OKX 合约复盘室" subtitle={state.headerSubtitle} />

      <main className="page-content pt-8 pb-16 sm:pt-10 sm:pb-10">
        {filterWorkbench}

        <section className="mt-6 flex min-w-0 flex-col gap-6">
          <OverviewMetricCards analytics={analytics} principalMetrics={state.principalMetrics} />
          <PrincipalPanel
            principalInput={state.principalInput}
            principalValue={state.principalValue}
            principalMetrics={state.principalMetrics}
            onChange={state.setPrincipalInput}
            onClear={() => state.setPrincipalInput("")}
          />
        </section>

        <div className="mt-6 grid w-full min-w-0 gap-6 overflow-x-hidden">
          <DeskBriefing {...state.deskBriefing} />

          <HeroCurve
            title={state.heroTitle}
            subtitle={state.heroSubtitle}
            points={state.heroSeries}
            valueAccessor={(point) => ("equity" in point ? point.equity : point.cumulativeNetPnl)}
            color={principalColor}
            fill={principalColor}
            yFormatter={(value) => fmtUsdt(value)}
          />

          <section className="flex min-w-0 flex-col overflow-hidden">
            <LeverageRankingPanel items={analytics.leverageBreakdown} />
            <AssetRankingPanel items={analytics.assetBreakdown} />
            <DurationPerformance items={analytics.durationBreakdown} />
          </section>

          <MedianRegressionBars items={state.medianRegressionItems} />

          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            <FlowBars title="按日盈亏" subtitle="单日净盈亏，观察爆发和回吐集中在哪些时间窗口。" points={analytics.charts.daily} />
            <FlowBars title="按周盈亏" subtitle="把节奏拉长，看一周级别的稳定性和回撤恢复速度。" points={analytics.charts.weekly} />
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-2 2xl:grid-cols-4">
            <BreakdownStatCard title="胜负结构" subtitle="盈利单与亏损单的数量与占比。" items={state.winLossItems} total={analytics.overview.totalTrades} />
            <BreakdownStatCard title="多空偏好" subtitle="做多和做空的频率与利润贡献。" items={state.directionItems} total={analytics.overview.totalTrades} />
            <BreakdownStatCard title="持仓时间偏好" subtitle="超短线、日内与趋势持仓的占比。" items={state.durationItems} total={analytics.overview.totalTrades} />
            <BreakdownStatCard title="杠杆使用习惯" subtitle="最常用的杠杆档位与结果表现。" items={state.leverageItems} total={analytics.overview.totalTrades} />
          </div>

          <section className="flex min-w-0 flex-col overflow-hidden">
            <LabelsPanel labels={state.heroLabels} />
            <RiskScalePanel analytics={analytics} />
          </section>

          <div
            className="flex flex-col gap-3 rounded-[22px] border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            style={{ borderColor: "rgba(196,176,146,0.12)", background: "rgba(24, 20, 18, 0.88)" }}
          >
            <p className="min-w-0 flex-1 text-[12px]" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
              注：CSV 不含账户余额快照；未输入本金时，页面以累计净盈亏曲线展示“收益回撤”。输入本金后，回撤与最低水位会切换为真实资金视角。
            </p>
            <Link href="/" className="self-start text-[12px] font-medium sm:self-auto" style={{ color: "#dfb661" }}>
              返回首页
            </Link>
          </div>
        </div>
      </main>
      <ExitFirewallWidget />
      <TradeFirewallWidget />
    </div>
  );
}
