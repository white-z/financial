"use client";

import { useEffect, useMemo, useState } from "react";
import {
  analyzeOkxTrades,
  applyOkxTradeFilters,
  deriveOkxDeskBriefing,
  deriveOkxMedianRegressionMetrics,
  deriveOkxPrincipalMetrics,
  OKX_MAINSTREAM_ASSETS,
  type OkxAnalytics,
  type OkxAssetScope,
  type OkxCapitalSeriesPoint,
  type OkxDeskBriefing,
  type OkxDurationBucket,
  type OkxLabel,
  type OkxMedianRegressionMetric,
  type OkxSeriesPoint,
  type OkxTrade,
} from "@/lib/finance/okx";
import { fmtPct, fmtSignedUsdt, fmtUsdt, PALETTE, STORAGE_KEY, type OkxFilterPreset } from "./okx-dashboard.shared";

interface UseOkxDashboardStateParams {
  analytics: OkxAnalytics;
  trades: OkxTrade[];
}

export interface UseOkxDashboardStateResult {
  principalInput: string;
  principalValue: number | null;
  startDate: string;
  endDate: string;
  assetScope: OkxAssetScope;
  availableLeverages: number[];
  excludedLeverages: number[];
  excludedHoldBuckets: OkxDurationBucket[];
  excludeTopProfit: boolean;
  excludeTopLoss: boolean;
  invalidDateRange: boolean;
  filteredTrades: OkxTrade[];
  analytics: OkxAnalytics | null;
  principalMetrics: ReturnType<typeof deriveOkxPrincipalMetrics> | null;
  medianRegressionItems: OkxMedianRegressionMetric[];
  deskBriefing: OkxDeskBriefing | null;
  activeFilters: string[];
  headerSubtitle: string;
  heroSeries: Array<OkxSeriesPoint | OkxCapitalSeriesPoint>;
  heroTitle: string;
  heroSubtitle: string;
  winLossItems: Array<{ label: string; value: number; accent: string }>;
  directionItems: Array<{ label: string; value: number; accent?: string; detail?: string }>;
  durationItems: Array<{ label: string; value: number; accent?: string; detail?: string }>;
  leverageItems: Array<{ label: string; value: number; accent?: string; detail?: string }>;
  heroLabels: OkxLabel[];
  setPrincipalInput: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setAssetScope: (value: OkxAssetScope) => void;
  toggleLeverage: (value: number) => void;
  toggleHoldBucket: (bucket: OkxDurationBucket) => void;
  toggleTopProfit: () => void;
  toggleTopLoss: () => void;
  applyPreset: (preset: OkxFilterPreset) => void;
  resetFilters: () => void;
}

export function useOkxDashboardState({
  analytics: initialAnalytics,
  trades,
}: UseOkxDashboardStateParams): UseOkxDashboardStateResult {
  const [principalInput, setPrincipalInput] = useState("");
  const [cacheReady, setCacheReady] = useState(false);
  const [startDate, setStartDate] = useState(initialAnalytics.period.createdFrom);
  const [endDate, setEndDate] = useState(initialAnalytics.period.closedTo);
  const [assetScope, setAssetScope] = useState<OkxAssetScope>("all");
  const [excludedLeverages, setExcludedLeverages] = useState<number[]>([]);
  const [excludedHoldBuckets, setExcludedHoldBuckets] = useState<OkxDurationBucket[]>([]);
  const [excludeTopProfit, setExcludeTopProfit] = useState(false);
  const [excludeTopLoss, setExcludeTopLoss] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (cached) setPrincipalInput(cached);
      setCacheReady(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!cacheReady) return;

    const normalized = principalInput.trim();
    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, [cacheReady, principalInput]);

  const principalValue = useMemo(() => {
    const normalized = principalInput.replace(/,/g, "").trim();
    if (!normalized) return null;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [principalInput]);

  const invalidDateRange = startDate > endDate;
  const availableLeverages = useMemo(
    () => Array.from(new Set(trades.map((trade) => trade.leverage))).sort((a, b) => a - b),
    [trades],
  );

  const filteredTrades = useMemo(() => {
    if (invalidDateRange) return [];

    return applyOkxTradeFilters(trades, {
      startDate,
      endDate,
      assetScope,
      excludedLeverages,
      excludedHoldBuckets,
      excludeTopProfit,
      excludeTopLoss,
    });
  }, [assetScope, endDate, excludeTopLoss, excludeTopProfit, excludedHoldBuckets, excludedLeverages, invalidDateRange, startDate, trades]);

  const analytics = useMemo(
    () => (filteredTrades.length > 0 ? analyzeOkxTrades(filteredTrades) : null),
    [filteredTrades],
  );

  const activeFilters = useMemo(() => {
    const tags: string[] = [];

    if (assetScope === "mainstream-only") tags.push(`仅主流币 ${OKX_MAINSTREAM_ASSETS.join("/")}`);
    if (excludedLeverages.length > 0) tags.push(`剔除杠杆 ${excludedLeverages.map((item) => `${item}x`).join(" / ")}`);
    if (excludedHoldBuckets.includes("lt1h")) tags.push("剔除超短线");
    if (excludedHoldBuckets.includes("1to24h")) tags.push("剔除日内波段");
    if (excludedHoldBuckets.includes("gt24h")) tags.push("剔除趋势持仓");
    if (excludeTopProfit) tags.push("剔除最大盈利单");
    if (excludeTopLoss) tags.push("剔除最大亏损单");
    if (startDate !== initialAnalytics.period.createdFrom || endDate !== initialAnalytics.period.closedTo) {
      tags.push(`时间 ${startDate} ~ ${endDate}`);
    }

    return tags;
  }, [
      assetScope,
      endDate,
      excludeTopLoss,
      excludeTopProfit,
      excludedHoldBuckets,
      excludedLeverages,
      initialAnalytics.period.closedTo,
      initialAnalytics.period.createdFrom,
      startDate,
  ]);

  function resetFilters() {
    setStartDate(initialAnalytics.period.createdFrom);
    setEndDate(initialAnalytics.period.closedTo);
    setAssetScope("all");
    setExcludedLeverages([]);
    setExcludedHoldBuckets([]);
    setExcludeTopProfit(false);
    setExcludeTopLoss(false);
  }

  function toggleLeverage(value: number) {
    setExcludedLeverages((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b),
    );
  }

  function toggleHoldBucket(bucket: OkxDurationBucket) {
    setExcludedHoldBuckets((current) =>
      current.includes(bucket) ? current.filter((item) => item !== bucket) : [...current, bucket],
    );
  }

  function toggleTopProfit() {
    setExcludeTopProfit((value) => !value);
  }

  function toggleTopLoss() {
    setExcludeTopLoss((value) => !value);
  }

  function applyPreset(preset: OkxFilterPreset) {
    if (preset === "full-sample") {
      resetFilters();
      return;
    }

    setStartDate(initialAnalytics.period.createdFrom);
    setEndDate(initialAnalytics.period.closedTo);

    if (preset === "mainstream-swing") {
      setAssetScope("mainstream-only");
      setExcludedLeverages([]);
      setExcludedHoldBuckets(["lt1h"]);
      setExcludeTopProfit(false);
      setExcludeTopLoss(false);
      return;
    }

    setAssetScope("all");
    setExcludedLeverages([]);
    setExcludedHoldBuckets([]);
    setExcludeTopProfit(true);
    setExcludeTopLoss(true);
  }

  const principalMetrics = useMemo(() => {
    if (!principalValue || !analytics) return null;
    return deriveOkxPrincipalMetrics(analytics.charts.cumulative, principalValue);
  }, [analytics, principalValue]);

  const medianRegressionItems = useMemo(() => {
    if (filteredTrades.length === 0) return [];
    return deriveOkxMedianRegressionMetrics(filteredTrades);
  }, [filteredTrades]);

  const deskBriefing = useMemo(() => (analytics ? deriveOkxDeskBriefing(analytics) : null), [analytics]);

  const headerSubtitle = analytics
    ? `${analytics.period.createdFrom} 至 ${analytics.period.closedTo} · ${analytics.overview.totalTrades} / ${trades.length} 笔完结仓位 · 用一页看清净利、回撤、杠杆甜点区与币种黑洞`
    : `${startDate} 至 ${endDate} · 当前筛选无可用样本 · 调整时间范围或取消极值过滤后重算`;

  const heroSeries = principalMetrics?.equitySeries ?? analytics?.charts.cumulative ?? [];
  const heroTitle = principalMetrics ? "本金驱动的资金曲线" : "累计净盈亏曲线";
  const heroSubtitle = principalMetrics
    ? `以 ${principalValue ? fmtUsdt(principalValue) : ""} 为起点推演真实资金轨迹`
    : "尚未输入本金时，先展示纯交易累计净盈亏";

  const winLossItems = analytics
    ? [
        { label: "盈利单", value: Math.round(analytics.overview.winRate * analytics.overview.totalTrades), accent: "#9bd3ae" },
        {
          label: "亏损单",
          value: analytics.overview.totalTrades - Math.round(analytics.overview.winRate * analytics.overview.totalTrades),
          accent: "#f39ba6",
        },
      ]
    : [];

  const directionItems = analytics
    ? analytics.directionBreakdown.map((item, index) => ({
        label: item.label,
        value: item.count,
        accent: PALETTE[index % PALETTE.length],
        detail: `净盈亏 ${fmtSignedUsdt(item.netPnl)}`,
      }))
    : [];

  const durationItems = analytics
    ? analytics.durationBreakdown.map((item, index) => ({
        label: item.label,
        value: item.count,
        accent: PALETTE[index % PALETTE.length],
        detail: `胜率 ${fmtPct(item.winRate)}`,
      }))
    : [];

  const leverageItems = analytics
    ? analytics.leverageBreakdown
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map((item, index) => ({
          label: item.label,
          value: item.count,
          accent: PALETTE[index % PALETTE.length],
          detail: `净盈亏 ${fmtSignedUsdt(item.netPnl)}`,
        }))
    : [];

  const heroLabels = analytics
    ? [
        analytics.labels.cadence,
        analytics.labels.holdingStyle,
        analytics.labels.directionalBias,
        analytics.labels.sweetSpotLeverage,
        analytics.labels.poisonZoneLeverage,
        analytics.labels.moatAsset,
        analytics.labels.frictionAsset,
        analytics.labels.blackholeAsset,
      ].filter((label): label is OkxLabel => Boolean(label))
    : [];

  return {
    principalInput,
    principalValue,
    startDate,
    endDate,
    assetScope,
    availableLeverages,
    excludedLeverages,
    excludedHoldBuckets,
    excludeTopProfit,
    excludeTopLoss,
    invalidDateRange,
    filteredTrades,
    analytics,
    principalMetrics,
    medianRegressionItems,
    deskBriefing,
    activeFilters,
    headerSubtitle,
    heroSeries,
    heroTitle,
    heroSubtitle,
    winLossItems,
    directionItems,
    durationItems,
    leverageItems,
    heroLabels,
    setPrincipalInput,
    setStartDate,
    setEndDate,
    setAssetScope,
    toggleLeverage,
    toggleHoldBucket,
    toggleTopProfit,
    toggleTopLoss,
    applyPreset,
    resetFilters,
  };
}
