/**
 * 演示模式内容库。
 *
 * 没有配置 API Key 时，接口不报错、不返回空白，而是按用户输入分流到不同模板，
 * 生成一份结构完整、可以直接阅读的示例结果，并通过 20–40ms 的间隔分块流式输出。
 * 所有演示内容末尾都会明确标注「非真实模型输出」，避免误导。
 */

import type { ChatMessage } from "./types";
import type { WritingModeKey, WritingToneKey } from "./prompts";

const DEMO_NOTE = "\n\n（演示模式内容，非真实模型输出。到「模型设置」填入 API Key 后可获得真实回答。）";

/** 演示回复分块：按 2–4 个字符切开，中文阅读节奏刚好 */
export function chunkText(text: string, size = 3): string[] {
  const chars = Array.from(text);
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += size) {
    chunks.push(chars.slice(i, i + size).join(""));
  }
  return chunks;
}

/** 每块之间的间隔（毫秒）：20–40ms，带一点随机抖动 */
export function demoChunkDelay(): number {
  return 20 + Math.floor(Math.random() * 20);
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*`_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text: string, max = 42): string {
  const clean = stripMarkdown(text);
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/** 从一段描述里抽出 3–5 个「像任务」的短语 */
function extractItems(text: string): string[] {
  // 「把这几件事列成待办：A、B」这类指令，先去掉冒号前面的话
  const colon = text.lastIndexOf("：");
  const body = colon >= 0 ? text.slice(colon + 1) : text;
  const parts = body
    .replace(/^[\s：:]+/, "")
    .split(/[、，,；;\n]+/)
    .map((part) =>
      part
        .replace(/^[\d一二三四五六七八九十]+[.、)）]\s*/, "")
        .replace(/^[-*•]\s*/, "")
        .replace(/[。.!！?？]+$/, "")
        .trim(),
    )
    .filter((part) => part.length >= 2 && part.length <= 30);
  const unique: string[] = [];
  for (const part of parts) {
    if (!unique.includes(part)) unique.push(part);
    if (unique.length >= 5) break;
  }
  return unique;
}

const KEYWORDS = {
  todo: ["待办", "任务", "计划", "安排", "清单", "todo", "提醒", "排期"],
  summary: ["总结", "归纳", "提炼", "要点", "摘要", "压缩", "精简", "纪要"],
  rewrite: ["改写", "润色", "优化", "通顺", "重写", "改一版", "语病", "更自然"],
  translate: ["翻译", "英文", "英语", "translate", "中译英", "译成"],
};

function hasKeyword(text: string, list: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return list.some((word) => lower.includes(word));
}

/* -------------------------------------------------------------------------- */
/*                                对话演示模板                                 */
/* -------------------------------------------------------------------------- */

function summaryReply(userText: string): string {
  const topic = excerpt(userText, 36) || "你发来的这段内容";
  return [
    `先把这段内容压成一条主线：**${topic}**。`,
    "",
    "## 三条要点",
    "1. **目标要具体**：把「做好一点」换成「周五前交出一版能用的草稿」，判断标准才存在。",
    "2. **动作要小**：拆到「今天能开始、20 分钟内能推进」的粒度，计划才不会被拖延吃掉。",
    "3. **复盘要短**：结束后只留三行——做成了什么、卡在哪、下次改什么。",
    "",
    "## 一句话结论",
    `> 先把「${topic}」里最关键的一步做完，其余事情顺延。`,
    "",
    "如果你把原文再发一次，并告诉我读者是谁（自己 / 同事 / 客户），我可以按那个视角重写一版。",
    DEMO_NOTE,
  ].join("\n");
}

function rewriteReply(userText: string): string {
  const topic = excerpt(userText, 32) || "这段内容";
  return [
    "## 改写后",
    `> 关于「${topic}」，先说结论：把目标收窄到一个能当天开始的动作，比写一份完整计划更有用。`,
    "",
    "## 改了三处",
    "1. 把原来的长句断成两句，读者不用回读；",
    "2. 去掉「非常」「其实」「基本上」这类不承担信息的词；",
    "3. 结尾补了一句行动指向，让文字有落点。",
    "",
    "## 还可以再改的方向",
    "- 如果读者是同事：保留「结论 + 下一步」，删掉铺垫。",
    "- 如果读者是客户：把「我们做了」改成「你能得到」。",
    "- 如果是公开发布：开头用一句具体的场景，代替抽象判断。",
    DEMO_NOTE,
  ].join("\n");
}

function translateReply(userText: string): string {
  const topic = excerpt(userText, 28);
  return [
    "## 处理思路",
    "先定主语和时态，再拆中文里的长定语句。中文可以省略主语，英文最好补出来，否则读起来像命令。",
    "",
    "## 示例译文",
    "> Keep the goal narrow enough that one step is visible today, and let the rest wait its turn.",
    topic ? `> （对应你这段关于「${topic}」的表达。）` : "> （对应你这段内容的表达骨架。）",
    "",
    "## 我会注意的三点",
    "1. **术语统一**：同一个词前后只用一种译法，不要一段里换三次。",
    "2. **语气对齐**：邮件用 could / would 留余地，说明文用一般现在时更利落。",
    "3. **句子长短交替**：连续三个长句之后，插一个短句，读起来才有呼吸。",
    "",
    "把需要翻译的全文发我，我可以按「直译 / 意译」两版给你对比。",
    DEMO_NOTE,
  ].join("\n");
}

function todoReply(userText: string): string {
  const items = extractItems(userText);
  const fallback = [
    "把本周要交付的东西写成一句话",
    "给最难的一步留出两个 25 分钟的整块时间",
    "周五收尾时记三行复盘",
  ];
  const picked = items.length >= 2 ? items.slice(0, 3) : fallback;
  const priority = ["高", "中", "低"];
  const rows = picked.map((item, index) => `- [ ] **${priority[Math.min(index, 2)]}** · ${item}`);
  return [
    "我按优先级拆成了下面几条：",
    "",
    ...rows,
    "",
    "先只推进第一条，完成后再打开第二条——同时开三条通常会一条都做不完。",
    "",
    "这些可以直接记进「待办清单」，完成率会自动统计。需要带截止日期的版本吗？把日期发我。",
    DEMO_NOTE,
  ].join("\n");
}

function generalReply(userText: string): string {
  const topic = excerpt(userText, 40) || "你现在遇到的问题";
  return [
    `先说我的理解：你想要的是「${topic}」这类问题的可执行答案，而不是一段泛泛的解释。`,
    "",
    "## 一个够用的顺序",
    "1. **写清交付物**：一句话说清楚最终要交什么，最好能被别人检查。",
    "2. **找最不确定的一步**：先花 20 分钟验证它，别急着做完整版。",
    "3. **定复查时间**：把「做完了吗」换成「哪一步还没做完」。",
    "",
    "## 可以用来自查的三个问题",
    "- 这件事的最小完成形态是什么？",
    "- 现在卡住的是信息不够，还是动作太大？",
    "- 如果只能做一件事，做哪件？",
    "",
    "你把具体情况补两句（现在的做法、卡住的点），我可以给更贴合的方案。",
    DEMO_NOTE,
  ].join("\n");
}

export type DemoChatResult = { reply: string; template: string };

/** 按最后一条用户消息的关键词分流到 5 种演示模板 */
export function demoChatReply(messages: ChatMessage[]): DemoChatResult {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const text = lastUser?.content ?? "";
  if (hasKeyword(text, KEYWORDS.todo)) return { reply: todoReply(text), template: "todo" };
  if (hasKeyword(text, KEYWORDS.summary)) return { reply: summaryReply(text), template: "summary" };
  if (hasKeyword(text, KEYWORDS.translate)) return { reply: translateReply(text), template: "translate" };
  if (hasKeyword(text, KEYWORDS.rewrite)) return { reply: rewriteReply(text), template: "rewrite" };
  return { reply: generalReply(text), template: "general" };
}

/* -------------------------------------------------------------------------- */
/*                                写作演示模板                                 */
/* -------------------------------------------------------------------------- */

const TONE_OPENING: Record<WritingToneKey, string> = {
  professional: "先把结论放在前面：",
  warm: "如果你也在为这件事发愁，先别急，我们一点点来：",
  direct: "不绕弯子，直接说重点：",
  gentle: "慢慢来，把这件事拆开看，会轻松一些：",
  humor: "认真说件小事：",
};

const TONE_CLOSING: Record<WritingToneKey, string> = {
  professional: "如果这个方向没问题，我按同样的结构再补一版执行清单。",
  warm: "先做一点点就好，做完记得回来告诉我结果。",
  direct: "别犹豫，先从第一条开始。",
  gentle: "做到哪一步都算数，不用一次到位。",
  humor: "行，先干第一步，剩下的交给明天的你。",
};

function defaultPoints(mode: WritingModeKey, topic: string): string[] {
  const map: Record<WritingModeKey, string[]> = {
    xiaohongshu: [
      `先把「${topic}」这件事拆成最小的一步`,
      "只保留当天真正会用到的部分",
      "每周固定一个时间统一收尾",
    ],
    wechat: [
      "为什么「做满计划」反而让人拖延",
      "把计划换成「一天一件事」的写法",
      "坚持 30 天之后，变化发生在哪里",
    ],
    email: [
      "当前进度与遇到的具体问题",
      "新的交付时间与补救方案",
      "需要对方确认的两个事项",
    ],
    headline: [
      "核心结论是反直觉的，标题要把反差说清楚",
      "面向职场新人，减少抽象名词",
      "可以用具体数字，但不要编造",
    ],
  };
  return map[mode];
}

function pointList(points: string, mode: WritingModeKey, topic: string): string[] {
  const items = points
    .split(/[\n；;]+/)
    .map((item) => item.replace(/^[\d一二三四五六七八九十]+[.、)）]\s*/, "").trim())
    .filter(Boolean);
  return items.length >= 2 ? items.slice(0, 5) : defaultPoints(mode, topic);
}

export type DemoWritingInput = {
  mode: WritingModeKey;
  topic: string;
  points: string;
  tone: WritingToneKey;
};

/** 写作页演示模式：按 4 种体裁生成结构完整的示例成稿 */
export function demoWritingReply(input: DemoWritingInput): string {
  const topic = input.topic.trim() || "一件值得认真做好的小事";
  const points = pointList(input.points, input.mode, topic);
  const opening = TONE_OPENING[input.tone];
  const closing = TONE_CLOSING[input.tone];
  const fill = (index: number): string => points[index % points.length];

  if (input.mode === "xiaohongshu") {
    return [
      "**标题备选**",
      `1. ${topic}｜我踩过的 3 个坑`,
      `2. 关于${topic}，先看这 3 条再动手`,
      `3. 7 天之后，${topic}会变成习惯`,
      "",
      "**正文**",
      opening,
      "",
      `先说结论：${topic}这件事，难的不是方法，是开始的那一步。`,
      "",
      `① ${fill(0)}`,
      "拆开看会发现，真正花时间的不是执行，而是决定先做什么。把选择提前做掉，执行就会变顺。",
      "",
      `② ${fill(1)}`,
      "这一步最容易翻车的地方是「一次想做完」。把它砍到 20 分钟能完成的程度，第二天才愿意继续。",
      "",
      `③ ${fill(2)}`,
      "如果只能记住一句：先把系统跑起来，再慢慢调参数。完美的方案通常出现在第三周，而不是第一周。",
      "",
      "最后提醒一句：别拿别人的节奏要求自己，进度慢一点没关系，断了才最贵。",
      "",
      closing,
      "",
      "**话题标签**",
      `#${topic.replace(/\s+/g, "")} #效率工具 #生活整理 #经验分享 #新手避坑`,
    ].join("\n");
  }

  if (input.mode === "wechat") {
    return [
      `# ${topic}：先想清楚这三件事，再动手`,
      "",
      `${opening}很多人不是不努力，而是把力气花在了「看起来很努力」的环节上。`,
      "",
      "这篇文章不打算给一个万能方法，只讲三件可以今天就试的事，每一件都能在一小时内开始。",
      "",
      `## 一、${fill(0)}`,
      "把目标写具体，是成本最低的一步。写「周五前交出一版能用的草稿」，比写「认真推进」有用得多——前者能被检查，后者只能被感觉。",
      "目标具体之后，判断标准也就有了：做完没做完，不靠心情，靠清单。",
      "",
      `## 二、${fill(1)}`,
      "计划做不满，往往不是时间不够，而是颗粒度太粗。把一件事拆到「今天能开始、20 分钟内能推进」，拖延就失去了藏身之处。",
      "拆的时候有个小技巧：每一步都写成动词开头，能被执行；不要写成状态，状态无法被勾选。",
      "",
      `## 三、${fill(2)}`,
      "复盘不必写长。三行就够：做成了什么、卡在哪、下次改什么。写满一页的复盘，通常只会被看一次；三行的复盘，会被记住。",
      "如果你的复盘总是变成自我批评，试着把「我怎么又没做到」换成「哪一步设计得不够小」。",
      "",
      "## 写在最后",
      closing,
    ].join("\n");
  }

  if (input.mode === "email") {
    return [
      `**主题**：关于${topic}的说明与下一步安排`,
      "",
      "你好，",
      "",
      `${opening}${topic}这件事，目前的进展和需要同步的信息如下。`,
      "",
      `1. ${fill(0)}`,
      `2. ${fill(1)}`,
      `3. ${fill(2)}`,
      "",
      "接下来我会先完成上面第 1 项，确认细节后再同步一次进展，预计不会影响其他排期。",
      "",
      "需要你确认的是：上面的时间点是否可行，以及有没有我遗漏的约束条件。",
      "",
      "如果有不同意见，回一句就行，我按你的节奏调整；如果没问题，我按上面的时间点推进。",
      "",
      closing,
      "",
      "谢谢。",
    ].join("\n");
  }

  const headlines: string[] = [
    `数字型：3 个关于${topic}的判断，能省下大部分返工`,
    `悬念型：${topic}的最后一步，很多人做反了`,
    `反常识型：越认真做${topic}的人，越容易卡住`,
    `对比型：同样做${topic}，有人 3 天见效，有人一直原地`,
    `身份型：做${topic}的人，通常忽略这一点`,
    `时间型：给${topic} 30 分钟，先把这一件事做完`,
    `结果型：把${topic}做对之后，我省下了每周 5 小时`,
    `提问型：为什么你越努力，${topic}反而越乱？`,
  ];
  return [
    "**8 个标题备选**",
    "",
    ...headlines.map((headline, index) => `${index + 1}. ${headline}`),
    "",
    "**使用建议**",
    "- 发公众号：优先用「悬念型」或「反常识型」，但要确认正文真的回答了它。",
    "- 发小红书：优先用「数字型」，标题里带具体收益更容易被点开。",
    "- 内部文档：优先用「结果型」，信息密度最高。",
    "",
    closing,
  ].join("\n");
}

/** 设置页「测试连接」在演示模式下的回复 */
export function demoPingText(): string {
  return "演示模式：服务端未检测到 API Key，本次没有真正请求外部接口。填入 Key 后可以测试真实连接。";
}
