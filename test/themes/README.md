# 主题切换原型（在线桌面）

**一个页面，5 套主题，默认「清爽桌面」，选择持久化。** 这是用来验证「多主题 + 用户自选」方案的可行性，不是正式实现。

打开 [`index.html`](index.html) → 右下角「◎ 主题」切换；也可以直接带参数打开：

| 主题 | 链接 |
|---|---|
| 清爽桌面（默认） | [`index.html?theme=clear`](index.html?theme=clear) |
| 毛玻璃桌面 | [`index.html?theme=glass`](index.html?theme=glass) |
| 极简工作台 | [`index.html?theme=minimal`](index.html?theme=minimal) |
| 平铺工作台 | [`index.html?theme=tiling`](index.html?theme=tiling) |
| 纸面工作台 | [`index.html?theme=paper`](index.html?theme=paper) |

截图在 `preview/`。

## 关键设计：布局层 / 皮肤层分离

| 层 | 内容 | 换主题时是否变化 |
|---|---|---|
| 结构 DOM | 顶栏、左侧应用栏、窗口、Dock | ❌ 不变（只有一套） |
| 设计 token | `--surface / --ink / --line / --accent / --radius / --shadow / --blur / --font-*` | ✅ 主题只覆盖这些变量 |
| 结构差异 | 平铺/纸面需要重排布局 | ✅ 用 `display:contents` + `grid-area` 在同一份 DOM 上重排 |

也就是说：

- **01 清爽 / 02 毛玻璃 / 03 极简** = 纯皮肤，只需覆盖 ~40 个变量（每个主题约 40–60 行 CSS）。
- **04 平铺 / 05 纸面** = 皮肤 + 布局变体（用 `display:contents` 让窗口直接成为外层网格项，再指定 `grid-template-areas`；约 30–50 行额外 CSS）。

原型里这些都写在一个 HTML 里，主题通过 `html[data-theme="..."]` 切换；正式版会拆成：

```text
app/
  layout.tsx                 # 读 cookie → <html data-theme="clear">
  globals.css / themes.css   # token 定义 + 每个主题的覆盖块
  components/shell/          # 唯一一套结构组件
  lib/theme.ts               # 主题注册表 + 校验
```

## 难度评估（真实项目）

| 事项 | 工作量 | 说明 |
|---|---|---|
| token 化现有样式 | 1–2 天 | 把颜色/圆角/阴影/字体抽成变量，组件改用变量 |
| 主题切换（含持久化） | 0.5 天 | cookie 存主题；服务端渲染时写入 `<html data-theme>`，避免刷新闪一下 |
| 3 套皮肤主题 | 1–2 天 | 每套 40–60 行变量覆盖 + 逐页微调 |
| 2 套布局变体（平铺/纸面） | 2–3 天 | `display:contents` 重排 + 移动端降级 |
| 设置页「外观」入口 + 主题预览卡 | 0.5 天 | 5 个色块 + 名称 + 当前状态 |
| **QA（真正的成本）** | **2–3 天** | 5 主题 × 主要页面 × 移动端，重点是对比度、深色下的图表/图片、打印 |

**结论：可行，工程量中等。** 一次性做 5 套大概 1–2 周；先做「1 套皮肤 + 切换框架」（约 3 天），之后每加一套皮肤只要 0.5–1 天。

## 三个真实坑

1. **token 覆盖不全**：深色主题（毛玻璃）最容易暴露硬编码颜色（阴影、描边、图表、图片背景）。建议先做「清晰主题 + 毛玻璃」两套压测，把漏网的硬编码抓干净。
2. **刷新闪烁（FOUC）**：主题必须由**服务端**写入 `<html data-theme>`（或内联脚本先执行），不能用 `useEffect` 在客户端切换，否则每次刷新都会先闪默认主题。
3. **每主题都要过一遍无障碍**：深色下的次级文字、细边框、按钮 hover 对比度最容易不达标；至少检查 WCAG AA 的正文对比度。

## 新增一套主题的步骤

1. 在 `lib/theme.ts` 的注册表里加一条：`{ id, name, description, swatches[], mode: "skin" | "layout" }`；
2. 在 `themes.css` 加 `html[data-theme="xxx"] { ...token 覆盖... }`；
3. 如果是布局变体，再加一组结构覆盖（`display:contents` + `grid-template-areas`）；
4. 设置页会自动出现新主题（注册表驱动），跑一次截图对比即可。

## 移动端

桌面隐喻在 ≤820px 会退化：隐藏左侧应用栏和 Dock 之外的小组件，窗口变单列，Dock 变成底部 Tab。主题只改 token，不改变这套降级规则。
