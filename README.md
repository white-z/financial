# 全生命周期财务健康系统

> 从宏观生命周期财富体检到微观单笔投资绩效追踪的闭环财务分析工具

## 功能模块

| 模块 | 路由 | 说明 |
|------|------|------|
| 宏观体检 | `/macro` | PPP 标准化净资产 × 同龄人百分位 × Fidelity 生命周期目标 × FIRE 达成路径预测 |
| 现金流分析 | `/cashflow` | 理想退休开支测算（自定义 / 智能估算）× 储蓄缺口 × FIRE 路径 |
| 微观工具矩阵 | `/micro` | 日化收益率、XIRR 路径、NAV 净值回报三合一工具页 |
| 全景诊断 | `/summary` | 汇总 Macro + Cashflow 生成财务健康总评 |
| OKX 复盘室 | `/okx` | 合约交易 CSV 解析 × 盈亏曲线 × 行为标签 × 利润引擎 / 损耗黑洞 |

## 技术栈

- **框架**：[Next.js 16](https://nextjs.org) (App Router) + React 19
- **样式**：Tailwind CSS v4 + 自定义 CSS 变量深色优先设计系统
- **图表**：Recharts
- **数据库**：[Supabase](https://supabase.com)（可选，不配置时优雅降级为纯本地计算）
- **校验**：Zod
- **测试**：Vitest

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量（可选）

复制模板并填入 Supabase 项目信息：

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> 不配置 Supabase 时，所有计算功能正常可用，仅历史记录保存/加载不可用。

### 3. 初始化数据库（可选）

在 Supabase SQL 编辑器中执行 `db/schema.sql`（如有），完成建表与 RLS 配置。

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:8112](http://localhost:8112) 查看。

### 其他命令

```bash
npm run build    # 生产构建
npm run start    # 启动生产服务
npm run lint     # ESLint 检查
npm run test     # 运行单元测试（Vitest）
```

## 项目结构

```
src/
├── app/                  # Next.js App Router 页面
│   ├── macro/            # 宏观体检模块
│   ├── cashflow/         # 现金流分析模块
│   ├── micro/            # 微观工具矩阵（日化收益率 / XIRR / NAV）
│   ├── summary/          # 全景诊断
│   ├── okx/              # OKX 合约复盘室
│   └── actions/          # Next.js Server Actions
├── components/           # 共享 UI 组件
├── lib/
│   ├── finance/          # 纯函数计算引擎（可独立测试）
│   └── supabase/         # Supabase 客户端 & 仓储层
└── static/               # 静态参考数据（S&P500 / 市场历史行情）
```

## 隐私说明

本项目不收集、不上传任何个人数据。所有计算在本地浏览器或自托管服务器完成。历史记录（如配置 Supabase）存储于您自己的 Supabase 实例，开发者无访问权限。

## License

MIT
