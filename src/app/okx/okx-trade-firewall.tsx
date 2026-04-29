"use client";

import { useState } from "react";

interface FirewallPrompt {
  question: string;
  brief: string;
  action: string;
}

interface FirewallSection {
  key: string;
  eyebrow: string;
  title: string;
  accent: string;
  border: string;
  background: string;
  prompts: FirewallPrompt[];
}

const FIREWALL_SECTIONS: FirewallSection[] = [
  {
    key: "battlefield",
    eyebrow: "第一层",
    title: "标的与大势",
    accent: "#dfb661",
    border: "rgba(223, 182, 97, 0.2)",
    background: "rgba(223, 182, 97, 0.08)",
    prompts: [
      {
        question: "现在做的是 BTC / SOL，还是非核心山寨？",
        brief: "利润主引擎集中在核心币，边缘山寨更像高波动彩票。",
        action: "非核心币先把仓位压到最小，只用能接受归零的试错资金。",
      },
      {
        question: "方向顺着 4 小时 / 日线，还是在逆势摸顶接刀？",
        brief: "大亏往往不是看错点位，而是逆着大级别趋势硬扛。",
        action: "先看大级别方向，没顺势就别急着按买入 / 卖出。",
      },
    ],
  },
  {
    key: "risk",
    eyebrow: "第二层",
    title: "杠杆与风控",
    accent: "#d97757",
    border: "rgba(217, 119, 87, 0.2)",
    background: "rgba(217, 119, 87, 0.08)",
    prompts: [
      {
        question: "杠杆超过 10x 了吗？",
        brief: "历史样本里，低杠杆更像利润区，高杠杆更像手续费和回撤放大器。",
        action: "默认先把倍数拉回 10x 以内；想做大，只加保证金，不加倍数。",
      },
      {
        question: "止损空间够不够让行情正常回踩？",
        brief: "方向看对却被 0.3% - 0.5% 的噪音洗出场，通常不是信号错，是空间太窄。",
        action: "不给盘面留出足够缓冲，就先别开这笔单。",
      },
      {
        question: "这次是一次打满，还是分批建仓？",
        brief: "单点重仓最容易把小波动放大成情绪失控。",
        action: "拆分进场，把第一笔当探路仓，给自己留二次上车的余地。",
      },
      {
        question: "止盈目标价是多少？它到开仓价的距离，是止损距离的 1.5 倍以上吗？",
        brief: "有止损没止盈，等于只定义了亏多少，没定义赚多少——每次都靠感觉平仓，盈亏比就永远是随机的。",
        action: "开仓前写下止损价和止盈价，确认止盈距离 ≥ 止损距离 × 1.5，然后把两单都挂好再离开屏幕。",
      },
    ],
  },
  {
    key: "discipline",
    eyebrow: "第三层",
    title: "时间与执行",
    accent: "#8fb8a6",
    border: "rgba(143, 184, 166, 0.2)",
    background: "rgba(143, 184, 166, 0.08)",
    prompts: [
      {
        question: "这笔单准备持有多久？",
        brief: "超短来回折腾，往往只是在替交易所收手续费。",
        action: "如果没有足够时间让行情发酵，就先取消开仓。",
      },
      {
        question: "是系统信号到了，还是只是手痒想做单？",
        brief: "真正高质量的交易，通常同时看得到关键位和明确的盈亏比。",
        action: "找不到清晰支撑 / 阻力和足够盈亏比，就空仓等下一拍。",
      },
    ],
  },
];

const EXIT_SECTIONS: FirewallSection[] = [
  {
    key: "structure",
    eyebrow: "第一层",
    title: "行情与结构",
    accent: "#7fa8c9",
    border: "rgba(127, 168, 201, 0.2)",
    background: "rgba(127, 168, 201, 0.08)",
    prompts: [
      {
        question: "持仓逻辑还成立吗——当初入场的前提现在有没有被证伪？",
        brief: '大多数亏损平仓不是因为"行情变了"，而是"逻辑早就破了却靠侥幸硬撑"。',
        action: "原始入场信号（关键位、趋势结构、催化事件）若已明确失效，立刻平仓，不等解套。",
      },
      {
        question: "4H / 日线的结构是正常回踩，还是已出现高低点的级别破坏？",
        brief: "把正常回踩误判成趋势反转是频繁止损的根源；把真正的结构破坏当噪音硬抗是大亏的根源。",
        action: "回到大级别确认结构完整性，没有明确破坏迹象就不要因短周期波动乱平。",
      },
    ],
  },
  {
    key: "pnl",
    eyebrow: "第二层",
    title: "盈亏与逻辑",
    accent: "#a98bc7",
    border: "rgba(169, 139, 199, 0.2)",
    background: "rgba(169, 139, 199, 0.08)",
    prompts: [
      {
        question: "这次平仓是计划内信号触发，还是恐惧 / 贪婪驱动？",
        brief: "情绪平仓是最昂贵的执行错误——恐惧导致过早止盈，贪婪导致回吐全部利润。",
        action: '能说出"触发了哪条预设规则"才平；说不出来，先冷静 5 分钟再决定。',
      },
      {
        question: "剩余仓位的期望盈亏比是否仍然合理（至少 1 : 1.5+）？",
        brief: '持仓是动态决策，每一刻都在隐性"重新开仓"。若现价到止损的风险 > 到目标位的收益，理性上就应减仓。',
        action: "重新计算当前价到止损 / 止盈距离比；若盈亏比已恶化，分批减仓而非全仓死守。",
      },
      {
        question: "是否应先锁住一部分利润，而不是全仓博最后一段？",
        brief: "满仓博顶部是把已实现的优势拱手送回市场，一次回撤就能清空多日积累。",
        action: "到达第一目标位时先平 ⅓ ~ ½，剩余仓位上移止损到成本价以上再跟随。",
      },
    ],
  },
  {
    key: "mindset",
    eyebrow: "第三层",
    title: "执行与心态",
    accent: "#6bb8a8",
    border: "rgba(107, 184, 168, 0.2)",
    background: "rgba(107, 184, 168, 0.08)",
    prompts: [
      {
        question: "此刻精神状态适合做决定吗——是否处于恐慌、报复或过度自信中？",
        brief: "连续亏损后的追回心态和连续盈利后的无敌感，都是判断力最差的时刻。",
        action: "如果处于情绪高峰或低谷，先把止损移到安全位置，离开屏幕 15 分钟后再复判。",
      },
      {
        question: "平仓后你准备好记录这笔交易的关键数据和教训吗？",
        brief: "没有复盘的交易，盈利只是运气，亏损只是代价——两者都不会转化为可复用的技能。",
        action: "记录入场理由、出场触发、情绪状态、实际盈亏 vs 计划盈亏，一笔单积累一条规律。",
      },
    ],
  },
];

export function ExitFirewallWidget() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(EXIT_SECTIONS[0].key);

  const currentSection =
    EXIT_SECTIONS.find((section) => section.key === activeSection) ?? EXIT_SECTIONS[0];

  return (
    <aside
      style={{
        position: "fixed",
        left: "1rem",
        bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.25rem))",
        zIndex: 80,
      }}
      aria-label="平仓前提示"
    >
      <div className="relative flex w-auto flex-col items-start">
        {open ? (
          <section
            className="mb-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[26px] border shadow-[0_28px_80px_rgba(8,6,5,0.42)]"
            style={{
              borderColor: "rgba(196, 176, 146, 0.18)",
              background:
                "radial-gradient(circle at top left, rgba(127,168,201,0.16), transparent 34%), linear-gradient(180deg, rgba(29,24,21,0.98), rgba(16,14,13,0.98))",
            }}
          >
            <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: "rgba(196, 176, 146, 0.12)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(214, 197, 176, 0.58)" }}>
                    Exit firewall
                  </p>
                  <h2 className="mt-2 text-[1rem] font-semibold leading-tight" style={{ color: "#f4ece1" }}>
                    平仓前先过问
                  </h2>
                  <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.68)" }}>
                    点开再看，锁利润前先冷静过一遍。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="收起平仓前提示"
                  className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    borderColor: "rgba(214, 197, 176, 0.14)",
                    color: "rgba(214, 197, 176, 0.78)",
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 0 0 2px rgba(16, 14, 13, 0.9)",
                  }}
                >
                  <span aria-hidden="true">-</span>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {EXIT_SECTIONS.map((section, index) => {
                  const active = section.key === currentSection.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      aria-pressed={active}
                      className="rounded-full border px-3 py-1.5 text-left text-[11px] font-medium transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        borderColor: active ? `${section.accent}55` : "rgba(196, 176, 146, 0.14)",
                        background: active ? section.background : "rgba(255,255,255,0.02)",
                        color: active ? "#f4ece1" : "rgba(214, 197, 176, 0.72)",
                        boxShadow: active ? `inset 0 0 0 1px ${section.accent}22` : "none",
                      }}
                    >
                      {index + 1}. {section.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[min(58vh,32rem)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: currentSection.border, background: currentSection.background }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: `${currentSection.accent}dd` }}>
                  {currentSection.eyebrow}
                </p>
                <h3 className="mt-2 text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
                  {currentSection.title}
                </h3>
                <p className="mt-1 text-[12px]" style={{ color: "rgba(244, 236, 225, 0.68)" }}>
                  逐条过，任何一条回答含糊，都先别急着平仓。
                </p>
              </div>

              <div className="mt-3 grid gap-3">
                {currentSection.prompts.map((prompt, index) => (
                  <article
                    key={prompt.question}
                    className="rounded-[20px] border px-4 py-4"
                    style={{ borderColor: "rgba(196, 176, 146, 0.12)", background: "rgba(255,255,255,0.025)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                        style={{ background: `${currentSection.accent}20`, color: currentSection.accent }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="text-[13px] font-semibold leading-5" style={{ color: "#f4ece1" }}>
                          {prompt.question}
                        </h4>
                        <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
                          {prompt.brief}
                        </p>
                        <p className="mt-2 text-[12px] leading-5" style={{ color: currentSection.accent }}>
                          {prompt.action}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="border-t px-4 py-3 sm:px-5" style={{ borderColor: "rgba(196, 176, 146, 0.12)" }}>
              <p className="text-[12px]" style={{ color: "rgba(214, 197, 176, 0.72)" }}>
                过不完这 7 问，就别把情绪送进平仓键里。
              </p>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border px-3 py-2 text-left shadow-[0_20px_60px_rgba(8,6,5,0.35)] transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3 sm:px-4 sm:py-3"
          style={{
            borderColor: open ? "rgba(127, 168, 201, 0.26)" : "rgba(196, 176, 146, 0.18)",
            background: "linear-gradient(180deg, rgba(29,24,21,0.98), rgba(16,14,13,0.98))",
            color: "#f4ece1",
          }}
        >
          <span
            className="flex items-center justify-center rounded-full border text-[13px] font-semibold sm:text-[14px]"
            style={{
              width: "1.75rem",
              minWidth: "1.75rem",
              height: "1.75rem",
              flexBasis: "1.75rem",
              borderColor: "rgba(214, 197, 176, 0.14)",
              color: open ? "#a98bc7" : "#7fa8c9",
            }}
            aria-hidden="true"
          >
            {open ? "×" : "7"}
          </span>
          <div className="pr-1">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] sm:block" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              Exit firewall
            </p>
            <p className="text-[12px] font-semibold sm:mt-1 sm:text-[13px]">平仓前先过问</p>
          </div>
        </button>
      </div>
    </aside>
  );
}

export function TradeFirewallWidget() {
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>(FIREWALL_SECTIONS[0].key);

  const currentSection =
    FIREWALL_SECTIONS.find((section) => section.key === activeSection) ?? FIREWALL_SECTIONS[0];

  return (
    <aside
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.25rem))",
        zIndex: 80,
      }}
      aria-label="开单前提示"
    >
      <div className="relative flex w-auto flex-col items-end">
        {open ? (
          <section
            className="mb-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[26px] border shadow-[0_28px_80px_rgba(8,6,5,0.42)]"
            style={{
              borderColor: "rgba(196, 176, 146, 0.18)",
              background:
                "radial-gradient(circle at top right, rgba(223,182,97,0.16), transparent 34%), linear-gradient(180deg, rgba(29,24,21,0.98), rgba(16,14,13,0.98))",
            }}
          >
            <div className="border-b px-4 py-4 sm:px-5" style={{ borderColor: "rgba(196, 176, 146, 0.12)" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "rgba(214, 197, 176, 0.58)" }}>
                    Trade firewall
                  </p>
                  <h2 className="mt-2 text-[1rem] font-semibold leading-tight" style={{ color: "#f4ece1" }}>
                    开单前先过问
                  </h2>
                  <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.68)" }}>
                    点开再看，平时只保留一个入口，不挡图表和按钮。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="收起开单前提示"
                  className="flex h-9 w-9 items-center justify-center rounded-full border transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    borderColor: "rgba(214, 197, 176, 0.14)",
                    color: "rgba(214, 197, 176, 0.78)",
                    background: "rgba(255,255,255,0.03)",
                    boxShadow: "0 0 0 2px rgba(16, 14, 13, 0.9)",
                  }}
                >
                  <span aria-hidden="true">-</span>
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {FIREWALL_SECTIONS.map((section, index) => {
                  const active = section.key === currentSection.key;
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => setActiveSection(section.key)}
                      aria-pressed={active}
                      className="rounded-full border px-3 py-1.5 text-left text-[11px] font-medium transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{
                        borderColor: active ? `${section.accent}55` : "rgba(196, 176, 146, 0.14)",
                        background: active ? section.background : "rgba(255,255,255,0.02)",
                        color: active ? "#f4ece1" : "rgba(214, 197, 176, 0.72)",
                        boxShadow: active ? `inset 0 0 0 1px ${section.accent}22` : "none",
                      }}
                    >
                      {index + 1}. {section.title}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="max-h-[min(58vh,32rem)] overflow-y-auto px-4 py-4 sm:px-5">
              <div className="rounded-[22px] border px-4 py-4" style={{ borderColor: currentSection.border, background: currentSection.background }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: `${currentSection.accent}dd` }}>
                  {currentSection.eyebrow}
                </p>
                <h3 className="mt-2 text-[1rem] font-semibold" style={{ color: "#f4ece1" }}>
                  {currentSection.title}
                </h3>
                <p className="mt-1 text-[12px]" style={{ color: "rgba(244, 236, 225, 0.68)" }}>
                  逐条过，任何一条回答含糊，都先别急着下单。
                </p>
              </div>

              <div className="mt-3 grid gap-3">
                {currentSection.prompts.map((prompt, index) => (
                  <article
                    key={prompt.question}
                    className="rounded-[20px] border px-4 py-4"
                    style={{ borderColor: "rgba(196, 176, 146, 0.12)", background: "rgba(255,255,255,0.025)" }}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                        style={{ background: `${currentSection.accent}20`, color: currentSection.accent }}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="text-[13px] font-semibold leading-5" style={{ color: "#f4ece1" }}>
                          {prompt.question}
                        </h4>
                        <p className="mt-1 text-[12px] leading-5" style={{ color: "rgba(214, 197, 176, 0.64)" }}>
                          {prompt.brief}
                        </p>
                        <p className="mt-2 text-[12px] leading-5" style={{ color: currentSection.accent }}>
                          {prompt.action}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="border-t px-4 py-3 sm:px-5" style={{ borderColor: "rgba(196, 176, 146, 0.12)" }}>
              <p className="text-[12px]" style={{ color: "rgba(214, 197, 176, 0.72)" }}>
                过不完这 7 问，就别把情绪送进订单里。
              </p>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full border px-3 py-2 text-left shadow-[0_20px_60px_rgba(8,6,5,0.35)] transition hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:gap-3 sm:px-4 sm:py-3"
          style={{
            borderColor: open ? "rgba(223, 182, 97, 0.26)" : "rgba(196, 176, 146, 0.18)",
            background: "linear-gradient(180deg, rgba(29,24,21,0.98), rgba(16,14,13,0.98))",
            color: "#f4ece1",
          }}
        >
          <span
            className="flex items-center justify-center rounded-full border text-[13px] font-semibold sm:text-[14px]"
            style={{
              width: "1.75rem",
              minWidth: "1.75rem",
              height: "1.75rem",
              flexBasis: "1.75rem",
              borderColor: "rgba(214, 197, 176, 0.14)",
              color: open ? "#d97757" : "#dfb661",
            }}
            aria-hidden="true"
          >
            {open ? "×" : "7"}
          </span>
          <div className="pr-1">
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] sm:block" style={{ color: "rgba(214, 197, 176, 0.56)" }}>
              Trade firewall
            </p>
            <p className="text-[12px] font-semibold sm:mt-1 sm:text-[13px]">开单前先过问</p>
          </div>
        </button>
      </div>
    </aside>
  );
}
