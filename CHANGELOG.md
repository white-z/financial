# Changelog

所有重要变更均记录于此文件，格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased]

---

## [0.4.0] - 2026-04-22

### Added
- **OKX 合约复盘室**（`/okx`）：服务端解析 CSV 交易记录，聚合净盈亏、手续费、胜率、回撤等核心指标；展示币种 / 杠杆 / 持仓时长分布、行为标签、盈亏曲线与散点图；首页新增入口卡片。
- **本金追踪**：支持输入充值本金并持久化至 `localStorage`，派生真实资金曲线、本金回报率、最低资金位与最大回撤分析视角。
- **FlowBars 重做**：去除密集重叠数字，增加最佳 / 最差 / 最新窗口摘要；币种净盈亏排行改为「利润引擎 / 损耗黑洞」双面板，补充交易次数、胜率、手续费、单笔均值与贡献占比。
- `docs/plans/2026-04-22-okx-data-plan.md`：OKX 交易复盘页实施规划文档。

---

## [0.3.0] - 2026-03-02

### Added
- **默认加载最新记录**：macro / cashflow 页面挂载时自动加载最新一条历史记录并填入表单；summary 页面挂载时自动拉取 macro + cashflow 最新记录并生成全景诊断结果。
- **micro 历史回填**：新增 `getLatestMicroCalculation` 仓储方法与 `getLatestMicroCalcAction`，工具切换时自动回填上次输入。
- **首页数据化**：服务端获取最新 macro / cashflow 数据，`WealthGauge` / `SavingsRateBar` 展示真实同龄人百分位与储蓄率；`HealthPills` 动态生成净资产健康度、应急金充足度与高息负债标志；Supabase 未配置时降级为静态占位。

---

## [0.2.0] - 2026-02-27

### Added
- **PPP 同龄人水位对比**（`lib/finance/ppp.ts`）：基于 Fidelity 表格，用对数正态分布反推各年龄段 P25 / P50 / P75 / P90 基准值。
- **收入轨迹预测 + FIRE 达成路径**：新增 `lib/finance/income-projection.ts`，cashflow 结果面板新增「FIRE 达成路径预测」区块（达成年龄、里程碑路径表、可视化进度条）。
- **cashflow 智能估算模式**：新增「自定义输入 / ⚡智能估算」双模式 Toggle，智能模式支持三档替代率预设（基础60% / 维持80% / 充裕100%）与通胀率微调。
- **HistoryPanel 删除功能**：各仓储新增 `delete` 方法与对应 Server Action；HistoryPanel 每行末尾加垃圾桶图标，二次确认防误删。
- **micro 多工具整合**：重构为 `/micro` 单页 + `tools/` 注册表架构（日化收益率 / XIRR / NAV），Tab 切换保留各工具表单状态；URL `?tool=xxx` 参数同步路由状态。
- **Supabase 接口联调**（Sprint 3）：新增 `db/schema.sql`、`lib/supabase/server.ts`、`lib/supabase/config.ts`、三个仓储模块与 Server Actions；支持未配置时优雅降级。
- **核心 UI**（Sprint 2）：新增 `lib/format.ts`、`src/components/ui.tsx`；实现全部 8 个页面；新增 `globals.css` 表单 / 按钮 / 指标卡片 CSS 类。
- **基础骨架**（Sprint 1）：安装 `@supabase/supabase-js`、`zod`、`vitest`；实现 `lib/finance` 下 7 个纯函数计算模块；编写 45 条单元测试全部通过；新增 `.env.local` 模板。

### Changed
- **Premium Dark Mode 全面重构**（`globals.css`）：深色优先色彩系统（`#090A0F` 背景）、`--primary/#00E5FF` 品牌青蓝、毛玻璃 `.card-premium`、发光输入框焦点、交错入场动画、Bento 网格布局。
- **首页 Bento 网格重构**（`page.tsx`）：模块01大英雄卡（SVG 半圆仪表盘装饰）、储蓄率进度条装饰、健康药丸状态装饰、micro 三枚磁性小卡片（`MagneticCard.tsx`）。
- 全局去噪：移除卡片编号药丸与重复 CTA 文字；`PageHeader` 的 `tag` 属性标记为 `@deprecated`。
- 开发端口调整为 `8112`（`next dev -p 8112`）。

---

## [0.1.0] - 2026-02-27

### Added
- 项目初始化（`create-next-app`）。
- 技术方案规划文档（`docs/plans/2026-02-27-financial-health-system-plan.md`）。
- Sprint 开发计划文档（`docs/plans/2026-02-27-sprint-development-plan.md`）。
