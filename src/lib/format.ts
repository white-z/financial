/** 通用数字格式化工具 */

/** 本地货币（元），默认不保留小数 */
export function fmtCNY(n: number, decimals = 0): string {
  return "¥" + Math.abs(n).toLocaleString("zh-CN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 美元 */
export function fmtUSD(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/** 百分比，默认两位小数 */
export function fmtPct(n: number, decimals = 2): string {
  return (n * 100).toFixed(decimals) + "%";
}

/** 带正负号的货币 */
export function fmtSigned(n: number, decimals = 0): string {
  const prefix = n >= 0 ? "+" : "-";
  return prefix + "¥" + Math.abs(n).toLocaleString("zh-CN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** 天数 */
export function fmtDays(n: number): string {
  return `${n} 天`;
}

/** 万元 */
export function fmtWan(n: number, decimals = 2): string {
  return (n / 10000).toFixed(decimals) + " 万";
}

/** 通用数字（不含货币符号） */
export function fmtNum(n: number, decimals = 4): string {
  return n.toFixed(decimals);
}
