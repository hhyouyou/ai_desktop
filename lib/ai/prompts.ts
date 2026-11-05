/**
 * AI 模块的提示词与选项定义（浏览器 / 服务端通用）。
 * 服务端用它拼系统提示词；客户端用它渲染选项卡片。
 */

import type { Accent } from "@/lib/accent";
import type { IconKey } from "@/lib/site";
import type { DrawingStyleKey } from "./svg";

/* -------------------------------------------------------------------------- */
/*                                   AI 写作                                  */
/* -------------------------------------------------------------------------- */

export const WRITING_MODES = [
  {
    key: "xiaohongshu",
    label: "小红书文案",
    desc: "短句 + 钩子 + 话题标签",
    accent: "coral",
    placeholder: "例如：把桌面收拾干净的小习惯",
    pointsHint: "例如：先清空桌面、只留当天要用的东西、每周五统一归位",
  },
  {
    key: "wechat",
    label: "公众号长文",
    desc: "标题 + 导语 + 分节正文",
    accent: "blue",
    placeholder: "例如：为什么我放弃了「完美计划」",
    pointsHint: "例如：完美计划的问题、可执行的替代方案、坚持 30 天的变化",
  },
  {
    key: "email",
    label: "工作邮件",
    desc: "主题、称呼、正文、落款",
    accent: "mint",
    placeholder: "例如：向合作方同步项目延期一周",
    pointsHint: "例如：延期原因、新的交付时间、需要对方确认的事项",
  },
  {
    key: "headline",
    label: "标题改写",
    desc: "8 种策略，换着角度起标题",
    accent: "sun",
    placeholder: "例如：一篇讲时间管理误区的文章",
    pointsHint: "例如：核心结论是「别做满日程表」，面向职场新人",
  },
] as const;

export type WritingModeKey = (typeof WRITING_MODES)[number]["key"];

export const WRITING_TONES = [
  { key: "professional", label: "克制专业", desc: "少形容词，多结论" },
  { key: "warm", label: "亲切自然", desc: "像朋友聊天" },
  { key: "direct", label: "直接犀利", desc: "短句，有观点" },
  { key: "gentle", label: "温柔治愈", desc: "节奏慢，照顾情绪" },
  { key: "humor", label: "轻松幽默", desc: "有梗但不油" },
] as const;

export type WritingToneKey = (typeof WRITING_TONES)[number]["key"];

export function isWritingMode(value: string): value is WritingModeKey {
  return WRITING_MODES.some((mode) => mode.key === value);
}

export function isWritingTone(value: string): value is WritingToneKey {
  return WRITING_TONES.some((tone) => tone.key === value);
}

export function getWritingMode(key: WritingModeKey): (typeof WRITING_MODES)[number] {
  return WRITING_MODES.find((mode) => mode.key === key) ?? WRITING_MODES[0];
}

export function getWritingTone(key: WritingToneKey): (typeof WRITING_TONES)[number] {
  return WRITING_TONES.find((tone) => tone.key === key) ?? WRITING_TONES[0];
}

const TONE_RULE: Record<WritingToneKey, string> = {
  professional: "语气克制专业：先给结论，再给理由；不用感叹号，不用网络流行语。",
  warm: "语气亲切自然：像同事之间聊天，可以用「我们」「你可以」，避免说教。",
  direct: "语气直接犀利：多用短句，敢于下判断，删掉所有铺垫和客套。",
  gentle: "语气温柔治愈：节奏放慢，先照顾读者情绪，再给建议。",
  humor: "语气轻松幽默：可以有自嘲和轻量的梗，但不油腻、不玩烂梗。",
};

/** 写作页的系统提示词 */
export function writingSystemPrompt(mode: WritingModeKey, tone: WritingToneKey): string {
  const base = [
    "你是一位中文内容编辑，正在为「块集 BlockSet」的用户代写内容。",
    "要求：中文输出，只输出成稿本身，不要解释你在做什么，不要输出 Markdown 代码块围栏。",
    TONE_RULE[tone],
  ].join("\n");

  const byMode: Record<WritingModeKey, string> = {
    xiaohongshu: [
      base,
      "任务：写一篇小红书风格文案。结构固定为：",
      "1. 标题备选（3 条，每条不超过 20 字）；",
      "2. 正文（分 3 段，每段 1–2 句，多用换行，不要堆砌感叹号）；",
      "3. 话题标签（4–6 个，以 # 开头）。",
    ].join("\n"),
    wechat: [
      base,
      "任务：写一篇公众号长文。结构固定为：",
      "1. 主标题（不超过 24 字）；",
      "2. 导语（2–3 句，交代读者为什么要读下去）；",
      "3. 三个小节，每节有小标题和 2–3 段正文；",
      "4. 结尾（3 句以内，给一个具体行动建议）。",
      "总长度 600–900 字。",
    ].join("\n"),
    email: [
      base,
      "任务：写一封可以直接发送的工作邮件。结构固定为：",
      "1. 主题行；",
      "2. 称呼；",
      "3. 正文（3 段以内，第一段说事，第二段给背景或方案，第三段写清需要对方做什么）；",
      "4. 落款。",
      "不要用「此致敬礼」这类套话，结尾一句即可。",
    ].join("\n"),
    headline: [
      base,
      "任务：把用户给的选题改写成 8 条标题。每条标题前面标注策略名，格式如「1. 数字型：……」；",
      "策略必须覆盖：数字型、悬念型、反常识型、对比型、身份型、时间型、结果型、提问型；",
      "每条标题不超过 26 字，不要用夸张的「震惊」「必看」。",
    ].join("\n"),
  };

  return byMode[mode];
}

/** 写作页的用户提示词 */
export function writingUserPrompt(input: {
  mode: WritingModeKey;
  topic: string;
  points: string;
  tone: WritingToneKey;
}): string {
  const mode = getWritingMode(input.mode);
  const tone = getWritingTone(input.tone);
  const lines = [
    `体裁：${mode.label}`,
    `语气：${tone.label}`,
    `主题：${input.topic.trim() || "（未填写，请围绕主题自行合理展开）"}`,
  ];
  if (input.points.trim()) lines.push(`要点：\n${input.points.trim()}`);
  lines.push("现在开始写，只输出成稿。");
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/*                                   AI 对话                                  */
/* -------------------------------------------------------------------------- */

export const CHAT_SYSTEM_PROMPT = [
  "你就是「块集 AI」，块集 BlockSet 站内的对话助手，帮用户处理写作、整理、翻译、计划这类日常任务。",
  "回答用中文。先给结论，再给理由；能用列表就不要写大段文字。",
  "不要自称语言模型，不要编造事实与数据；不确定时直接说不确定。",
  "涉及代码时给最小可运行示例，不要写冗长的框架代码。",
].join("\n");

export const CHAT_PRESETS: {
  key: string;
  label: string;
  desc: string;
  icon: IconKey;
  accent: Accent;
  text: string;
}[] = [
  {
    key: "summary",
    label: "总结要点",
    desc: "把长内容压成三条",
    icon: "text",
    accent: "sun",
    text: "把下面的内容总结成 3 条要点，每条不超过 40 字，最后补一句结论：\n\n",
  },
  {
    key: "rewrite",
    label: "改写润色",
    desc: "更简洁、更自然",
    icon: "pen",
    accent: "coral",
    text: "把下面这段话改写得更简洁自然，保留原意，并告诉我改了哪几处：\n\n",
  },
  {
    key: "translate",
    label: "中英翻译",
    desc: "保留语气与术语",
    icon: "code",
    accent: "blue",
    text: "把下面的内容翻译成英文，保留原来的语气和术语：\n\n",
  },
  {
    key: "todo",
    label: "列出待办",
    desc: "从描述里抽任务",
    icon: "check",
    accent: "mint",
    text: "把下面的事情整理成待办清单，按高 / 中 / 低标注优先级：\n\n",
  },
];

/* -------------------------------------------------------------------------- */
/*                                   AI 画图                                  */
/* -------------------------------------------------------------------------- */

/** 真实图片模型用的风格描述（演示模式的程序化引擎用不到） */
export const IMAGE_STYLE_PROMPT: Record<DrawingStyleKey, string> = {
  flat: "扁平几何风格，粗描边，纯色块，无渐变，复古海报构图",
  isometric: "等距透视插画，2.5D 立体方块，干净的几何造型",
  line: "单色线稿风格，细描边，大面积留白，版画质感",
  vintage: "复古印刷风格，套色偏移，网点纹理，纸张颗粒",
  pixel: "像素艺术风格，32 位色方块网格，硬边无抗锯齿",
};

/** 画图尺寸 → 常见 OpenAI 兼容接口的 size 参数 */
export const IMAGE_API_SIZE: Record<"1:1" | "16:9" | "9:16", string> = {
  "1:1": "1024x1024",
  "16:9": "1536x1024",
  "9:16": "1024x1536",
};
