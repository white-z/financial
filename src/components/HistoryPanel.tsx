"use client";

import { useRef, useState } from "react";

export interface HistoryItem {
  id: string;
  time: string;    // 格式化后的时间字符串
  label: string;   // 主要描述
  sub?: string;    // 次要信息
}

interface HistoryPanelProps {
  title?: string;
  items: HistoryItem[];
  isLoading: boolean;
  isConfigured: boolean;
  onLoad: (id: string) => void;
  loadingId?: string;
  onDelete?: (id: string) => void;
  deletingId?: string;
}

export function HistoryPanel({
  title = "历史记录",
  items,
  isLoading,
  isConfigured,
  onLoad,
  loadingId,
  onDelete,
  deletingId,
}: HistoryPanelProps) {
  const [expanded, setExpanded] = useState(false);
  // 待确认删除的 id：第一次点击进入待确认态，2.5s 内再次点击才真正删除
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function handleDeleteClick(id: string) {
    if (pendingDeleteId === id) {
      // 二次确认 → 执行删除
      clearTimeout(timerRef.current);
      setPendingDeleteId(null);
      onDelete?.(id);
    } else {
      // 首次点击 → 进入待确认态，2.5s 后自动复位
      clearTimeout(timerRef.current);
      setPendingDeleteId(id);
      timerRef.current = setTimeout(() => setPendingDeleteId(null), 2500);
    }
  }

  return (
    <div className="form-section mt-4">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <p className="text-[11px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
          {title}
          {isConfigured && items.length > 0 && (
            <span className="ml-2 rounded-full px-1.5 py-0.5 text-[9px]"
              style={{ background: "var(--tag-bg)", color: "var(--text-muted)" }}>
              {items.length}
            </span>
          )}
        </p>
        <svg
          className="h-3.5 w-3.5 transition-transform duration-200"
          style={{ color: "var(--text-muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          viewBox="0 0 16 16" fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-4">
          {/* Supabase 未配置 */}
          {!isConfigured && (
            <div className="rounded-[14px] p-4 text-center"
              style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}>
              <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>历史记录功能需要配置 Supabase</p>
              <p className="text-[11px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                在 <code className="rounded px-1" style={{ background: "var(--tag-bg)" }}>.env.local</code> 中填写{" "}
                <code className="rounded px-1" style={{ background: "var(--tag-bg)" }}>NEXT_PUBLIC_SUPABASE_URL</code> 后重启
              </p>
            </div>
          )}

          {/* 加载骨架 */}
          {isConfigured && isLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-[12px]" style={{ background: "var(--bg-page)" }} />
              ))}
            </div>
          )}

          {/* 空状态 */}
          {isConfigured && !isLoading && items.length === 0 && (
            <p className="text-[12px] text-center py-4" style={{ color: "var(--text-muted)" }}>
              暂无记录，计算完成后点击「保存记录」
            </p>
          )}

          {/* 记录列表 */}
          {isConfigured && !isLoading && items.length > 0 && (
            <div className="space-y-2">
              {items.map((item) => {
                const isPending = pendingDeleteId === item.id;
                const isDeleting = deletingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-[12px] px-3 py-2.5"
                    style={{ background: "var(--bg-page)", border: "1px solid var(--border-card)" }}
                  >
                    {/* 文字信息 */}
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {item.label}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.time}</span>
                        {item.sub && (
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>· {item.sub}</span>
                        )}
                      </div>
                    </div>

                    {/* 加载按钮 */}
                    <button
                      onClick={() => onLoad(item.id)}
                      disabled={loadingId === item.id || isDeleting}
                      className="shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all"
                      style={{
                        background: "var(--tag-bg)",
                        color: "var(--text-secondary)",
                        border: "1px solid var(--border-card)",
                        opacity: (loadingId === item.id || isDeleting) ? 0.5 : 1,
                      }}
                    >
                      {loadingId === item.id ? "加载中…" : "加载"}
                    </button>

                    {/* 删除按钮（仅 onDelete 存在时显示） */}
                    {onDelete && (
                      <button
                        onClick={() => handleDeleteClick(item.id)}
                        disabled={isDeleting}
                        title={isPending ? "再次点击确认删除" : "删除此记录"}
                        className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all"
                        style={{
                          background: isPending ? "rgba(255,71,87,0.12)" : "transparent",
                          color: isPending ? "var(--danger)" : "var(--text-muted)",
                          border: `1px solid ${isPending ? "rgba(255,71,87,0.3)" : "transparent"}`,
                          opacity: isDeleting ? 0.4 : 1,
                          minWidth: 28,
                        }}
                      >
                        {isDeleting ? (
                          // 删除进行中：小圆圈
                          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", border: "1.5px solid currentColor", borderTopColor: "transparent", animation: "spin 0.6s linear infinite" }} />
                        ) : isPending ? (
                          "确认?"
                        ) : (
                          // 默认垃圾桶图标
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/** 格式化 ISO 时间戳为本地时间字符串 */
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
