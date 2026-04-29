# 默认加载最新记录与首页数据渲染 — 功能规划

**日期**：2026-02-27  
**状态**：规划中，暂不修改代码  
**目标**：① 各模块进入时以「最新一条历史记录」作为默认加载项；② 首页部分栏目的图表使用最新一条记录的数据进行渲染。

---

## 一、需求概述

### 1.1 功能一：各项历史记录最新一条作为默认加载项

- 用户进入**宏观体检**、**现金流分析**、**全景诊断**、**微观工具**等页面时，若已配置 Supabase 且存在历史记录，应**自动加载最新一条**到表单并展示对应结果，无需先点「加载」或「自动读取」。
- 当前行为：除全景诊断有「自动读取模块 1 与模块 2 最新记录」按钮外，宏观与现金流页面进入后表单为空，需在历史面板中手动选择一条加载。

### 1.2 功能二：首页栏目图表用最新记录渲染

- 首页 Bento 布局中，部分栏目带有**装饰性图表**（同龄人财富水位、储蓄率进度条、健康状态药丸），目前为**硬编码占位数据**。
- 目标：在存在最新保存记录的前提下，用**真实数据**驱动这些图表；无数据或未配置 Supabase 时保留合理占位或默认展示。

---

## 二、现状简要分析

| 模块       | 历史数据来源              | 当前默认加载行为           | 备注 |
|------------|---------------------------|----------------------------|------|
| 宏观体检   | `listMacroChecksAction` + `getMacroCheckByIdAction` | 无；仅拉取历史列表，不自动填表 | 有 `getLatestMacroCheckAction` 未在页面 init 使用 |
| 现金流     | `listCashflowsAction` + `getCashflowByIdAction`     | 无                         | 有 `getLatestCashflowAction`；有「从模块 01 导入」按钮 |
| 全景诊断   | 无独立表；依赖 macro + cashflow 最新一条            | 有按钮「自动读取模块 1 与模块 2」 | 需点击后才填表，非进入即加载 |
| 微观工具   | `listMicroCalculations(toolType)`                   | 无                         | 无 `getLatest`，仅 list 按时间倒序；各工具表单独立 |
| 首页       | 无                       | 纯静态：WealthGauge 68%、SavingsRateBar 23%、HealthPills 固定三条 | 无数据请求 |

---

## 三、设计要点与方案

### 3.1 功能一：默认加载最新一条

**原则**：进入页面时（或在 Supabase 已配置的前提下）请求该模块「最新一条」；若存在则填充表单并执行一次计算/展示，使当前页面即呈现「最近一次保存」的状态。

- **宏观体检（/macro）**
  - 在现有 `useEffect` 中，除 `loadHistory()` 外，增加一次「首次加载最新」逻辑：调用 `getLatestMacroCheckAction()`；若返回成功且有 `data`，则用与 `handleLoadFromHistory` 相同的映射将数据写入 `form`，并调用 `runCalc` 写入 `macroResult` / `lcResult`，`savedId` 设为该记录 id。
  - 为避免与用户后续「点击历史某条」冲突，可约定：仅当 `savedId == null` 且从未执行过「加载最新」时执行（例如用 ref 标记「已尝试过默认加载」），或每次 mount 仅执行一次。
  - 涉及文件：`src/app/macro/page.tsx`；依赖现有 `getLatestMacroCheckAction`。

- **现金流分析（/cashflow）**
  - 同上，在 `loadHistory` 同周期或单独 `useEffect` 中调用 `getLatestCashflowAction()`；若有数据则填充表单（注意字段与 `handleLoadFromHistory` 一致，含 `targetMode: "custom"` 等）、设置 `savedId`、执行 `calculateCashFlow` 并 setResult；若存在 FIRE 相关字段也需从最新记录恢复并更新 `fireSimulation` 等派生状态。
  - 涉及文件：`src/app/cashflow/page.tsx`；依赖现有 `getLatestCashflowAction`。

- **全景诊断（/summary）**
  - 当前通过按钮触发 `getLatestMacroCheckAction()` + `getLatestCashflowAction()` 并填表。可改为：页面 mount 时若 `DB_ENABLED`，自动执行同一逻辑；若有 macro 或 cashflow 任一（或两者），则填表并可选「自动执行一次 generateSummary」展示结果，使「最新一条」成为默认视图。
  - 涉及文件：`src/app/summary/page.tsx`。

- **微观工具（/micro）**
  - 各子工具（daily-yield / path-xirr / nav-return）历史按 `tool_type` 列表展示，当前无「按 id 单条加载」的公开 Action（仅有 list + 前端可能已有的按 payload 回填逻辑，若有）。建议：
    - 在 `repositories/micro.ts` 增加 `getLatestMicroCalculation(toolType: MicroToolType): Promise<MicroCalcRow | null>`（按 `tool_type` + `created_at desc` 取一条）。
    - 在 `actions/micro.ts` 增加 `getLatestMicroCalcAction(toolType)`。
    - 在 `/micro` 页面，当 `activeId`（当前工具）切换或首次进入时，若已配置 DB，则请求该工具类型的最新一条；若存在，则将 `input_payload` 反填到当前工具的表单。这需要各工具组件支持「受控初始值」或由父组件传入 `initialInput` / 调用工具内部「加载」回调。
  - 涉及文件：`src/lib/supabase/repositories/micro.ts`、`src/app/actions/micro.ts`、`src/app/micro/page.tsx`、各工具组件（如 `tools/DailyYield.tsx` 等）若需支持初始数据注入。

**边界与降级**：

- Supabase 未配置：不发起任何 getLatest，保持当前空表单或占位。
- 无历史记录：getLatest 返回 null/空，不修改表单，不报错。
- 可选：若希望「仅首次进入时默认加载、避免覆盖用户已改表单」，可用 ref 记录「是否已执行过默认加载」，仅执行一次。

---

### 3.2 功能二：首页图表使用最新记录数据

**原则**：首页三个区块（模块 01 大卡、模块 02 侧卡、模块 04 侧卡）的图表/装饰数据，由「最新一条」对应模块的数据驱动；无数据时使用占位值或中性展示，且不因未配置 Supabase 而报错。

- **数据需求与来源**
  - **WealthGauge（同龄人财富水位）**：需要「同龄人百分位」数值。来源：最新 macro 记录的 `age_percentile`（或由最新 macro 的原始输入现场计算 `calculateMacroResult` 得到 `agePercentile`）。若采用「仅存库的汇总字段」，需确认 macro 表是否已有 `age_percentile`；当前表结构若仅有原始输入，则首页需在服务端或客户端用最新记录的输入调用 `calculateMacroResult` 得到百分位。
  - **SavingsRateBar（储蓄率进度条）**：需要储蓄率数值。来源：最新 cashflow 记录的 `savings_rate`（或由最新 cashflow 输入现场计算）。
  - **HealthPills（健康状态药丸）**：需要三条结论性标签（如「净资产健康」「应急金充足」「高息负债警示」）。来源：需 summary 结论。可有两种实现方式：
    - 方案 A：首页请求最新 macro + 最新 cashflow，在服务端或客户端调用 `generateSummary`（需补全 summary 所需输入，如 hasHighDebt、monthlyEssentialSpend 等），用返回的 `healthStatus`、`emergencyFundStatus`、`hasHighRateDebt` 等生成三条 pill 文案与颜色。
    - 方案 B：若 summary 表日后持久化「诊断结论」，则可 getLatestSummary 直接取三条标签；当前无 summary 表，建议采用方案 A。

- **实现方式（推荐）**
  - 首页当前为服务端组件、静态展示。要使用「最新记录」，有两种路径：
    - **服务端拉取**：将首页改为在服务端（或在 layout/page 的 async 中）调用 `getLatestMacroCheck`、`getLatestCashflowAnalysis`（注意需在服务端可用的 repository 或 action 中调用），将「最新 macro」「最新 cashflow」作为 props 传入首页；首页内再根据是否存在数据，渲染 WealthGauge(pct)、SavingsRateBar(rate)、HealthPills(statuses)。无数据时传占位值（如 0 或 null），组件内用默认占位展示。
    - **客户端拉取**：首页或 layout 下挂一个客户端组件，在 `useEffect` 中请求「首页数据接口」或直接调用多个 getLatest 的 Server Action，拿到数据后 setState，再渲染三个区块；首屏可为占位，数据返回后替换。若希望首屏即带数据且不闪屏，可配合服务端预取（如 layout 里 prefetch 或 server component 里 fetch）。
  - 建议：优先**服务端拉取**（在 page 或 layout 中 async 调用 getLatest），便于首屏即有正确数据、SEO 友好；若 getLatest 依赖服务端 Supabase  client，现有 Server Actions 已满足，可在首页的服务端组件中调用相同封装（或抽一层「getHomePageData」返回 { latestMacro, latestCashflow }），再传入展示组件。

- **组件改造**
  - `WealthGauge`：接受 `percentile?: number | null`，有值时用该值渲染弧线与数字，无值时用占位（如 0 或 68）或灰色/中性样式。
  - `SavingsRateBar`：接受 `savingsRate?: number | null`，有值时用该值，无值时用占位（如 0 或 23）。
  - `HealthPills`：接受 `pills?: Array<{ label: string; color: string; bg: string }> | null`，有值时用该数组渲染，无值时用当前静态三条或简化占位。

- **Summary 三条结论的生成**
  - 在服务端或客户端：用最新 macro 的年龄、收入、PPP、净资产、现金、负债等 + 最新 cashflow 的年开支、月开支（可用 annual_spend/12）等，构造 `SummaryInputs`（缺项用默认或 0），调用 `generateSummary`，根据返回的 `healthStatus`、`emergencyFundStatus`、`hasHighRateDebt` 映射为三条 pill（如：净资产健康/落后、应急金充裕/不足、高息负债无/有），再传给 `HealthPills`。

**边界与降级**：

- Supabase 未配置或 getLatest 失败：三个区块使用占位数据（与当前硬编码一致），不报错。
- 仅有 macro 无 cashflow（或反之）：WealthGauge 与 SavingsRateBar 能单独用各自最新值；HealthPills 若依赖两者，则缺的一方用默认或跳过，只展示可生成的部分结论。

---

## 四、实施计划（不修改代码，仅列步骤）

### 4.1 功能一：默认加载最新记录

| 步骤 | 内容 | 涉及文件/模块 |
|------|------|----------------|
| 1.1 | 宏观体检：进入时调用 getLatestMacroCheckAction，若有数据则填表并 runCalc，设 savedId；仅执行一次（ref 或状态标记） | `src/app/macro/page.tsx` |
| 1.2 | 现金流：进入时调用 getLatestCashflowAction，若有数据则填表并计算、设 savedId；注意 targetMode 与 FIRE 相关字段与 handleLoadFromHistory 一致 | `src/app/cashflow/page.tsx` |
| 1.3 | 全景诊断：mount 时若 DB 已配置则自动执行当前「自动读取」逻辑（getLatest macro + cashflow），填表并可选自动生成报告 | `src/app/summary/page.tsx` |
| 1.4 | 微观：repository 新增 getLatestMicroCalculation(toolType)；action 新增 getLatestMicroCalcAction(toolType) | `repositories/micro.ts`, `actions/micro.ts` |
| 1.5 | 微观：/micro 页面在 activeId 变化或首次进入时请求当前工具类型最新一条，若有则将 input_payload 反填到对应工具表单；各工具组件支持 initialInput 或 load 回调 | `src/app/micro/page.tsx`、`tools/*.tsx` |

### 4.2 功能二：首页图表用最新记录渲染

| 步骤 | 内容 | 涉及文件/模块 |
|------|------|----------------|
| 2.1 | 首页数据拉取：在首页或 layout 服务端调用 getLatestMacroCheck、getLatestCashflowAnalysis（或封装 getHomePageData），得到 latestMacro、latestCashflow；未配置或失败时返回 null | `src/app/page.tsx` 或 `src/app/layout.tsx`、repositories/actions |
| 2.2 | 由 latestMacro 计算或读取 age_percentile，传入 WealthGauge；由 latestCashflow 读取 savings_rate，传入 SavingsRateBar | `src/app/page.tsx` |
| 2.3 | 由 latestMacro + latestCashflow 构造 SummaryInputs，调用 generateSummary，将结果映射为三条 HealthPills 配置传入 HealthPills | `src/app/page.tsx`、`lib/finance/summary.ts` |
| 2.4 | WealthGauge、SavingsRateBar、HealthPills 改为接受 props（percentile、savingsRate、pills），无数据时使用占位值或当前硬编码默认 | `src/app/page.tsx`（组件内或拆成子组件） |

### 4.3 依赖与顺序

- 功能一与功能二可并行实施；若资源有限，建议先做功能一（各模块默认加载最新），再做功能二（首页数据化）。
- 功能二依赖「服务端可用的 getLatest 能力」；若当前 getLatest 仅在 Client 通过 Server Action 调用，需确保在 Server Component 中也能调用（例如在 action 或 repository 层导出供 server 使用的函数，或在 page 中通过同一 action 在服务端调用）。

---

## 五、验收预期

- **功能一**：进入 macro / cashflow / summary 页面时，若存在最新保存记录，表单与结果区自动展示该记录内容；进入 micro 某工具时，若该工具有最新保存记录，表单自动回填。无记录或未配置 DB 时行为与当前一致。
- **功能二**：首页模块 01/02/04 的图表与药丸在有最新数据时展示真实百分位、储蓄率与诊断结论；无数据时展示占位，不报错。

---

## 六、后续可选

- 首页「最新数据」可考虑短时缓存或 revalidate，避免每次访问首页都查库。
- 若后续为 summary 增加独立存储表，首页 HealthPills 可改为直接读取最新 summary 记录的三条结论，减少实时计算。
