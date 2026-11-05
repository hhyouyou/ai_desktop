---
title: 没有 API Key 的 AI 简报：模板与模型之间
date: 2026-10-05
summary: 一个 AI 功能，在没配 Key 的时候应该长什么样？块集 AI 简报的做法是：模板规则也能产出一份结构完整、可以读的简报，并如实标注"演示模式"。
tags: [AI, 产品, 后端]
---

做 AI 功能时很容易掉进一个坑：把「没有 Key」当成长着错误码的空白页。用户点进去，看到一行红字要求配置密钥，然后关掉页面——他永远不会知道这个功能本来长什么样。

块集 AI 简报想避免这件事。它的做法是：**同一个数据结构，两条生成路径。**

## 先定数据，再定生成方式

无论用模型还是模板，简报落库的 payload 是同一份结构：

```ts
type BriefPayload = {
  date: string;          // 2026-10-05
  demo: boolean;         // 是否模板生成
  model: string | null;  // 模型名，模板生成为 null
  keywords: string[];    // 今日关键词
  mainlines: { title: string; detail: string; sources: string[] }[];
  mustRead: { title: string; source: string; reason: string; url?: string }[];
  summary: string;       // 一句话总结
  stats: { sources: number; items: number; liveSources: number };
};
```

结构定下来之后，前端的渲染代码完全不需要知道内容从哪来。`demo` 字段只影响三处：一个徽标、一段提示文案、历史列表里的「模板 / AI」小标签。

## 模板怎么"像人写的"

模板生成最容易做成一堆占位符。要避免这点，关键是**先做归类，再做文案**。

第一步，把 8 个来源按主题聚成几组：公共热议（微博、百度、抖音）、技术与开源（GitHub、V2EX）、观点与商业（知乎、36 氪）、内容与创作（B 站）。每组按条目数量排序，取前三组作为「3 条主线」。

第二步，主线标题直接复用该组排名第一的条目，前面加上组名：

```ts
title: `${cluster.label}：${truncate(top.item.title, 30)}`
```

第三步，关键词用两层提取：先匹配一份主题词表（AI、开源、效率、浏览器……），不够 6 个时再用中文 n-gram 词频补充。最后拼一句话总结时，引用前三组主线的标题。

这套规则不聪明，但它是**确定的**：同样的榜单永远生成同样的简报。对演示模式来说，确定性比惊喜更重要。

## 有 Key 的时候，记得保留退路

模型路径用的还是同一份 input——8 个来源的前 5 条标题，加上热度。Prompt 里明确要求输出 JSON，并在解析时做字段校验：缺 keywords、没有 mainlines、summary 为空，都视为解析失败，回退到模板。

```ts
try {
  const sections = await callModel(boards, apiKey);
  return { payload: { ...template, ...sections, demo: false, model: aiModel() } };
} catch (error) {
  return { payload: { ...template, warning: `AI 调用失败：${error}` } };
}
```

注意这里 `...template` 的顺序：模型只覆盖它能保证的字段，其余（日期、统计、数据状态）仍然来自模板。这样即使模型返回了一个字段残缺的对象，简报也不会渲染成半截。

## 演示模式不是占位符

一个功能在"没配置"状态下的表现，和配置好之后同等重要。它至少要做到三件事：

1. **能完整走完流程**——按钮可点、结果可看、能存能查历史；
2. **明确标注当前是演示**——徽标 + 说明 + 去配置的链接；
3. **不产生误导**——如果是示例榜单生成的，就额外说明"反映的是示例数据"。

做到这三点，用户即使暂时不配置模型，也能判断这个功能值不值得他花五分钟去申请一个 Key。

## 最后

把「降级路径」当成功能的一部分来设计，往往比多接一个模型更有价值。模型会换、接口会挂，但页面总得能打开。
