import type { ComponentType } from "react";
import type { MicroToolType } from "@/lib/supabase/repositories/micro";
import { DailyYieldTool } from "./DailyYield";
import { PathXirrTool } from "./PathXirr";
import { NavReturnTool } from "./NavReturn";

/**
 * 工具注册表
 * 扩展方式：新建工具组件文件，在此处追加一条记录即可
 */
export interface ToolDef {
  id: string;
  /** 与 DB micro_calculations.tool_type 对应 */
  toolType: MicroToolType;
  icon: string;
  title: string;     // 完整标题
  shortTitle: string; // Tab 中显示的简短标题
  subtitle: string;  // 英文副标题
  desc: string;      // 卡片说明文字
  color: string;     // 主题色
  Component: ComponentType<{ initialInput?: Record<string, unknown> | null }>;
}

export const TOOL_REGISTRY: ToolDef[] = [
  {
    id: "daily-yield",
    toolType: "daily_yield",
    icon: "🏦",
    title: "每日/万份收益计算器",
    shortTitle: "万份收益",
    subtitle: "DAILY YIELD CALCULATOR",
    desc: "输入本金、年化收益率和天数，计算货币基金/短债产品的万份收益与复利累计总收益。",
    color: "#3B82F6",
    Component: DailyYieldTool,
  },
  {
    id: "path-xirr",
    toolType: "path_xirr",
    icon: "📉",
    title: "定投补仓 XIRR 计算器",
    shortTitle: "XIRR 定投",
    subtitle: "DCA PATH & XIRR",
    desc: "记录多笔不规则投入（初始购买 + 多次补仓），计算真实年化收益率（XIRR）与本金/收益占比。",
    color: "#A855F7",
    Component: PathXirrTool,
  },
  {
    id: "nav-return",
    toolType: "nav_return",
    icon: "📐",
    title: "净值化年化收益率计算器",
    shortTitle: "净值年化",
    subtitle: "NAV ANNUALIZED RETURN",
    desc: "输入起止日期与期初/期末净值，精准计算持有期总收益率与年化收益率。",
    color: "#22C55E",
    Component: NavReturnTool,
  },
];
