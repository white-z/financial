"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TOOL_REGISTRY } from "./tools/registry";

/**
 * 微观投资计算器矩阵 — 单页多工具版
 *
 * 架构设计：
 * - TOOL_REGISTRY 注册表驱动，新增工具只需在 registry.ts 添加一条记录
 * - 各工具组件完全独立（自身状态、校验、计算），切换 Tab 保留表单输入
 * - Tab 切换使用 CSS display 控制可见性（非条件渲染），避免组件重新挂载
 * - URL search param `tool=xxx` 驱动初始工具选择，切换时 replace 同步 URL，刷新后恢复
 */

function resolveInitialTool(param: string | null): string {
  if (param && TOOL_REGISTRY.some(t => t.id === param)) return param;
  return TOOL_REGISTRY[0].id;
}

/** 包含 useSearchParams 的内部组件，需被 Suspense 包裹 */
function MicroContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeId, setActiveId] = useState(() =>
    resolveInitialTool(searchParams.get("tool"))
  );

  // searchParams 变化时同步（例如浏览器前进/后退）
  useEffect(() => {
    const resolved = resolveInitialTool(searchParams.get("tool"));
    setActiveId(resolved);
  }, [searchParams]);

  // 切换 Tab：同步状态 + 用 replace 写回 URL（不产生新历史条目，刷新可恢复）
  const switchTool = useCallback((id: string) => {
    setActiveId(id);
    router.replace(`/micro?tool=${id}`, { scroll: false });
  }, [router]);

  const activeTool = TOOL_REGISTRY.find(t => t.id === activeId)!;

  return (
    <div style={{ background: "var(--bg-page)", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <header style={{ background: "var(--bg-header)", borderBottom: "1px solid var(--border-card)" }}>
        <div className="page-content pt-10 pb-8">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-7"
            style={{ color: "var(--text-muted)" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            返回首页
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px] text-xl"
              style={{ background: `${activeTool.color}18`, transition: "background 0.3s ease" }}>
              {activeTool.icon}
            </div>
          </div>
          <h1 className="text-[1.45rem] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            微观投资绩效计算器矩阵
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {activeTool.title} — {activeTool.desc}
          </p>
        </div>
      </header>

      {/* ── Tab 切换器 ── */}
      <div style={{ background: "var(--bg-header)", borderBottom: "1px solid var(--border-card)" }}>
        <div className="page-content">
          <div className="flex gap-1 overflow-x-auto pb-0 no-scrollbar" style={{ scrollbarWidth: "none" }}>
            {TOOL_REGISTRY.map((tool) => {
              const isActive = activeId === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => switchTool(tool.id)}
                  className="flex shrink-0 items-center gap-2 px-4 py-3 text-[13px] font-medium relative"
                  style={{
                    color: isActive ? tool.color : "var(--text-muted)",
                    transition: "color 0.22s ease",
                    outline: "none",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {/* 激活背景药丸 */}
                  {isActive && (
                    <span
                      className="absolute inset-x-1 inset-y-1.5 rounded-xl"
                      style={{
                        background: `${tool.color}0D`,
                        transition: "opacity 0.2s ease",
                        pointerEvents: "none",
                      }}
                    />
                  )}

                  {/* 图标 */}
                  <span className="relative text-base leading-none">{tool.icon}</span>

                  {/* 工具短标题 */}
                  <span className="relative">{tool.shortTitle}</span>

                  {/* 活动指示线（底部） */}
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                    style={{
                      background: tool.color,
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? "scaleX(1)" : "scaleX(0)",
                      boxShadow: isActive ? `0 0 8px ${tool.color}80` : "none",
                      transition: "opacity 0.25s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease",
                      transformOrigin: "left",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── 工具内容区 ── */}
      <main className="page-content pt-10">
        {TOOL_REGISTRY.map((tool) => (
          /*
           * 所有工具组件始终挂载（保留表单状态）
           * 通过 display: none 隐藏非活动工具，切换到活动工具时触发入场动画
           */
          <div
            key={tool.id}
            style={{
              display: activeId === tool.id ? "block" : "none",
              animation: activeId === tool.id ? "toolPanelEnter 0.28s ease both" : "none",
            }}
          >
            <tool.Component />
          </div>
        ))}

        <style>{`
          @keyframes toolPanelEnter {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>
      </main>
    </div>
  );
}

/** Suspense 包裹，满足 Next.js useSearchParams 的 SSR 要求 */
export default function MicroPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "var(--bg-page)", minHeight: "100vh" }} />
    }>
      <MicroContent />
    </Suspense>
  );
}
