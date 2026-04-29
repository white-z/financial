"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode, InputHTMLAttributes } from "react";

// ─────────────────────────────────────────────────────────────
// AnimatedNumber  — 数字平滑滚动过渡（防止计算结果突变）
// ─────────────────────────────────────────────────────────────
interface AnimatedNumberProps {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  style?: CSSProperties;
}

export function AnimatedNumber({
  value,
  duration = 700,
  format = (n) => n.toLocaleString("zh-CN", { maximumFractionDigits: 2 }),
  className = "",
  style,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevRef.current;
    prevRef.current = value;
    if (from === value) return;

    const start = performance.now();
    const diff = value - from;

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + diff * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span className={`num ${className}`} style={style}>
      {format(display)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// MiniGauge  — SVG 半圆仪表盘（同龄人百分位可视化）
// ─────────────────────────────────────────────────────────────
interface MiniGaugeProps {
  percent: number;
  label?: string;
  size?: number;
}

export function MiniGauge({ percent, label = "百分位", size = 140 }: MiniGaugeProps) {
  const R = size * 0.42;
  const cx = size / 2;
  const cy = size * 0.52;
  const arcLen = Math.PI * R;
  const clamped = Math.max(0, Math.min(100, percent));
  const dash = (clamped / 100) * arcLen;

  const startX = cx - R;
  const endX = cx + R;
  const startY = cy;

  return (
    <svg width={size} height={size * 0.62} viewBox={`0 0 ${size} ${size * 0.62}`}>
      <defs>
        <linearGradient id={`g_${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00C875" />
          <stop offset="100%" stopColor="#00E5FF" />
        </linearGradient>
      </defs>
      {/* 背景轨道 */}
      <path
        d={`M ${startX} ${startY} A ${R} ${R} 0 0 1 ${endX} ${startY}`}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      {/* 进度弧 */}
      <path
        d={`M ${startX} ${startY} A ${R} ${R} 0 0 1 ${endX} ${startY}`}
        fill="none"
        stroke={`url(#g_${size})`}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${arcLen}`}
        style={{ filter: "drop-shadow(0 0 5px rgba(0,229,255,0.5))" }}
      />
      {/* 数字 */}
      <text
        x={cx}
        y={cy - 6}
        textAnchor="middle"
        fill="white"
        fontSize={size * 0.17}
        fontWeight="700"
        fontFamily="var(--font-geist-sans), system-ui"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {clamped.toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy + size * 0.07}
        textAnchor="middle"
        fill="rgba(139,146,165,0.7)"
        fontSize={size * 0.065}
        letterSpacing="0.06em"
        fontFamily="system-ui"
        style={{ textTransform: "uppercase" }}
      >
        {label}
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// PageHeader  — 统一页面顶部
// ─────────────────────────────────────────────────────────────
interface PageHeaderProps {
  back?: string;
  /** @deprecated tag 药丸已移除，保留仅为向后兼容，不再渲染 */
  tag?: string;
  /** @deprecated tagColor 已移除，保留仅为向后兼容 */
  tagColor?: string;
  icon: string;
  title: string;
  subtitle: string;
}

export function PageHeader({ back = "/", tagColor, icon, title, subtitle }: PageHeaderProps) {
  return (
    <header
      style={{
        background: "var(--bg-header)",
        borderBottom: "1px solid var(--border-card)",
      }}
    >
      <div className="page-content pt-10 pb-8">
        <Link
          href={back}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-7"
          style={{ color: "var(--text-muted)" }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          返回首页
        </Link>

        <div className="mb-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[12px] text-xl"
            style={{ background: tagColor ? `${tagColor}18` : "var(--tag-bg)" }}
          >
            {icon}
          </div>
        </div>

        <h1 className="text-[1.45rem] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          {subtitle}
        </p>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// FormSection  — 分组表单容器
// ─────────────────────────────────────────────────────────────
interface FormSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function FormSection({ title, children, className = "" }: FormSectionProps) {
  return (
    <div className={`form-section ${className}`}>
      {title && (
        <p
          className="text-[11px] font-semibold tracking-[0.14em] uppercase mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          {title}
        </p>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// InputField  — 带标签、单位、发光焦点的输入框
// ─────────────────────────────────────────────────────────────
interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  unit?: string;
  hint?: string;
  error?: string;
}

export function InputField({ label, unit, hint, error, ...props }: InputFieldProps) {
  return (
    <div>
      <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}
      </label>
      <div className="relative">
        <input className="form-input" {...props} />
        {unit && (
          <span
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px]"
            style={{ color: "var(--text-muted)" }}
          >
            {unit}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--danger)" }}>{error}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MetricCard  — 结果指标卡片（支持等宽数字动画）
// ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
  className?: string;
  style?: CSSProperties;
}

export function MetricCard({ label, value, sub, accentColor, className = "", style }: MetricCardProps) {
  return (
    <div className={`metric-card min-w-0 ${className}`} style={style}>
      <p className="text-[10.5px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="num text-[clamp(1.45rem,4vw,1.5rem)] font-bold leading-tight sm:text-2xl"
        style={{ color: accentColor ?? "var(--text-primary)" }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 break-words text-[12px]" style={{ color: "var(--text-secondary)" }}>{sub}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// StatusBadge  — 状态徽章
// ─────────────────────────────────────────────────────────────
type BadgeVariant = "ahead" | "on-track" | "behind" | "ok" | "warning" | "danger";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  return <span className={`badge badge-${variant}`}>{label}</span>;
}

// ─────────────────────────────────────────────────────────────
// ResultPanel  — 结果区域包装（fade-in 动画）
// ─────────────────────────────────────────────────────────────
export function ResultPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="space-y-4"
      style={{ animation: "fadeUp 0.35s ease both" }}
    >
      {children}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Divider  — 分隔线
// ─────────────────────────────────────────────────────────────
export function Divider() {
  return <hr style={{ borderColor: "var(--border-card)", margin: "4px 0" }} />;
}
