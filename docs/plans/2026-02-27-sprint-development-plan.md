# 全生命周期财务系统 Sprint 开发步骤计划表（Next.js + Supabase）

## 概览

- **技术栈**：Next.js App Router + TypeScript + Supabase（由你控制连接地址与密钥）  
- **需求来源**：`docs/plans/PRD.md` 与 `2026-02-27-financial-health-system-plan.md`  
- **目标**：在 4 个 Sprint 内，从骨架到联调再到打包上线，完成可用版本的全生命周期财务健康与微观投资测算系统。

---

## Sprint 1：基础骨架（项目初始化 & 计算核心）

**目标**：搭建项目基础结构与核心计算逻辑，让所有核心公式可以在控制台或简单表单中跑通。

- **项目与架构**
  - 初始化 Next.js（App Router + TypeScript），配置基础 ESLint/Prettier。
  - 建立基础目录结构：`app/`、`lib/finance/`、`lib/supabase/`、`docs/`。
  - 在 `app/page.tsx` 做简单首页导航（列出 4 个模块入口）。

- **环境变量与 Supabase 占位**
  - 约定 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`（先可用占位值）。
  - 创建 `lib/supabase/client.ts`，封装 `createClient`，暂只做简单示例调用或保留空实现。

- **核心计算模块（纯函数，可单测）**
  - `lib/finance/ppp.ts`：净资产、PPP 折算、同龄人基准百分位计算。
  - `lib/finance/lifecycle-targets.ts`：Fidelity 生命周期目标净资产计算。
  - `lib/finance/cashflow.ts`：收支结余、储蓄率、终极资产包（20–25 倍）计算。
  - `lib/finance/micro-daily-yield.ts`：万份收益与复利累计收益计算。
  - `lib/finance/micro-nav-return.ts`：净值总收益率与年化收益率计算。
  - `lib/finance/micro-path-xirr.ts`：现金流结构与 XIRR 求解函数（数值迭代版，先实现基础版）。
  - `lib/finance/summary.ts`：净资产健康度、负债排雷、应急金测试、年龄策略规则实现。

- **基础测试**
  - 选定测试框架（Jest 或 Vitest），对关键公式（PPP、年化收益、XIRR 边界用例）写 3–5 条单测，验证无明显公式错误。

**验收标准**
- 可以在简单脚本或临时页面中导入 `lib/finance` 各函数，并输出与 PRD 公式一致的结果。  
- 项目可以成功启动 `next dev`，无明显 TypeScript/构建错误。

---

## Sprint 2：核心 UI（页面与交互）

**目标**：实现四大模块的主要页面与表单交互，前端调用 Sprint 1 的计算函数完成全部测算逻辑。

- **路由与页面**
  - `/macro`：宏观体检页面
    - 表单：基础信息（年龄、年收入、PPP）、资产与负债分组输入。
    - 展示：净资产 / PPP 折算数值、同龄人百分位、Fidelity 生命周期目标表。
  - `/cashflow`：现金流 & 理想生活页面
    - 表单：当前收入、当前开支、理想/退休开支。
    - 展示：结余、储蓄率、收支缺口、目标资产包范围（20–25 倍）。
  - `/micro` + 子路由：
    - `/micro/daily-yield`：工具 A，每日/万份收益表单与结果展示。
    - `/micro/path-xirr`：工具 B，现金流列表录入（初始 + 多次补仓 + 截止/期末价值）与 XIRR 结果 + 本金/收益比例展示。
    - `/micro/nav-return`：工具 C，起止日期 + 净值表单与年化收益展示。
  - `/summary`：全景诊断页面
    - 输入：当前体检数据与现金流数据（可暂从 URL/前一页传入或在页面中临时录入）。
    - 展示：净资产健康度标签、负债风险提示、应急金结论、年龄段策略文案。

- **UI 与交互细节**
  - 使用统一组件（如 `Card`、`Form`、`Button`）组织四个模块的布局，保证桌面与移动端的可用性。
  - 针对关键输入加入基础校验与错误提示（例如非负数、日期顺序、利率范围等）。
  - 所有计算都通过调用 `lib/finance`，页面不再重复实现公式。

**验收标准**
- 用户可在浏览器中完成从输入到结果展示的完整交互流程（不依赖任何后端保存）。  
- 所有主要字段的计算结果与预期公式一致，无明显 UI 阻塞或崩溃。

---

## Sprint 3：接口联调（Supabase 持久化与历史记录）

**目标**：接入 Supabase，完成主要数据表设计与读写接口，实现体检与分析结果的保存和回溯。

- **Supabase 配置**
  - 由你在 Supabase 控制台创建项目，并提供 URL / Key。
  - 在本地 `.env.local` 中填写真实 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`，如需服务端操作则添加 `SUPABASE_SERVICE_ROLE_KEY`（仅服务端使用）。

- **数据库建模与迁移**
  - 按 `2026-02-27-financial-health-system-plan.md` 中设计，在 Supabase 中创建：
    - `macro_checks`
    - `cashflow_analyses`
    - 可选：`micro_calculations`、`summary_reports`
  - 如采用 Drizzle，补充对应 schema 与迁移脚本；否则直接使用 SQL 建表。

- **数据访问层与 Server Actions**
  - 在 `lib/supabase` 中为各模块封装：
    - `saveMacroCheck` / `listMacroChecks`
    - `saveCashflowAnalysis` / `listCashflowAnalyses`
    - 可选：`saveMicroCalculation`、`saveSummaryReport`
  - 页面中通过 Server Actions 或 Route Handlers 调用上述函数，实现：
    - “保存当前测算结果”按钮。
    - “查看历史记录列表”并支持点击回看详情。

- **Summary 联动**
  - `/summary` 页面增加选择“最近一次记录”或“从历史中选一条”作为诊断输入，调用 `summary` 函数生成报告。

**验收标准**
- 在实际 Supabase 实例上可以创建/读取体检与现金流记录，无权限或 CORS 错误。  
- 无需修改业务逻辑，仅通过修改 `.env.local` 即可切换 Supabase 实例。

---

## Sprint 4：配置打包（部署、优化与文档）

**目标**：完成构建与部署配置，进行基本性能和体验优化，并补齐开发文档。

- **打包与部署**
  - 确认 `next.config` 中基础配置（如输出模式、环境变量暴露范围）。
  - 配置构建与运行脚本（如 `pnpm build` / `pnpm start`）。
  - 选择部署目标（如 Vercel、Render、自托管），完成一套最小上线流水线（CI/CD 可选）。

- **性能与体验优化**
  - 对长列表或复杂表单做懒加载或拆分组件，确保首屏加载体验。
  - 如接入图表库，对图表组件做按需加载，避免打包体积膨胀。
  - 针对 XIRR 等需要迭代计算的逻辑，做好错误兜底与超时保护（如收敛失败时给出提示）。

- **文档与维护**
  - 在 `docs/` 下编写简短的：
    - 开发启动文档（如何安装依赖、运行 dev/build、设置环境变量）。  
    - 模块说明文档（各页面 URL、对应的主要计算函数说明）。  
  - 在 `docs/change-log.md` 持续记录各 Sprint 的主要变动。

**验收标准**
- 项目可以在目标环境中稳定运行，主要功能路径可用。  
- 新成员按照文档可以在 30–60 分钟内拉起本地开发环境并理解核心模块。

