"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeOkxTrades, parseOkxCsv } from "@/lib/finance/okx";
import type { OkxAnalytics, OkxTrade } from "@/lib/finance/okx";
import { OkxDashboard } from "./OkxDashboard";

const STORAGE_KEY = "okx_trades_v1";

function loadTradesFromStorage(): OkxTrade[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OkxTrade[];
  } catch {
    return null;
  }
}

function saveTradesToStorage(trades: OkxTrade[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades));
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new Error("浏览器存储空间不足，请清理后重试");
    }
    throw err;
  }
}

export function OkxClientPage() {
  const [trades, setTrades] = useState<OkxTrade[] | null>(null);
  const [analytics, setAnalytics] = useState<OkxAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = loadTradesFromStorage();
    if (stored && stored.length > 0) {
      try {
        setTrades(stored);
        setAnalytics(analyzeOkxTrades(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("请上传 .csv 格式的文件");
      return;
    }

    setIsProcessing(true);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = e.target?.result as string;
        const parsed = parseOkxCsv(raw);
        if (parsed.length === 0) {
          throw new Error("CSV 中未解析到有效交易记录，请确认文件格式");
        }
        const result = analyzeOkxTrades(parsed);
        saveTradesToStorage(parsed);
        setTrades(parsed);
        setAnalytics(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "解析失败，请检查文件格式");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError("文件读取失败");
      setIsProcessing(false);
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  // ── 已有数据：渲染 Dashboard + 悬浮重新上传按钮 ──
  if (trades && analytics) {
    return (
      <div className="relative overflow-x-hidden">
        <div className="pointer-events-none sticky top-0 z-50 flex justify-end px-4 py-2">
          <button
            onClick={() => replaceInputRef.current?.click()}
            disabled={isProcessing}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-400 backdrop-blur transition hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v8M5 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" strokeLinecap="round" />
            </svg>
            {isProcessing ? "处理中…" : "重新上传"}
          </button>
          <input ref={replaceInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 018 5zm0 6a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <OkxDashboard analytics={analytics} trades={trades} />
      </div>
    );
  }

  // ── 无数据：全屏上传引导 ──
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-lg space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">OKX 合约复盘室</h1>
          <p className="mt-2 text-sm text-zinc-500">上传 OKX 历史仓位导出文件，数据仅保存在本地浏览器中</p>
        </div>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={[
            "relative cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-all duration-200",
            isDragging ? "border-blue-500 bg-blue-500/5" : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900",
            isProcessing ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />

          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <svg className="h-10 w-10 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : (
              <svg
                className={`h-10 w-10 transition-colors ${isDragging ? "text-blue-400" : "text-zinc-600"}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M12 4v12M8 8l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" strokeLinecap="round" />
              </svg>
            )}

            <div>
              <p className={`text-sm font-medium ${isDragging ? "text-blue-300" : "text-zinc-300"}`}>
                {isProcessing ? "正在解析数据…" : isDragging ? "松开即可上传" : "点击或拖拽 CSV 文件至此"}
              </p>
              {!isProcessing && (
                <p className="mt-1 text-xs text-zinc-600">支持 OKX 网页端导出的历史仓位 CSV 格式</p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-left">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 4a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 018 5zm0 6a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <p className="text-xs text-zinc-700">数据以 JSON 格式保存于浏览器 localStorage，不会上传至任何服务器</p>
      </div>
    </div>
  );
}
