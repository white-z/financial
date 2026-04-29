export type OkxDirection = "做多" | "做空";
export type OkxDurationBucket = "lt1h" | "1to24h" | "gt24h";
export type OkxAssetScope = "all" | "mainstream-only";
export const OKX_MAINSTREAM_ASSETS = ["BTC", "ETH", "SOL", "BNB"] as const;
export const OKX_LOW_SAMPLE_THRESHOLD = 3;

export interface OkxTrade {
  createdAt: string;
  updatedAt: string;
  createdTimestamp: number;
  updatedTimestamp: number;
  symbol: string;
  asset: string;
  product: string;
  marginMode: string;
  direction: OkxDirection | string;
  leverage: number;
  maxPosition: number;
  closedPosition: number;
  openPrice: number;
  closePrice: number;
  marginCurrency: string;
  grossPnl: number;
  reportedRoi: number;
  fees: number;
  funding: number;
  closeType: string;
  contractFaceValue: number;
  contractMultiplier: number;
  holdHours: number;
  holdBucket: OkxDurationBucket;
  nominalValue: number;
  marginUsed: number;
  netPnl: number;
}

export interface OkxTradeFilters {
  startDate?: string | null;
  endDate?: string | null;
  assetScope?: OkxAssetScope;
  excludedHoldBuckets?: OkxDurationBucket[] | null;
  excludedLeverages?: number[] | null;
  excludeTopProfit?: boolean;
  excludeTopLoss?: boolean;
}

export interface OkxBreakdownItem {
  key: string;
  label: string;
  count: number;
  share: number;
  netPnl: number;
  grossPnl: number;
  totalFees: number;
  winRate: number;
  avgNetPnl: number;
}

export interface OkxSeriesPoint {
  label: string;
  timestamp: number;
  netPnl: number;
  cumulativeNetPnl: number;
  drawdownAmount: number;
  drawdownRatio: number;
}

export interface OkxBarPoint {
  label: string;
  netPnl: number;
}

export interface OkxScatterPoint {
  x: number;
  y: number;
  asset: string;
}

export interface OkxCapitalSeriesPoint {
  label: string;
  timestamp: number;
  equity: number;
  cumulativeNetPnl: number;
  drawdownAmount: number;
  drawdownRatio: number;
}

export interface OkxPrincipalMetrics {
  principal: number;
  currentCapital: number;
  principalRoi: number;
  lowestCapital: number;
  maxDrawdownRatio: number;
  maxDrawdownAmount: number;
  didBreachZero: boolean;
  equitySeries: OkxCapitalSeriesPoint[];
}

export interface OkxLabel {
  key: string;
  label: string;
  detail: string;
}

export interface OkxMedianRegressionMetric {
  key: "fee" | "nominalValue" | "holdHours" | "netPnl";
  label: string;
  currentValue: number;
  baselineValue: number;
  minValue: number;
  maxValue: number;
  values: number[];
}

export interface OkxDeskBriefing {
  headline: string;
  summary: string;
  primaryEdge: { title: string; detail: string };
  mainLeak: { title: string; detail: string };
  bullets: string[];
  actionItems: string[];
  watchItems: string[];
}

export interface OkxAnalytics {
  period: {
    createdFrom: string;
    closedTo: string;
    spanDays: number;
    activeDays: number;
    tradesPerDay: number;
  };
  overview: {
    totalTrades: number;
    grossPnl: number;
    netPnl: number;
    totalFees: number;
    totalFunding: number;
    winRate: number;
    profitFactor: number;
    avgNetPnl: number;
    avgWin: number;
    avgLoss: number;
    riskRewardRatio: number;
    maxProfit: number;
    maxLoss: number;
    avgLeverage: number;
    avgMarginUsed: number;
    medianMarginUsed: number;
    maxMarginUsed: number;
    avgNominalValue: number;
    medianNominalValue: number;
    maxNominalValue: number;
    avgPositionRoi: number;
    avgLongNetPnl: number;
    avgShortNetPnl: number;
    avgHoldHours: number;
    maxHoldHours: number;
    maxProfitDrawdownRatio: number;
    maxProfitDrawdownAmount: number;
    lowestCumulativeNet: number;
    capitalEfficiency: number;
  };
  directionBreakdown: OkxBreakdownItem[];
  durationBreakdown: OkxBreakdownItem[];
  leverageBreakdown: OkxBreakdownItem[];
  assetBreakdown: OkxBreakdownItem[];
  charts: {
    cumulative: OkxSeriesPoint[];
    daily: OkxBarPoint[];
    weekly: OkxBarPoint[];
    byAsset: OkxBarPoint[];
    byLeverage: OkxBarPoint[];
    byDuration: OkxBarPoint[];
  };
  labels: {
    cadence: OkxLabel;
    holdingStyle: OkxLabel;
    directionalBias: OkxLabel;
    sweetSpotLeverage: OkxLabel | null;
    poisonZoneLeverage: OkxLabel | null;
    moatAsset: OkxLabel | null;
    frictionAsset: OkxLabel | null;
    blackholeAsset: OkxLabel | null;
  };
}

interface GroupAccumulator {
  count: number;
  netPnl: number;
  grossPnl: number;
  totalFees: number;
  wins: number;
}

const LT1H_LABEL = "超短线";
const DAY_LABEL = "日内波段";
const GT24H_LABEL = "趋势持仓";

function parseNumber(raw: string | undefined): number {
  const cleaned = String(raw ?? "").replace(/^﻿/, "").trim();
  if (cleaned === "") return 0;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeDateTimeText(value: string): string {
  const cleaned = value.replace(/^﻿/, "").trim();

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(cleaned);
  if (isoMatch) {
    const [, year, month, day, hour, minute, second = "00"] = isoMatch;
    return `${year}-${month}-${day} ${pad2(Number(hour))}:${minute}:${second}`;
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(cleaned);
  if (slashMatch) {
    const [, month, day, year, hour, minute, second = "00"] = slashMatch;
    return `${year}-${pad2(Number(month))}-${pad2(Number(day))} ${pad2(Number(hour))}:${minute}:${second}`;
  }

  return cleaned;
}

function normalizeTimestamp(value: string): number {
  return Date.parse(normalizeDateTimeText(value).replace(" ", "T"));
}

function dateKeyOf(value: string): string {
  return normalizeDateTimeText(value).slice(0, 10);
}

function determineHoldBucket(hours: number): OkxDurationBucket {
  if (hours < 1) return "lt1h";
  if (hours <= 24) return "1to24h";
  return "gt24h";
}

function durationLabel(bucket: OkxDurationBucket): string {
  if (bucket === "lt1h") return LT1H_LABEL;
  if (bucket === "1to24h") return DAY_LABEL;
  return GT24H_LABEL;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function fmtSigned(value: number, decimals = 0): string {
  const abs = Math.abs(value).toFixed(decimals);
  return `${value >= 0 ? "+" : "-"}${abs}`;
}

function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function fmtHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} 分钟`;
  if (hours < 24) return `${hours.toFixed(1)} 小时`;
  return `${(hours / 24).toFixed(1)} 天`;
}

function isLowSample(item: OkxBreakdownItem): boolean {
  return item.count < OKX_LOW_SAMPLE_THRESHOLD;
}

function groupTrades(
  trades: OkxTrade[],
  getKey: (trade: OkxTrade) => string,
  getLabel: (trade: OkxTrade) => string,
): OkxBreakdownItem[] {
  const groups = new Map<string, GroupAccumulator>();

  for (const trade of trades) {
    const key = getKey(trade);
    const current = groups.get(key) ?? {
      count: 0,
      netPnl: 0,
      grossPnl: 0,
      totalFees: 0,
      wins: 0,
    };

    current.count += 1;
    current.netPnl += trade.netPnl;
    current.grossPnl += trade.grossPnl;
    current.totalFees += Math.abs(trade.fees);
    current.wins += trade.netPnl > 0 ? 1 : 0;
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      label: getLabel(trades.find((trade) => getKey(trade) === key) ?? trades[0]),
      count: value.count,
      share: trades.length > 0 ? value.count / trades.length : 0,
      netPnl: value.netPnl,
      grossPnl: value.grossPnl,
      totalFees: value.totalFees,
      winRate: value.count > 0 ? value.wins / value.count : 0,
      avgNetPnl: value.count > 0 ? value.netPnl / value.count : 0,
    }))
    .sort((a, b) => b.count - a.count || b.netPnl - a.netPnl);
}

function sumNetPnl(trades: OkxTrade[]): number {
  return trades.reduce((sum, trade) => sum + trade.netPnl, 0);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function startOfWeek(dateKey: string): string {
  const normalized = dateKey.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return normalized;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const utc = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(utc.getTime())) return normalized;

  const weekday = utc.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + offset);
  return Number.isNaN(utc.getTime()) ? normalized : utc.toISOString().slice(0, 10);
}

function aggregateByBucket(
  trades: OkxTrade[],
  getBucket: (trade: OkxTrade) => string,
): OkxBarPoint[] {
  const grouped = new Map<string, number>();

  for (const trade of trades) {
    const key = getBucket(trade);
    grouped.set(key, (grouped.get(key) ?? 0) + trade.netPnl);
  }

  return Array.from(grouped.entries())
    .map(([label, netPnl]) => ({ label, netPnl }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function createCadenceLabel(period: OkxAnalytics["period"]): OkxLabel {
  const cadence =
    period.tradesPerDay >= 2 ? "高频推进" :
    period.tradesPerDay >= 0.7 ? "中频执行" :
    "低频克制";

  return {
    key: cadence,
    label: cadence,
    detail: `${period.activeDays} 个活跃交易日，平均每天 ${period.tradesPerDay.toFixed(2)} 笔完结仓位`,
  };
}

function createHoldingStyleLabel(durationBreakdown: OkxBreakdownItem[]): OkxLabel {
  const dominant = durationBreakdown[0];
  const label =
    dominant?.key === "lt1h" ? LT1H_LABEL :
    dominant?.key === "1to24h" ? DAY_LABEL :
    GT24H_LABEL;

  return {
    key: dominant?.key ?? "1to24h",
    label,
    detail: `${dominant?.count ?? 0} 笔，占总交易 ${((dominant?.share ?? 0) * 100).toFixed(1)}%`,
  };
}

function createDirectionalBiasLabel(directionBreakdown: OkxBreakdownItem[]): OkxLabel {
  const byCount = directionBreakdown.slice().sort((a, b) => b.count - a.count)[0];
  const byProfit = directionBreakdown.slice().sort((a, b) => b.netPnl - a.netPnl)[0];
  const countLabel = byCount?.label ?? "双向";
  const profitLabel = byProfit?.label ?? "双向";

  const detail =
    byCount && byProfit && byCount.key !== byProfit.key
      ? `${countLabel}负责频率，${profitLabel}贡献主要利润`
      : `${profitLabel}同时占据交易频率与利润重心`;

  return {
    key: `${countLabel}-${profitLabel}`,
    label: detail,
    detail: directionBreakdown
      .map((item) => `${item.label} ${item.count} 笔 / 胜率 ${(item.winRate * 100).toFixed(1)}%`)
      .join(" · "),
  };
}

function createLeverageLabel(
  items: OkxBreakdownItem[],
  pick: "best" | "worst",
): OkxLabel | null {
  const candidates = items.filter((item) => item.count >= 3);
  if (candidates.length === 0) return null;

  const picked =
    pick === "best"
      ? candidates.slice().sort((a, b) => b.netPnl - a.netPnl || b.winRate - a.winRate)[0]
      : candidates.slice().sort((a, b) => a.netPnl - b.netPnl || a.winRate - b.winRate)[0];

  if (!picked) return null;

  return {
    key: picked.key,
    label: picked.label,
    detail: `${picked.count} 笔，净盈亏 ${picked.netPnl.toFixed(0)}，胜率 ${(picked.winRate * 100).toFixed(1)}%`,
  };
}

function createAssetLabels(assetBreakdown: OkxBreakdownItem[]): {
  moatAsset: OkxLabel | null;
  frictionAsset: OkxLabel | null;
  blackholeAsset: OkxLabel | null;
} {
  const stableAssets = assetBreakdown.filter((item) => item.count >= 2);

  const moat = stableAssets
    .filter((item) => item.netPnl > 0)
    .slice()
    .sort((a, b) => (b.netPnl * Math.log(b.count + 1)) - (a.netPnl * Math.log(a.count + 1)))[0] ?? null;

  const friction = stableAssets
    .slice()
    .sort((a, b) => {
      const scoreA = (a.totalFees / Math.max(Math.abs(a.netPnl), 1)) * a.count;
      const scoreB = (b.totalFees / Math.max(Math.abs(b.netPnl), 1)) * b.count;
      return scoreB - scoreA;
    })[0] ?? null;

  const blackhole = stableAssets
    .filter((item) => item.netPnl < 0)
    .slice()
    .sort((a, b) => a.netPnl - b.netPnl)[0] ?? null;

  return {
    moatAsset: moat && {
      key: moat.key,
      label: moat.label,
      detail: `${moat.count} 笔，净盈亏 ${moat.netPnl.toFixed(0)}`,
    },
    frictionAsset: friction && {
      key: friction.key,
      label: friction.label,
      detail: `${friction.count} 笔，手续费 ${friction.totalFees.toFixed(0)}，净盈亏 ${friction.netPnl.toFixed(0)}`,
    },
    blackholeAsset: blackhole && {
      key: blackhole.key,
      label: blackhole.label,
      detail: `${blackhole.count} 笔，净盈亏 ${blackhole.netPnl.toFixed(0)}`,
    },
  };
}

export function parseOkxCsv(raw: string): OkxTrade[] {
  const normalized = raw.replace(/^﻿/, "");
  const lines = normalized.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const dataLines = lines.slice(2);

  return dataLines.map((line) => {
    const columns = line.split(",");
    const createdAt = normalizeDateTimeText(String(columns[0] ?? ""));
    const updatedAt = normalizeDateTimeText(String(columns[1] ?? ""));
    const leverage = parseNumber(columns[7]);
    const maxPosition = parseNumber(columns[8]);
    const openPrice = parseNumber(columns[10]);
    const contractFaceValue = parseNumber(columns[19]);
    const contractMultiplier = parseNumber(columns[20]);
    const grossPnl = parseNumber(columns[13]);
    const fees = parseNumber(columns[15]);
    const funding = parseNumber(columns[16]);
    const createdTimestamp = normalizeTimestamp(createdAt);
    const updatedTimestamp = normalizeTimestamp(updatedAt);
    const holdHours = Math.max(0, (updatedTimestamp - createdTimestamp) / 3_600_000);
    const holdBucket = determineHoldBucket(holdHours);
    const nominalValue = maxPosition * openPrice * contractFaceValue * contractMultiplier;
    const marginUsed = leverage > 0 ? nominalValue / leverage : 0;
    const closeType = String(columns[18] ?? columns[17] ?? "").trim();

    return {
      createdAt,
      updatedAt,
      createdTimestamp,
      updatedTimestamp,
      symbol: String(columns[3] ?? "").trim(),
      asset: String(columns[3] ?? "").trim().split("-")[0] ?? "",
      product: String(columns[4] ?? "").trim(),
      marginMode: String(columns[5] ?? "").trim(),
      direction: String(columns[6] ?? "").trim(),
      leverage,
      maxPosition,
      closedPosition: parseNumber(columns[9]),
      openPrice,
      closePrice: parseNumber(columns[11]),
      marginCurrency: String(columns[12] ?? "").trim(),
      grossPnl,
      reportedRoi: parseNumber(columns[14]),
      fees,
      funding,
      closeType,
      contractFaceValue,
      contractMultiplier,
      holdHours,
      holdBucket,
      nominalValue,
      marginUsed,
      netPnl: grossPnl + fees + funding,
    };
  });
}

export function applyOkxTradeFilters(trades: OkxTrade[], filters: OkxTradeFilters): OkxTrade[] {
  let next = trades.filter((trade) => {
    const closedDate = dateKeyOf(trade.updatedAt);
    if (filters.startDate && closedDate < filters.startDate) return false;
    if (filters.endDate && closedDate > filters.endDate) return false;
    if (filters.assetScope === "mainstream-only" && !OKX_MAINSTREAM_ASSETS.includes(trade.asset as (typeof OKX_MAINSTREAM_ASSETS)[number])) {
      return false;
    }
    if (filters.excludedHoldBuckets?.includes(trade.holdBucket)) return false;
    if (filters.excludedLeverages?.includes(trade.leverage)) return false;
    return true;
  });

  if (filters.excludeTopProfit && next.length > 0) {
    const topProfitIndex = next.reduce((bestIndex, trade, index, list) => {
      const best = list[bestIndex];
      if (trade.netPnl > best.netPnl) return index;
      if (trade.netPnl === best.netPnl && trade.updatedTimestamp < best.updatedTimestamp) return index;
      return bestIndex;
    }, 0);
    next = next.filter((_, index) => index !== topProfitIndex);
  }

  if (filters.excludeTopLoss && next.length > 0) {
    const topLossIndex = next.reduce((worstIndex, trade, index, list) => {
      const worst = list[worstIndex];
      if (trade.netPnl < worst.netPnl) return index;
      if (trade.netPnl === worst.netPnl && trade.updatedTimestamp < worst.updatedTimestamp) return index;
      return worstIndex;
    }, 0);
    next = next.filter((_, index) => index !== topLossIndex);
  }

  return next;
}

export function deriveOkxMedianRegressionMetrics(trades: OkxTrade[]): OkxMedianRegressionMetric[] {
  if (trades.length === 0) {
    throw new Error("OKX 交易数据为空");
  }

  const nominalValues = trades.map((trade) => trade.nominalValue);
  const netPnls = trades.map((trade) => trade.netPnl);
  const fees = trades.map((trade) => Math.abs(trade.fees));
  const holdHours = trades.map((trade) => trade.holdHours);

  return [
    {
      key: "fee",
      label: "单笔手续费",
      currentValue: mean(fees),
      baselineValue: median(fees),
      minValue: Math.min(...fees),
      maxValue: Math.max(...fees),
      values: fees,
    },
    {
      key: "nominalValue",
      label: "仓位价值",
      currentValue: mean(nominalValues),
      baselineValue: median(nominalValues),
      minValue: Math.min(...nominalValues),
      maxValue: Math.max(...nominalValues),
      values: nominalValues,
    },
    {
      key: "holdHours",
      label: "持仓时长",
      currentValue: mean(holdHours),
      baselineValue: median(holdHours),
      minValue: Math.min(...holdHours),
      maxValue: Math.max(...holdHours),
      values: holdHours,
    },
    {
      key: "netPnl",
      label: "收益 / 亏损",
      currentValue: mean(netPnls),
      baselineValue: median(netPnls),
      minValue: Math.min(...netPnls),
      maxValue: Math.max(...netPnls),
      values: netPnls,
    },
  ];
}

interface BriefingCandidate {
  dimension: "direction" | "duration" | "leverage" | "asset";
  dimensionLabel: string;
  item: OkxBreakdownItem;
  score: number;
}

function createBriefingCandidates(analytics: OkxAnalytics): BriefingCandidate[] {
  const groups: Array<{ dimension: BriefingCandidate["dimension"]; dimensionLabel: string; items: OkxBreakdownItem[] }> = [
    { dimension: "direction", dimensionLabel: "方向", items: analytics.directionBreakdown },
    { dimension: "duration", dimensionLabel: "节奏", items: analytics.durationBreakdown },
    { dimension: "leverage", dimensionLabel: "杠杆", items: analytics.leverageBreakdown },
    { dimension: "asset", dimensionLabel: "品种", items: analytics.assetBreakdown },
  ];

  return groups.flatMap(({ dimension, dimensionLabel, items }) =>
    items.map((item) => ({
      dimension,
      dimensionLabel,
      item,
      score: item.avgNetPnl * Math.max(item.count, 1) * clamp01(item.winRate + 0.15),
    })),
  );
}

function pickBestEdgeCandidate(analytics: OkxAnalytics): BriefingCandidate | null {
  const candidates = createBriefingCandidates(analytics)
    .filter(({ item }) => item.netPnl > 0 && !isLowSample(item))
    .sort((a, b) => b.score - a.score || b.item.netPnl - a.item.netPnl);
  return candidates[0] ?? null;
}

function pickMainLeakCandidate(analytics: OkxAnalytics): BriefingCandidate | null {
  const candidates = createBriefingCandidates(analytics)
    .filter(({ item }) => item.netPnl < 0 && !isLowSample(item))
    .sort((a, b) => a.score - b.score || a.item.netPnl - b.item.netPnl);
  return candidates[0] ?? null;
}

function makeHeadline(analytics: OkxAnalytics): string {
  const { netPnl, profitFactor, maxProfitDrawdownRatio, totalTrades, winRate } = analytics.overview;

  if (totalTrades < 12) return "样本偏小，先把结论当假设";
  if (netPnl > 0 && profitFactor >= 1.4 && maxProfitDrawdownRatio <= 0.2) return "系统已具备正期望，且波动相对可控";
  if (netPnl > 0 && profitFactor >= 1.1) return maxProfitDrawdownRatio > 0.3 ? "系统赚钱，但回撤还需要收敛" : "系统已转正，下一步是放大稳定优势";
  if (winRate >= 0.5 && profitFactor < 1) return "命中率不差，但盈亏比还在拖后腿";
  return "系统还不稳定，先修复亏损来源再谈放大";
}

function makeSummary(analytics: OkxAnalytics): string {
  const { totalTrades, netPnl, profitFactor, winRate, maxProfitDrawdownRatio } = analytics.overview;
  return `${analytics.period.createdFrom} 至 ${analytics.period.closedTo} 共 ${totalTrades} 笔完结仓位，净盈亏 ${fmtSigned(netPnl)} USDT，利润因子 ${profitFactor.toFixed(2)}，胜率 ${fmtPct(winRate)}，利润回撤 ${fmtPct(maxProfitDrawdownRatio)}。下面的结论优先依据稳定样本，而不是被单笔极值牵着走。`;
}

function buildPrimaryEdge(analytics: OkxAnalytics): OkxDeskBriefing["primaryEdge"] {
  const candidate = pickBestEdgeCandidate(analytics);
  if (!candidate) {
    return {
      title: "整体样本还没有形成稳定优势",
      detail: `当前总样本 ${analytics.overview.totalTrades} 笔，先继续积累可复用的盈利模式，再观察哪一类动作能稳定贡献利润。`,
    };
  }

  return {
    title: `${candidate.dimensionLabel} · ${candidate.item.label}`,
    detail: `${candidate.item.count} 笔，净盈亏 ${fmtSigned(candidate.item.netPnl)} USDT，胜率 ${fmtPct(candidate.item.winRate)}，单笔均值 ${fmtSigned(candidate.item.avgNetPnl)} USDT。当前这是最值得优先复用的稳定优势。`,
  };
}

function buildMainLeak(analytics: OkxAnalytics): OkxDeskBriefing["mainLeak"] {
  const candidate = pickMainLeakCandidate(analytics);
  if (!candidate) {
    return {
      title: "当前没有明显的稳定性黑洞",
      detail: "主要拖累更像来自整体执行噪音，而不是某一个固定方向、节奏、杠杆档或品种。",
    };
  }

  return {
    title: `${candidate.dimensionLabel} · ${candidate.item.label}`,
    detail: `${candidate.item.count} 笔，净盈亏 ${fmtSigned(candidate.item.netPnl)} USDT，胜率 ${fmtPct(candidate.item.winRate)}，单笔均值 ${fmtSigned(candidate.item.avgNetPnl)} USDT。这里是当前最该先收缩和复盘的稳定漏点。`,
  };
}

function buildBullets(analytics: OkxAnalytics): string[] {
  const bullets: string[] = [];
  const { avgWin, avgLoss, profitFactor, winRate, maxProfitDrawdownRatio, totalFees, grossPnl, avgHoldHours } = analytics.overview;
  const feeDragRatio = grossPnl > 0 ? totalFees / grossPnl : 0;
  const bestEdge = pickBestEdgeCandidate(analytics);
  const mainLeak = pickMainLeakCandidate(analytics);

  bullets.push(`胜率 ${fmtPct(winRate)}，利润因子 ${profitFactor.toFixed(2)}，平均盈利 / 平均亏损约为 ${(avgLoss > 0 ? avgWin / avgLoss : avgWin).toFixed(2)}R。先看正期望是否成立，再决定该放大还是先修复。`);
  bullets.push(`利润回撤 ${fmtPct(maxProfitDrawdownRatio)}，平均持仓 ${fmtHours(avgHoldHours)}，手续费约吃掉毛利润的 ${fmtPct(feeDragRatio)}。这三项一起决定系统的波动质量。`);

  if (bestEdge && mainLeak) {
    bullets.push(`${bestEdge.dimensionLabel}里的 ${bestEdge.item.label} 是当前最稳的利润来源，而 ${mainLeak.dimensionLabel}里的 ${mainLeak.item.label} 在持续泄漏利润。下一轮优化先围绕这对强弱点做取舍。`);
  } else if (bestEdge) {
    bullets.push(`当前比较明确的优势来自 ${bestEdge.dimensionLabel} · ${bestEdge.item.label}，先集中复用这类 setup，再看其他维度是否能跟上。`);
  } else if (mainLeak) {
    bullets.push(`当前最明显的拖累来自 ${mainLeak.dimensionLabel} · ${mainLeak.item.label}，优先限制这类动作的出现频率。`);
  } else {
    bullets.push("当前维度拆解还没出现足够稳定的强弱分层，更适合继续积累样本，而不是急着下大结论。");
  }

  return bullets;
}

function buildActionItems(analytics: OkxAnalytics): string[] {
  const items: string[] = [];
  const bestEdge = pickBestEdgeCandidate(analytics);
  const mainLeak = pickMainLeakCandidate(analytics);
  const { netPnl, profitFactor, maxProfitDrawdownRatio, totalFees, grossPnl, winRate } = analytics.overview;
  const feeDragRatio = grossPnl > 0 ? totalFees / grossPnl : 0;

  if (bestEdge) {
    items.push(`把更多样本集中到 ${bestEdge.dimensionLabel} · ${bestEdge.item.label}，它目前是最稳定的利润来源。`);
  }

  if (mainLeak) {
    items.push(`把 ${mainLeak.dimensionLabel} · ${mainLeak.item.label} 设为重点限制项；在没有新证据前，先减少这类动作的权重。`);
  }

  if (maxProfitDrawdownRatio > 0.3) {
    items.push(`先压回撤，再追增长；当前利润回撤 ${fmtPct(maxProfitDrawdownRatio)}，仓位尺度和出手密度都需要更克制。`);
  } else if (profitFactor < 1 || netPnl <= 0) {
    items.push(`先修复负期望来源；当前利润因子 ${profitFactor.toFixed(2)}，需要把平均亏损压回到平均盈利可覆盖的范围内。`);
  } else if (feeDragRatio > 0.2) {
    items.push(`减少高摩擦交易；手续费已吃掉毛利润的 ${fmtPct(feeDragRatio)}，先提高每笔交易的质量。`);
  } else {
    items.push(`保持当前有效框架，但继续验证稳定性；目前胜率 ${fmtPct(winRate)}，更重要的是让优势在更多样本上重复出现。`);
  }

  return items.slice(0, 3);
}

function buildWatchItems(analytics: OkxAnalytics): string[] {
  const threshold = Math.max(Math.abs(analytics.overview.avgNetPnl) * 3, 1);
  const groups: Array<{ label: string; items: OkxBreakdownItem[] }> = [
    { label: "方向", items: analytics.directionBreakdown },
    { label: "节奏", items: analytics.durationBreakdown },
    { label: "杠杆", items: analytics.leverageBreakdown },
    { label: "品种", items: analytics.assetBreakdown },
  ];

  return groups
    .flatMap(({ label, items }) =>
      items
        .filter((item) => isLowSample(item) && Math.abs(item.netPnl) >= threshold)
        .map((item) => `${label} · ${item.label} 仅 ${item.count} 笔，净盈亏 ${fmtSigned(item.netPnl)} USDT，先观察，不直接当成稳定结论。`),
    )
    .slice(0, 4);
}

export function deriveOkxDeskBriefing(analytics: OkxAnalytics): OkxDeskBriefing {
  return {
    headline: makeHeadline(analytics),
    summary: makeSummary(analytics),
    primaryEdge: buildPrimaryEdge(analytics),
    mainLeak: buildMainLeak(analytics),
    bullets: buildBullets(analytics),
    actionItems: buildActionItems(analytics),
    watchItems: buildWatchItems(analytics),
  };
}

export function analyzeOkxTrades(trades: OkxTrade[]): OkxAnalytics {
  if (trades.length === 0) {
    throw new Error("OKX 交易数据为空");
  }

  const chronTrades = trades.slice().sort((a, b) => a.updatedTimestamp - b.updatedTimestamp);
  const totalTrades = chronTrades.length;
  const grossPnl = chronTrades.reduce((sum, trade) => sum + trade.grossPnl, 0);
  const netPnl = sumNetPnl(chronTrades);
  const totalFees = chronTrades.reduce((sum, trade) => sum + Math.abs(trade.fees), 0);
  const totalFunding = chronTrades.reduce((sum, trade) => sum + trade.funding, 0);
  const winners = chronTrades.filter((trade) => trade.netPnl > 0);
  const losers = chronTrades.filter((trade) => trade.netPnl < 0);
  const grossProfit = sumNetPnl(winners);
  const grossLoss = sumNetPnl(losers);
  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0;
  const avgLoss = losers.length > 0 ? Math.abs(grossLoss / losers.length) : 0;
  const longTrades = chronTrades.filter((trade) => trade.direction === "做多");
  const shortTrades = chronTrades.filter((trade) => trade.direction === "做空");
  const leverageBreakdown = groupTrades(chronTrades, (trade) => `${trade.leverage}x`, (trade) => `${trade.leverage}x`)
    .sort((a, b) => Number(a.key.replace("x", "")) - Number(b.key.replace("x", "")));
  const directionBreakdown = groupTrades(chronTrades, (trade) => trade.direction, (trade) => trade.direction);
  const durationBreakdown = groupTrades(chronTrades, (trade) => trade.holdBucket, (trade) => durationLabel(trade.holdBucket))
    .sort((a, b) => {
      const order: Record<OkxDurationBucket, number> = { lt1h: 0, "1to24h": 1, gt24h: 2 };
      return order[a.key as OkxDurationBucket] - order[b.key as OkxDurationBucket];
    });
  const assetBreakdown = groupTrades(chronTrades, (trade) => trade.asset, (trade) => trade.asset)
    .sort((a, b) => b.netPnl - a.netPnl || b.count - a.count);

  let cumulative = 0;
  let peak = 0;
  let maxDrawdownRatio = 0;
  let maxDrawdownAmount = 0;
  let lowestCumulativeNet = 0;
  const cumulativeSeries: OkxSeriesPoint[] = [];

  for (const trade of chronTrades) {
    cumulative += trade.netPnl;
    peak = Math.max(peak, cumulative);
    const drawdownAmount = peak - cumulative;
    const drawdownRatio = peak > 0 ? drawdownAmount / peak : 0;
    maxDrawdownRatio = Math.max(maxDrawdownRatio, drawdownRatio);
    maxDrawdownAmount = Math.max(maxDrawdownAmount, drawdownAmount);
    lowestCumulativeNet = Math.min(lowestCumulativeNet, cumulative);

    cumulativeSeries.push({
      label: trade.updatedAt,
      timestamp: trade.updatedTimestamp,
      netPnl: trade.netPnl,
      cumulativeNetPnl: cumulative,
      drawdownAmount,
      drawdownRatio,
    });
  }

  const createdFrom = dateKeyOf(chronTrades[0].createdAt);
  const closedTo = dateKeyOf(chronTrades[chronTrades.length - 1].updatedAt);
  const activeDays = new Set(chronTrades.map((trade) => dateKeyOf(trade.updatedAt))).size;
  const spanDays = Math.max(
    1,
    (chronTrades[chronTrades.length - 1].updatedTimestamp - chronTrades[0].createdTimestamp) / 86_400_000,
  );
  const byAsset = assetBreakdown.map((item) => ({ label: item.label, netPnl: item.netPnl }));
  const byLeverage = leverageBreakdown.map((item) => ({ label: item.label, netPnl: item.netPnl }));
  const byDuration = durationBreakdown.map((item) => ({ label: item.label, netPnl: item.netPnl }));
  const daily = aggregateByBucket(chronTrades, (trade) => dateKeyOf(trade.updatedAt));
  const weekly = aggregateByBucket(chronTrades, (trade) => startOfWeek(dateKeyOf(trade.updatedAt)));
  const labelsFromAssets = createAssetLabels(assetBreakdown);

  const analytics: OkxAnalytics = {
    period: {
      createdFrom,
      closedTo,
      spanDays,
      activeDays,
      tradesPerDay: totalTrades / spanDays,
    },
    overview: {
      totalTrades,
      grossPnl,
      netPnl,
      totalFees,
      totalFunding,
      winRate: winners.length / totalTrades,
      profitFactor: losers.length > 0 ? grossProfit / Math.abs(grossLoss) : grossProfit,
      avgNetPnl: netPnl / totalTrades,
      avgWin,
      avgLoss,
      riskRewardRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin,
      maxProfit: Math.max(...chronTrades.map((trade) => trade.netPnl)),
      maxLoss: Math.min(...chronTrades.map((trade) => trade.netPnl)),
      avgLeverage: chronTrades.reduce((sum, trade) => sum + trade.leverage, 0) / totalTrades,
      avgMarginUsed: chronTrades.reduce((sum, trade) => sum + trade.marginUsed, 0) / totalTrades,
      medianMarginUsed: median(chronTrades.map((trade) => trade.marginUsed)),
      maxMarginUsed: Math.max(...chronTrades.map((trade) => trade.marginUsed)),
      avgNominalValue: chronTrades.reduce((sum, trade) => sum + trade.nominalValue, 0) / totalTrades,
      medianNominalValue: median(chronTrades.map((trade) => trade.nominalValue)),
      maxNominalValue: Math.max(...chronTrades.map((trade) => trade.nominalValue)),
      avgPositionRoi: chronTrades.reduce((sum, trade) => sum + (trade.marginUsed > 0 ? trade.netPnl / trade.marginUsed : 0), 0) / totalTrades,
      avgLongNetPnl: longTrades.length > 0 ? sumNetPnl(longTrades) / longTrades.length : 0,
      avgShortNetPnl: shortTrades.length > 0 ? sumNetPnl(shortTrades) / shortTrades.length : 0,
      avgHoldHours: chronTrades.reduce((sum, trade) => sum + trade.holdHours, 0) / totalTrades,
      maxHoldHours: Math.max(...chronTrades.map((trade) => trade.holdHours)),
      maxProfitDrawdownRatio: maxDrawdownRatio,
      maxProfitDrawdownAmount: maxDrawdownAmount,
      lowestCumulativeNet,
      capitalEfficiency: chronTrades.reduce((sum, trade) => sum + trade.marginUsed, 0) > 0
        ? netPnl / chronTrades.reduce((sum, trade) => sum + trade.marginUsed, 0)
        : 0,
    },
    directionBreakdown,
    durationBreakdown,
    leverageBreakdown,
    assetBreakdown,
    charts: {
      cumulative: cumulativeSeries,
      daily,
      weekly,
      byAsset,
      byLeverage,
      byDuration,
    },
    labels: {
      cadence: createCadenceLabel({
        createdFrom,
        closedTo,
        spanDays,
        activeDays,
        tradesPerDay: totalTrades / spanDays,
      }),
      holdingStyle: createHoldingStyleLabel(durationBreakdown),
      directionalBias: createDirectionalBiasLabel(directionBreakdown),
      sweetSpotLeverage: createLeverageLabel(leverageBreakdown, "best"),
      poisonZoneLeverage: createLeverageLabel(
        leverageBreakdown.slice().sort((a, b) => {
          const scoreA = a.netPnl * clamp01(a.winRate + 0.25);
          const scoreB = b.netPnl * clamp01(b.winRate + 0.25);
          return scoreA - scoreB;
        }),
        "worst",
      ),
      moatAsset: labelsFromAssets.moatAsset,
      frictionAsset: labelsFromAssets.frictionAsset,
      blackholeAsset: labelsFromAssets.blackholeAsset,
    },
  };

  return analytics;
}

export function deriveOkxPrincipalMetrics(
  cumulativeSeries: OkxSeriesPoint[],
  principal: number,
): OkxPrincipalMetrics {
  if (!(principal > 0)) {
    throw new Error("本金必须大于 0");
  }

  let peakEquity = principal;
  let lowestCapital = principal;
  let maxDrawdownRatio = 0;
  let maxDrawdownAmount = 0;

  const equitySeries = cumulativeSeries.map((point) => {
    const equity = principal + point.cumulativeNetPnl;
    peakEquity = Math.max(peakEquity, equity);
    lowestCapital = Math.min(lowestCapital, equity);

    const drawdownAmount = peakEquity - equity;
    const drawdownRatio = peakEquity > 0 ? drawdownAmount / peakEquity : 0;
    maxDrawdownRatio = Math.max(maxDrawdownRatio, drawdownRatio);
    maxDrawdownAmount = Math.max(maxDrawdownAmount, drawdownAmount);

    return {
      label: point.label,
      timestamp: point.timestamp,
      equity,
      cumulativeNetPnl: point.cumulativeNetPnl,
      drawdownAmount,
      drawdownRatio,
    };
  });

  const currentCapital = principal + cumulativeSeries[cumulativeSeries.length - 1].cumulativeNetPnl;

  return {
    principal,
    currentCapital,
    principalRoi: (currentCapital - principal) / principal,
    lowestCapital,
    maxDrawdownRatio,
    maxDrawdownAmount,
    didBreachZero: lowestCapital <= 0,
    equitySeries,
  };
}
