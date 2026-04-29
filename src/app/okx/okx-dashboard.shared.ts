import { OKX_LOW_SAMPLE_THRESHOLD, type OkxBreakdownItem } from "@/lib/finance/okx";

export const STORAGE_KEY = "financial.okx.principal-usdt";
export const PALETTE = ["#d97757", "#8fb8a6", "#dfb661", "#9b86d6", "#c66876", "#5fa4b8"];
export type OkxFilterPreset = "mainstream-swing" | "stress-test" | "full-sample";

export function fmtDigits(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtUsdt(value: number, decimals = 0): string {
  return `${fmtDigits(value, decimals)} USDT`;
}

export function fmtSignedUsdt(value: number, decimals = 0): string {
  const prefix = value >= 0 ? "+" : "-";
  return `${prefix}${fmtUsdt(Math.abs(value), decimals)}`;
}

export function fmtPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function fmtHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} 分钟`;
  if (hours < 24) return `${hours.toFixed(1)} 小时`;
  return `${(hours / 24).toFixed(1)} 天`;
}

export function assetGlyph(asset: string): string {
  const known: Record<string, string> = {
    BTC: "₿",
    ETH: "Ξ",
    SOL: "◎",
    BNB: "◇",
    ORDI: "⟠",
    STRK: "S",
    TRUMP: "T",
    ZEN: "Z",
  };

  return known[asset] ?? asset.slice(0, 2).toUpperCase();
}

export function assetColor(asset: string): string {
  const known: Record<string, string> = {
    BTC: "#dfb661",
    ETH: "#8d83c4",
    SOL: "#6cb6aa",
    BNB: "#d97757",
    ORDI: "#c66876",
    STRK: "#8f9ad7",
    TRUMP: "#c44b57",
    ZEN: "#7ea26b",
  };

  return known[asset] ?? "#8fb8a6";
}

export function leverageGlyph(label: string): string {
  return label.replace(/\.0x$/, "x");
}

export function leverageColor(label: string): string {
  const value = Number(label.replace("x", ""));
  if (!Number.isFinite(value)) return "#dfb661";
  if (value <= 3) return "#8fb8a6";
  if (value <= 10) return "#dfb661";
  if (value <= 20) return "#d97757";
  return "#f39ba6";
}

export function labelTone(label: string): { fg: string; bg: string } {
  if (label.includes("甜点") || label.includes("护城河") || label.includes("克制")) {
    return { fg: "#9bd3ae", bg: "rgba(155, 211, 174, 0.12)" };
  }
  if (label.includes("毒药") || label.includes("黑洞")) {
    return { fg: "#f39ba6", bg: "rgba(243, 155, 166, 0.12)" };
  }

  return { fg: "#dfb661", bg: "rgba(223, 182, 97, 0.12)" };
}

export function isLowSample(item: OkxBreakdownItem): boolean {
  return item.count < OKX_LOW_SAMPLE_THRESHOLD;
}

export function pickTicks(points: Array<{ label: string }>, count = 4): string[] {
  if (points.length <= count) return points.map((point) => point.label);

  const result = new Set<string>();
  for (let index = 0; index < count; index += 1) {
    const picked = Math.round((index * (points.length - 1)) / (count - 1));
    result.add(points[picked].label);
  }

  return Array.from(result);
}

export function compactDateLabel(label: string): string {
  return label.length >= 10 ? label.slice(5) : label;
}

export { OKX_LOW_SAMPLE_THRESHOLD };
