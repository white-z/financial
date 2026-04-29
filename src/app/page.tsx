import Link from "next/link";
import { MagneticCard } from "@/components/MagneticCard";
import { calculateMacroResult } from "@/lib/finance/ppp";
import { calculateCashFlow } from "@/lib/finance/cashflow";
import { generateSummary } from "@/lib/finance/summary";
import { getLatestMacroCheckAction } from "@/app/actions/macro";
import { getLatestCashflowAction } from "@/app/actions/cashflow";

/* ── 静态装饰：同龄人财富水位仪表盘 ───────────────────────── */
type WealthGaugeProps = {
  percentile?: number | null;
};

function WealthGauge({ percentile }: WealthGaugeProps) {
  const R = 58;
  const cx = 72;
  const cy = 72;
  const arcLen = Math.PI * R;
  const hasValue = typeof percentile === "number" && Number.isFinite(percentile);
  const pctBase = hasValue ? percentile! : 68;
  const pct = Math.max(0, Math.min(100, Math.round(pctBase)));
  const dash = (pct / 100) * arcLen;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <svg width="144" height="82" viewBox="0 0 144 82">
        <path
          d="M 14 72 A 58 58 0 0 1 130 72"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00C875" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>
        </defs>
        <path
          d="M 14 72 A 58 58 0 0 1 130 72"
          fill="none"
          stroke="url(#arcGrad)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${arcLen}`}
          style={{ filter: "drop-shadow(0 0 5px rgba(0,229,255,0.55))" }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="22" fontWeight="700"
          fontFamily="var(--font-geist-sans), system-ui" style={{ fontVariantNumeric: "tabular-nums" }}>
          {pct}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(139,146,165,0.75)" fontSize="9"
          fontFamily="var(--font-geist-sans), system-ui" letterSpacing="1">
          PERCENTILE
        </text>
        <text x="10"  y="82" fill="rgba(139,146,165,0.45)" fontSize="8" fontFamily="system-ui">P0</text>
        <text x="65"  y="16" fill="rgba(139,146,165,0.45)" fontSize="8" textAnchor="middle" fontFamily="system-ui">P50</text>
        <text x="130" y="82" fill="rgba(139,146,165,0.45)" fontSize="8" textAnchor="end"    fontFamily="system-ui">P100</text>
      </svg>
      <p style={{ color: "rgba(139,146,165,0.6)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
        同龄人财富水位
      </p>
    </div>
  );
}

/* ── 静态装饰：储蓄率进度条 ────────────────────────────────── */
type SavingsRateBarProps = {
  rate?: number | null; // 小数形式，如 0.23
};

function SavingsRateBar({ rate }: SavingsRateBarProps) {
  const hasValue = typeof rate === "number" && Number.isFinite(rate);
  const pctBase = hasValue ? rate! * 100 : 23;
  const pct = Math.max(0, Math.min(100, Math.round(pctBase)));
  return (
    <div className="w-full" style={{ userSelect: "none" }}>
      <div className="flex items-end justify-between mb-2">
        <span style={{ color: "rgba(139,146,165,0.7)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          SAVINGS RATE
        </span>
        <span className="num" style={{ color: "#00E5FF", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 999,
          background: "linear-gradient(90deg, #00C875, #00E5FF)",
          boxShadow: "0 0 8px rgba(0,229,255,0.4)",
        }} />
      </div>
      <div className="flex justify-between mt-1.5" style={{ color: "rgba(139,146,165,0.4)", fontSize: 9 }}>
        <span>0%</span><span>20% 优</span><span>50% 卓越</span>
      </div>
    </div>
  );
}

/* ── 静态装饰：三大健康状态药丸 ────────────────────────────── */
type HealthPill = { label: string; color: string; bg: string };

type HealthPillsProps = {
  pills?: HealthPill[] | null;
};

function HealthPills({ pills }: HealthPillsProps) {
  const effectivePills: HealthPill[] = pills && pills.length > 0
    ? pills
    : [
        { label: "净资产健康",  color: "#00C875", bg: "rgba(0,200,117,0.13)" },
        { label: "应急金充足",  color: "#00C875", bg: "rgba(0,200,117,0.13)" },
        { label: "高息负债警示", color: "#FF9B43", bg: "rgba(255,155,67,0.14)" },
      ];
  return (
    <div className="flex flex-wrap gap-2" style={{ userSelect: "none" }}>
      {effectivePills.map((p) => (
        <span key={p.label} style={{
          background: p.bg, color: p.color, borderRadius: 999,
          padding: "4px 12px", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.05em", textTransform: "uppercase",
        }}>
          {p.label}
        </span>
      ))}
    </div>
  );
}

/* ── 微观工具小卡片数据 ─────────────────────────────────────── */
const MICRO_TOOLS = [
  {
    id: "daily-yield",
    icon: "📈",
    title: "万份收益计算",
    desc: "输入万份收益与持仓份额，即时换算日收益与年化利率",
    color: "#00E5FF",
    bg: "rgba(0,229,255,0.10)",
  },
  {
    id: "path-xirr",
    icon: "♾️",
    title: "定投 XIRR 分析",
    desc: "多笔不规则现金流入出，精准计算年化内部收益率",
    color: "#A855F7",
    bg: "rgba(168,85,247,0.12)",
  },
  {
    id: "nav-return",
    icon: "📊",
    title: "净值年化收益",
    desc: "输入买入/当前净值与持仓天数，计算真实年化回报",
    color: "#00C875",
    bg: "rgba(0,200,117,0.11)",
  },
] as const;

const DATA_ROOM = {
  href: "/okx",
  icon: "⟁",
  title: "OKX 合约复盘室",
  desc: "读取年度仓位导出，拆解净利、回撤、杠杆甜点区与币种黑洞",
  color: "#D97757",
  bg: "rgba(217,119,87,0.12)",
} as const;

/* ═══════════════════════════════════════════════════════════
   主页 — Bento 网格布局
   ═══════════════════════════════════════════════════════════ */
export default async function Home() {
  // 默认使用占位数据，在 Supabase 可用且存在记录时用真实数据覆盖
  let wealthPercentile: number | null = null;
  let savingsRate: number | null = null;
  let healthPills: HealthPill[] | null = null;

  try {
    const [macroRes, cashRes] = await Promise.all([
      getLatestMacroCheckAction(),
      getLatestCashflowAction(),
    ]);

    const macro = macroRes.success ? macroRes.data : null;
    const cash = cashRes.success ? cashRes.data : null;

    if (macro) {
      wealthPercentile = macro.age_percentile;
    }
    if (cash) {
      savingsRate = cash.savings_rate;
    }

    if (macro && cash) {
      const macroResult = calculateMacroResult({
        age: macro.age,
        annualIncome: macro.annual_income,
        assets: {
          cash: macro.assets_cash,
          liquidInvest: macro.assets_invest_liquid,
          fixedIncome: macro.assets_fixed_income,
          property: macro.assets_property,
        },
        liabilities: {
          consumption: macro.liab_consumption,
          investment: macro.liab_investment,
          student: macro.liab_student,
        },
        pppRate: macro.ppp_rate,
      });
      const adjustedMacro = {
        ...macroResult,
        netWorth: macro.net_worth,
        netWorthPPP: macro.net_worth_ppp,
      };

      const cashFlowResult = calculateCashFlow({
        annualIncome: cash.annual_income,
        annualSpend: cash.annual_spend,
        targetAnnualSpend: cash.target_annual_spend,
      });

      const summary = generateSummary({
        macroResult: adjustedMacro,
        cashFlowResult,
        age: macro.age,
        cashAmount: macro.assets_cash,
        monthlyEssentialSpend: cash.annual_spend / 12,
        // 首页仅做轻量展示，暂按中性负债利率处理
        liabilityRates: [0.04],
      });

      const healthColor =
        summary.healthStatus === "ahead" ? "#22C55E" :
        summary.healthStatus === "behind" ? "#EF4444" :
        "#3B82F6";
      const healthBg =
        summary.healthStatus === "ahead" ? "rgba(34,197,94,0.16)" :
        summary.healthStatus === "behind" ? "rgba(239,68,68,0.16)" :
        "rgba(59,130,246,0.16)";

      const emergencyColor =
        summary.emergencyFundStatus === "comfortable" ? "#22C55E" :
        summary.emergencyFundStatus === "insufficient" ? "#EF4444" :
        "#3B82F6";
      const emergencyBg =
        summary.emergencyFundStatus === "comfortable" ? "rgba(34,197,94,0.16)" :
        summary.emergencyFundStatus === "insufficient" ? "rgba(239,68,68,0.16)" :
        "rgba(59,130,246,0.16)";

      const debtColor = summary.hasHighRateDebt ? "#EF4444" : "#22C55E";
      const debtBg = summary.hasHighRateDebt ? "rgba(239,68,68,0.16)" : "rgba(34,197,94,0.16)";

      healthPills = [
        {
          label: summary.healthLabel,
          color: healthColor,
          bg: healthBg,
        },
        {
          label: `应急金：${summary.emergencyFundMessage}`,
          color: emergencyColor,
          bg: emergencyBg,
        },
        {
          label: summary.hasHighRateDebt ? "高息负债警示" : "负债结构健康",
          color: debtColor,
          bg: debtBg,
        },
      ];
    }
  } catch {
    // 若 Supabase 未配置或查询失败，静默降级为占位数据
  }

  return (
    <div style={{ background: "var(--bg-page)" }} className="relative min-h-screen">

      {/* ── 顶部导航栏 ─────────────────────────────────────── */}
      <header style={{ background: "var(--bg-header)", borderBottom: "1px solid var(--border-card)" }}>
        <div className="mx-auto max-w-5xl px-8 py-7 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: "var(--text-muted)" }}>
              Personal Finance OS
            </p>
            <h1 className="text-[1.05rem] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
              全生命周期财务健康系统
            </h1>
          </div>
          <div
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "var(--primary-dim)", border: "1px solid rgba(0,229,255,0.2)" }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--primary)", boxShadow: "0 0 8px var(--primary)", display: "inline-block" }} />
            <span style={{ color: "var(--primary)", fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>LIVE TOOLS</span>
          </div>
        </div>
      </header>

      {/* ── Bento 主区域 ────────────────────────────────────── */}
      <main className="mx-auto max-w-5xl px-8 py-8">
        <div className="bento-grid" style={{ gridTemplateRows: "auto auto auto" }}>

          {/* ── 模块 01：宏观体检（大英雄卡） ──────────────── */}
          <Link
            href="/macro"
            className="card-premium card-enter card-enter-1 bento-hero flex flex-col p-8"
            style={{ minHeight: 380 }}
          >
            <div
              className="icon-wrap flex h-12 w-12 items-center justify-center rounded-[14px] text-2xl mb-6"
              style={{ background: "var(--accent-blue-bg)" }}
            >
              📊
            </div>

            <h2 className="text-[1.15rem] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
              全生命周期财务健康体检
            </h2>
            <p className="mt-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Macro Health Check
            </p>
            <p className="mt-3 text-sm flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              录入资产负债，结合 PPP 折算，与同龄人基准对比，量化你在财富曲线上的精准位置。
            </p>

            <div className="mt-auto pt-6 flex justify-center">
              <WealthGauge percentile={wealthPercentile} />
            </div>
          </Link>

          {/* ── 模块 02：现金流分析 ─────────────────────────── */}
          <Link
            href="/cashflow"
            className="card-premium card-enter card-enter-2 bento-side-top flex flex-col p-7"
          >
            <div
              className="icon-wrap flex h-10 w-10 items-center justify-center rounded-[12px] text-xl mb-5"
              style={{ background: "var(--accent-green-bg)" }}
            >
              💰
            </div>

            <h2 className="text-[1rem] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
              现金流与理想生活目标
            </h2>
            <p className="mt-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Cash Flow Analysis
            </p>
            <p className="mt-2.5 text-[13px] flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              储蓄率量化、4% 法则退休目标、收支缺口三维评估。
            </p>

            <div className="mt-4">
              <SavingsRateBar rate={savingsRate} />
            </div>
          </Link>

          {/* ── 模块 04：全景诊断 ────────────────────────────── */}
          <Link
            href="/summary"
            className="card-premium card-enter card-enter-3 bento-side-bot flex flex-col p-7"
          >
            <div
              className="icon-wrap flex h-10 w-10 items-center justify-center rounded-[12px] text-xl mb-5"
              style={{ background: "var(--accent-amber-bg)" }}
            >
              🩺
            </div>

            <h2 className="text-[1rem] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
              极简版全景财务诊断
            </h2>
            <p className="mt-1 text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
              Simplified Assessment
            </p>
            <p className="mt-2.5 text-[13px] flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              整合多维数据，输出净资产健康度与年龄段专属策略。
            </p>

            <div className="mt-4">
              <HealthPills pills={healthPills} />
            </div>
          </Link>

          {/* ── 模块 03：微观工具矩阵（三个磁性小卡片）──── */}
          <div className="bento-tools">
            <Link href={DATA_ROOM.href} className="card-enter card-enter-4">
              <MagneticCard
                className="h-full"
                style={{
                  background: "var(--bg-card)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  border: "1px solid var(--border-card)",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                }}
              >
                <div
                  className="icon-wrap flex h-10 w-10 items-center justify-center rounded-[12px] text-xl mb-4"
                  style={{ background: DATA_ROOM.bg, color: DATA_ROOM.color }}
                >
                  {DATA_ROOM.icon}
                </div>

                <h3 className="text-[0.92rem] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                  {DATA_ROOM.title}
                </h3>
                <p className="mt-2 text-[12px] flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {DATA_ROOM.desc}
                </p>
              </MagneticCard>
            </Link>

            {MICRO_TOOLS.map((tool, i) => (
              <Link href={`/micro?tool=${tool.id}`} key={tool.id} className={`card-enter card-enter-${i + 5}`}>
                <MagneticCard
                  className="h-full"
                  style={{
                    background: "var(--bg-card)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid var(--border-card)",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                  }}
                >
                  <div
                    className="icon-wrap flex h-10 w-10 items-center justify-center rounded-[12px] text-xl mb-4"
                    style={{ background: tool.bg }}
                  >
                    {tool.icon}
                  </div>

                  <h3 className="text-[0.92rem] font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
                    {tool.title}
                  </h3>
                  <p className="mt-2 text-[12px] flex-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                    {tool.desc}
                  </p>
                </MagneticCard>
              </Link>
            ))}
          </div>
        </div>

        {/* ── 使用指引（紧凑版） ────────────────────────────── */}
        <div
          className="mt-5 rounded-[20px] px-8 py-6 card-enter card-enter-6"
          style={{ background: "var(--bg-guide)", border: "1px solid var(--border-card)" }}
        >
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-4" style={{ color: "var(--text-muted)" }}>
            推荐使用流程
          </p>
          <ol className="flex flex-wrap gap-x-8 gap-y-2.5">
            {[
              "宏观体检 — 录入资产负债",
              "现金流 — 量化储蓄率与目标",
              "微观工具 — 测算单笔投资绩效",
              "OKX 复盘室 — 还原合约交易行为",
              "全景诊断 — 获取综合健康报告",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--primary)", flexShrink: 0, display: "inline-block" }} />
                {text}
              </li>
            ))}
          </ol>
        </div>

        <div className="h-8" />
      </main>
    </div>
  );
}
