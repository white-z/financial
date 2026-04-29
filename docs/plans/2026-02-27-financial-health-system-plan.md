# 全生命周期财务健康与微观投资基准测算系统 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 基于 Next.js 与 Supabase，搭建一套从宏观财务健康评估到微观投资测算的闭环在线系统，为用户提供可视化诊断与投资工具矩阵。  

**Architecture:** 采用 Next.js App Router（SSR + RSC）作为 Web 层，Supabase Postgres 作为持久化与鉴权层，前端以模块化页面+独立工具组件形式承载四大功能模块，计算逻辑尽量在可复用的纯函数工具层实现，部分与数据库交互的操作通过 Server Actions 或 API Route 实现，确保可测试性与可扩展性。  

**Tech Stack:** Next.js (>=14)、TypeScript、Supabase (Database + Auth + Storage 可选)、Tailwind CSS 或现有 UI 体系、Zod（或等价方案）用于输入校验、日后可选接入图表库（如 Recharts/ECharts）做可视化。  

---

## 一、总体架构设计

### 1.1 系统角色与边界

- **前端 Web 应用（Next.js）**
  - 负责页面路由、表单交互、数据可视化与基础校验。
  - 使用 App Router，将四大模块映射到清晰的路由层级。
- **数据与鉴权层（Supabase）**
  - 由你配置 Supabase 项目与连接信息（`SUPABASE_URL`、`SUPABASE_ANON_KEY` 等），前端只读取环境变量。
  - 提供用户账户 / 会话管理（可按需启用），保存用户历史测算记录。
- **计算逻辑层（Domain / Utils）**
  - 所有 PRD 中涉及的计算逻辑（PPP 折算、寿命周期目标、XIRR/年化收益率等）封装到 `lib/finance` 目录下的纯函数模块。
  - 允许前端直接调用这些纯函数，以便后续做单元测试与重用。

### 1.2 目录结构建议（示意）

```text
app/
  layout.tsx
  page.tsx                         // Landing & 模块导航
  macro/
    page.tsx                       // 模块 1：宏观财务健康体检
  cashflow/
    page.tsx                       // 模块 2：现金流与生活目标分析
  micro/
    layout.tsx
    page.tsx                       // 微观工具总览
    daily-yield/page.tsx          // 工具 A
    path-xirr/page.tsx            // 工具 B
    nav-return/page.tsx           // 工具 C
  summary/
    page.tsx                       // 模块 4：极简全景诊断

lib/
  finance/
    ppp.ts                         // PPP 标准化 & 同龄对比
    lifecycle-targets.ts           // Fidelity 法则目标净资产
    cashflow.ts                    // 收支、储蓄率与终极资产包测算
    micro-daily-yield.ts           // 工具 A
    micro-path-xirr.ts             // 工具 B（XIRR/加权年化）
    micro-nav-return.ts            // 工具 C
    summary.ts                     // 汇总诊断逻辑
  supabase/
    client.ts                      // Supabase 客户端封装

db/
  schema.sql 或 drizzle/           // 可选：数据库建模文件

docs/
  plans/
    2026-02-27-financial-health-system-plan.md  // 当前文件
```

### 1.3 环境变量与 Supabase 控制

- 在项目根目录 `.env.local` 中约定（你完全掌控其值）：
  - `NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>`
- `lib/supabase/client.ts` 内，通过 `createClient` 读取上述变量构建浏览器侧 client；  
  如需 Server Actions / API Route 的安全访问，可追加 `SUPABASE_SERVICE_ROLE_KEY` 等服务端专用变量（仅在服务器环境使用）。
- 所有读写数据库的逻辑集中在 `lib/supabase` 下的仓储函数中，页面层仅通过这些函数访问数据，做到“你换地址，代码不用改逻辑，只改环境变量”。

---

## 二、数据模型与数据库设计（Supabase）

> 若初期仅做计算 Demo，可将本节改为“可选实现”，后续迭代再落库。

### 2.1 用户与会话（可选）

- 表：`users`（如使用 Supabase Auth，自带 `auth.users` 可复用）
  - `id` (uuid, PK)
  - `email`
  - `created_at`

### 2.2 宏观财务体检记录

- 表：`macro_checks`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK -> users.id, 可空若匿名)
  - `age` (int)
  - `annual_income` (numeric)
  - `assets_cash` (numeric)
  - `assets_invest_liquid` (numeric)
  - `assets_fixed_income` (numeric)
  - `assets_property` (numeric)
  - `liab_consumption` (numeric)
  - `liab_investment` (numeric)
  - `liab_student` (numeric)
  - `ppp_rate` (numeric)          // PPP 折算率
  - `net_worth` (numeric)         // 计算结果
  - `net_worth_ppp` (numeric)
  - `income_ppp` (numeric)
  - `age_percentile` (numeric)    // 同龄人百分位
  - `created_at` (timestamptz)

### 2.3 现金流与生活目标记录

- 表：`cashflow_analyses`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK)
  - `current_income_annual` (numeric)
  - `current_spend_annual` (numeric)
  - `target_spend_annual` (numeric)
  - `savings_rate` (numeric)
  - `gap_amount` (numeric)
  - `target_nest_egg_low` (numeric)   // 20x
  - `target_nest_egg_high` (numeric)  // 25x
  - `created_at` (timestamptz)

### 2.4 微观投资工具记录（可选）

- 表：`micro_calculations`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK)
  - `tool_type` (text)  // 'daily_yield' | 'path_xirr' | 'nav_return'
  - `input_payload` (jsonb)
  - `output_payload` (jsonb)
  - `created_at` (timestamptz)

### 2.5 全景诊断记录（可选）

- 表：`summary_reports`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK)
  - `macro_check_id` (uuid, FK)
  - `cashflow_id` (uuid, FK)
  - `net_health_status` (text)         // 'ahead' | 'on_track' | 'behind'
  - `debt_risk_flag` (boolean)
  - `emergency_fund_ok` (boolean)
  - `age_directive` (text)             // 年龄阶段策略文案
  - `created_at` (timestamptz)

---

## 三、模块 1：全生命周期财务健康体检（Macro Health Check）

### 3.1 页面与交互设计

- 路由：`/macro`
- 功能分区：
  - **基础信息表单区**：年龄、年收入、PPP 折算率输入。
  - **资产负债录入区**：资产各类、负债各类分组输入。
  - **结果展示区**：
    - 净资产与 PPP 折算后的净资产/收入。
    - 对照 2026 年同龄人基准的百分位等级（图表/文案）。
    - Fidelity 生命周期目标净资产对比表（30/40/50/60/65+）。

### 3.2 计算逻辑实现（`lib/finance/ppp.ts`, `lifecycle-targets.ts`）

- 净资产：`netWorth = totalAssets - totalLiabilities`
- PPP 标准化：
  - `netWorthPPP = netWorth / pppRate`
  - `incomePPP = annualIncome / pppRate`
- 同龄人百分快速策略：
  - 内置一份 2026 年基准数据常量表 `AGE_BRACKETS`（20s/30s/40s...）。
  - 根据用户年龄映射到区间并计算百分位（可用线性插值或分段估算）。
- Fidelity 生命周期目标：
  - 输入当前年薪 `income`，返回目标数组：
    - 30: `1 * income`
    - 40: `3 * income`
    - 50: `6 * income`
    - 60: `8 * income`
    - 65-70: `[10 * income, 20 * income]`

### 3.3 数据流

- 前端表单 → 使用 Zod 校验 → 调用 `finance` 纯函数计算结果 → 显示。
- 如果启用登录：
  - 可在用户点击“保存体检结果”时，通过 Server Action 将输入与结果写入 `macro_checks`。

---

## 四、模块 2：现金流与理想生活目标分析

### 4.1 页面与交互设计

- 路由：`/cashflow`
- 输入：
  - 当前年收入 / 月收入（统一换算成年）。
  - 当前年度总开支。
  - 理想/退休年度生活开支。
- 展示：
  - 当前结余：`surplus = income - currentSpend`
  - 储蓄率：`savingsRate = surplus / income`
  - 收支缺口：`gap = targetSpend - income`
  - 终极资产包：
    - `targetNestEggLow = targetSpend * 20`
    - `targetNestEggHigh = targetSpend * 25`

### 4.2 计算逻辑（`lib/finance/cashflow.ts`）

- 提供纯函数：
  - `calculateSavingsRate(...)`
  - `calculateNestEggRange(targetAnnualSpend: number)`
- 对储蓄率给出区间提示：
  - `< 10%`：偏低
  - `10% - 15%`：接近目标
  - `15% - 20%`：理想区间

### 4.3 数据流与持久化

- 与模块 1 类似，前端表单 + 纯函数计算。
- 若启用历史保存：Server Action 写入 `cashflow_analyses`。

---

## 五、模块 3：微观投资绩效与交易计算器矩阵

### 5.1 工具 A：每日/万份收益计算器

- 路由：`/micro/daily-yield`
- 输入：
  - 本金金额 `principal`
  - 年化收益率 `annualRate`（百分数形式转小数）
  - 计算天数 `days`
- 逻辑（`lib/finance/micro-daily-yield.ts`）：
  - 万份收益：`unitYield = annualRate / 365 * 10000`
  - 累计收益（复利）：
    - `total = principal * (1 + annualRate / 365) ^ days`
    - `profit = total - principal`

### 5.2 工具 B：投资路径与定投补仓计算器

- 路由：`/micro/path-xirr`
- 输入：
  - 初始投入金额 + 日期
  - N 组补仓记录（日期 + 金额）
  - 截止日期 + 期末总价值（可输入净值 * 份额或直接金额）
- 逻辑（`lib/finance/micro-path-xirr.ts`）：
  - 统一为现金流列表：`[{ date, amount }, ...]`，投入为负数，回收为正数。
  - 计算总投入本金，期末总价值。
  - **持有天数**：`days = endDate - firstDate`。
  - **累计收益**：`profit = finalValue - sum(investedAmounts)`.
  - **XIRR / 加权年化**：
    - 实现一个数值迭代（如牛顿法，或二分法）求解 `r` 使：
      - \(\sum_i \frac{C_i}{(1+r)^{(t_i - t_0)/365}} = 0\)
    - 封装函数 `calculateXIRR(cashflows, guessRate)`。
  - 本金/收益占比：
    - `principalPortion = totalInvested`
    - `profitPortion = profit`
    - 前端用饼图展示比例。

### 5.3 工具 C：净值化年化收益率计算器

- 路由：`/micro/nav-return`
- 输入：
  - 开始日期、期初净值
  - 结束日期、期末净值
- 逻辑（`lib/finance/micro-nav-return.ts`）：
  - 持有天数：`days = endDate - startDate`
  - 总收益率：`totalReturn = (endNav - startNav) / startNav`
  - 年化收益率：
    - `annualized = (endNav / startNav) ^ (365 / days) - 1`

---

## 六、模块 4：极简版全景财务诊断与策略总结

### 6.1 页面逻辑

- 路由：`/summary`
- 数据来源：
  - 最近一次或用户选定的宏观体检数据（模块 1）。
  - 最近一次现金流分析数据（模块 2）。
  - 可选：最近一次微观工具结果，用于补充提示。

### 6.2 诊断规则（`lib/finance/summary.ts`）

- **净资产健康度**：
  - 如果 `netWorthPPP` 高于同龄中位数一定倍数（如 > 120%），标记为“超前”；80%-120% 为“达标”；低于 80% 为“落后”。
- **负债排雷**：
  - 所有负债记录中，有利率 > 10%（如信用卡/消费贷）即标记 `debt_risk_flag = true`，并给出“优先清除该类负债”的提示。
- **紧急流动性测试**：
  - 现金及等价物是否 ≥ 3-6 个月生活开支：
    - `< 3 个月`：严重不足；
    - `3-6 个月`：基本安全；
    - `> 6 个月`：充裕。
- **阶段性核心策略（Age-Specific Directive）**：
  - 根据 `age` 分段：
    - 20s：优先提升储蓄率与人力资本（技能）。
    - 30s：控制生活方式膨胀，稳步资产积累。
    - 40s/50s：关注资产保值与风险管理，增加固收配置。
    - 60+：重点是现金流稳定与支出控制。

---

## 七、非功能性要求与基础设施

### 7.1 性能与体验

- 所有计算逻辑本地完成，不依赖后端重计算，保证交互即时响应。
- 对多步表单可考虑渐进式分步（Stepper）与自动保存。

### 7.2 安全与隐私

- Supabase 环境变量仅在服务器与受控环境下配置，客户端只读 `NEXT_PUBLIC_*`。
- 若涉及真实数据，推荐开启用户登录，仅登录用户可保存与加载历史记录；匿名模式仅在浏览器本地暂存。

### 7.3 可测试性

- 为 `lib/finance` 中的每个纯函数编写单元测试（如使用 Vitest/Jest）：
  - 边界条件：0 值、负值、极端利率/天数。
  - 时间相关计算（XIRR、年化收益）需固定日期与期望输出。

---

## 八、实施分期与里程碑

### 8.1 Phase 1：核心页面 + 纯前端计算

1. 初始化 Next.js 项目结构与基础 UI 框架。
2. 实现 `lib/finance` 内所有基础计算函数（宏观 + 现金流 + 微观）。
3. 实现 `/macro`、`/cashflow`、`/micro/*` 页面，前端直接调用计算函数。
4. 实现 `/summary` 基本诊断（基于当前一次输入，不做历史记录）。

### 8.2 Phase 2：Supabase 接入与历史记录

1. 配置 Supabase 项目，由你提供 URL / Keys。
2. 建立上述数据表结构（使用 SQL 或 ORM/Drizzle）。
3. 在各页面加入“保存记录/查看历史”功能。
4. `/summary` 支持从最近记录中汇总。

### 8.3 Phase 3：可视化与体验增强

1. 接入图表库绘制净资产对比、储蓄率历史、资产包目标区间。
2. 优化移动端布局与输入体验。
3. 增强错误提示、输入引导和帮助文本。

