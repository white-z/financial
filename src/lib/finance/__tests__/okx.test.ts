import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  analyzeOkxTrades,
  applyOkxTradeFilters,
  deriveOkxDeskBriefing,
  deriveOkxMedianRegressionMetrics,
  deriveOkxPrincipalMetrics,
  parseOkxCsv,
} from "../okx";

const raw = readFileSync(
  path.join(process.cwd(), "public", "static", "okx__2025-04-20~2026-04-20.csv"),
  "utf8",
);
const altCsvPath = path.join(process.cwd(), "public", "static", "okx__2025-04-20~2026-04-20-2.csv");
const rawAlt = existsSync(altCsvPath) ? readFileSync(altCsvPath, "utf8") : null;

describe("OKX CSV analytics", () => {
  it("能解析出完整的交易记录并识别关键字段", () => {
    const trades = parseOkxCsv(raw);

    expect(trades).toHaveLength(77);
    expect(trades[0].asset).toBe("ETH");
    expect(trades[0].closeType).toBe("全部平仓");
    expect(trades[0].netPnl).toBeCloseTo(-113.13787992, 6);
    expect(trades[0].holdBucket).toBe("1to24h");
  });

  it("能汇总出计划要求的核心账户指标和标签", () => {
    const analytics = analyzeOkxTrades(parseOkxCsv(raw));

    expect(analytics.overview.totalTrades).toBe(77);
    expect(analytics.overview.netPnl).toBeCloseTo(2090.465052646662, 6);
    expect(analytics.overview.totalFees).toBeCloseTo(601.9168589020001, 6);
    expect(analytics.overview.winRate).toBeCloseTo(0.5324675324675324, 6);
    expect(analytics.labels.sweetSpotLeverage?.label).toBe("10x");
    expect(analytics.labels.moatAsset?.label).toBe("BTC");
    expect(analytics.labels.blackholeAsset?.label).toBe("TRUMP");
  });

  it("输入本金后会推导真实资金回撤和本金回报率", () => {
    const analytics = analyzeOkxTrades(parseOkxCsv(raw));
    const capital = deriveOkxPrincipalMetrics(analytics.charts.cumulative, 3000);

    expect(capital.currentCapital).toBeCloseTo(5090.465052646662, 6);
    expect(capital.principalRoi).toBeCloseTo(0.696821684215554, 6);
    expect(capital.lowestCapital).toBeCloseTo(2426.7243745555534, 6);
    expect(capital.maxDrawdownRatio).toBeCloseTo(0.19109187514814888, 6);
    expect(capital.didBreachZero).toBe(false);
  });

  it("能生成中位数回归柱状图所需的四类指标", () => {
    const metrics = deriveOkxMedianRegressionMetrics(parseOkxCsv(raw));
    const openPrice = metrics.find((item) => item.key === "openPrice");
    const nominalValue = metrics.find((item) => item.key === "nominalValue");
    const winRate = metrics.find((item) => item.key === "winRate");
    const netPnl = metrics.find((item) => item.key === "netPnl");

    expect(metrics).toHaveLength(4);
    expect(openPrice?.label).toBe("开仓均价");
    expect(openPrice?.baselineValue).toBeGreaterThan(0);
    expect(nominalValue?.currentValue).toBeGreaterThan(nominalValue?.baselineValue ?? 0);
    expect(winRate?.currentValue).toBeCloseTo(0.5324675324675324, 6);
    expect(winRate?.baselineValue).toBe(0.5);
    expect(netPnl?.minValue).toBeLessThan(0);
    expect(netPnl?.maxValue).toBeGreaterThan(0);
  });

  it("支持按时间范围和极值单动态过滤", () => {
    const trades = parseOkxCsv(raw);
    const ranged = applyOkxTradeFilters(trades, {
      startDate: "2026-04-01",
      endDate: "2026-04-20",
    });
    const withoutSelectedLeverage = applyOkxTradeFilters(trades, {
      excludedLeverages: [50, 75],
    });
    const withoutTopProfit = applyOkxTradeFilters(trades, { excludeTopProfit: true });
    const mainstreamSwing = applyOkxTradeFilters(trades, {
      assetScope: "mainstream-only",
      excludedHoldBuckets: ["lt1h"],
    });

    expect(ranged.length).toBeGreaterThan(0);
    expect(ranged.length).toBeLessThan(trades.length);
    expect(ranged.every((trade) => trade.updatedAt.slice(0, 10) >= "2026-04-01" && trade.updatedAt.slice(0, 10) <= "2026-04-20")).toBe(true);
    expect(withoutSelectedLeverage.every((trade) => ![50, 75].includes(trade.leverage))).toBe(true);
    expect(withoutSelectedLeverage.length).toBeLessThan(trades.length);
    expect(withoutTopProfit).toHaveLength(trades.length - 1);
    expect(Math.max(...withoutTopProfit.map((trade) => trade.netPnl))).toBeLessThan(Math.max(...trades.map((trade) => trade.netPnl)));
    expect(mainstreamSwing.every((trade) => ["BTC", "ETH", "SOL", "BNB"].includes(trade.asset))).toBe(true);
    expect(mainstreamSwing.every((trade) => trade.holdBucket !== "lt1h")).toBe(true);
  });

  if (rawAlt) {
    it("兼容带斜杠的美式平仓时间导出", () => {
      const trades = parseOkxCsv(rawAlt);
      const analytics = analyzeOkxTrades(trades);

      expect(trades).toHaveLength(62);
      expect(trades[0].updatedAt).toBe("2025-12-20 00:42:00");
      expect(trades[0].updatedTimestamp).toBeGreaterThan(trades[0].createdTimestamp);
      expect(trades[0].holdHours).toBeCloseTo(1.1769444444444443, 6);
      expect(trades[0].holdBucket).toBe("1to24h");
      expect(analytics.period.createdFrom).toBe("2025-10-30");
      expect(analytics.period.closedTo).toBe("2025-12-20");
    });
  }

  it("能为不同样本生成稳定的系统报告", () => {
    const originalBriefing = deriveOkxDeskBriefing(analyzeOkxTrades(parseOkxCsv(raw)));

    expect(originalBriefing.headline.length).toBeGreaterThan(0);
    expect(originalBriefing.summary).toContain("利润因子");
    expect(originalBriefing.primaryEdge.title).toContain("·");
    expect(originalBriefing.mainLeak.title).toContain("·");
    expect(originalBriefing.bullets).toHaveLength(3);
    expect(originalBriefing.actionItems).toHaveLength(3);
    expect(originalBriefing.watchItems.length).toBeGreaterThanOrEqual(0);

    if (rawAlt) {
      const altBriefing = deriveOkxDeskBriefing(analyzeOkxTrades(parseOkxCsv(rawAlt)));

      expect(altBriefing.headline.length).toBeGreaterThan(0);
      expect(altBriefing.summary).toContain("利润回撤");
      expect(altBriefing.primaryEdge.detail).toContain("胜率");
      expect(altBriefing.mainLeak.detail).toContain("稳定漏点");
      expect(altBriefing.watchItems.length).toBeGreaterThanOrEqual(0);
    }
  });
});
