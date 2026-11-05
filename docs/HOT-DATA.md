# 热榜数据源说明

## 一、架构

```
浏览器
  └─ /daily-hot · /api/hot
        └─ lib/hot-fetch.ts        ← 统一调度：原生适配器优先 → 本地聚合服务 → 缓存 → 示例数据
              ├─ lib/hot-native.ts ← 原生适配器（weibo / baidu / github）
              └─ HOT_API_BASE      ← 本地 DailyHotApi 服务（zhihu / douyin / bilibili / 36kr / juejin）
                    └─ 上游各平台公开接口
```

- **缓存**：每次抓取成功写入 `hot_cache` 表；`/api/hot` 有 3 分钟内存软缓存；页面默认读缓存，所以打开页面不会因为上游抖动而白屏。
- **降级**：任何一步失败都不会抛到页面，依次回退到「本地缓存 → 内置示例数据」，并返回 `warning` 文案，界面按来源标注。
- **并发**：`/api/hot?refresh=1` 会并发刷新全部 8 个来源，单个来源超时 8s。

## 二、为什么是「混合方案」

直接复用单一聚合项目会踩两类坑，实测（2026-10）结论：

| 来源 | 情况 | 采用方式 |
|---|---|---|
| 微博 | `m.weibo.cn` 对无 Cookie 请求返回 **432**，聚合服务的适配器已失效；`weibo.com/ajax/side/hotSearch` 可直连 | 原生适配器 |
| 百度 | 聚合服务解析 `top.baidu.com/board` 的 HTML 结构已经变空；其 JSON 接口可直连且多一层 `content` 嵌套 | 原生适配器 |
| GitHub | `github.com/trending` 在本机被墙；`api.github.com` 可用 | 原生适配器（搜索接口） |
| 知乎 / 抖音 / B 站 / 36 氪 / 掘金 | 聚合服务的适配器仍可用 | 本地 DailyHotApi |
| V2EX | `www.v2ex.com/api` 在本机超时不可达 | 已从来源列表移除，替换为掘金 |

## 三、本地聚合服务

使用 [imsyy/DailyHotApi](https://github.com/imsyy/DailyHotApi)（**MIT**，约 4k star），已发布到 npm：

```bash
npm run hot:install   # 首次安装依赖（vendor/hot-service）
npm run hot:start     # 启动在 http://127.0.0.1:6688
```

对应代码：

```text
vendor/hot-service/
  package.json     # 只依赖 dailyhot-api
  server.mjs       # import serveHotApi; serveHotApi(6688)
  .env             # PORT=6688 等配置
  node_modules/    # 已 gitignore
```

常用接口：

| 地址 | 说明 |
|---|---|
| `http://127.0.0.1:6688/juejin` | 单个来源，JSON：`{ code, data: [ { title, url, hot, ... } ] }` |
| `http://127.0.0.1:6688/` | 服务自带的前端页面 |
| `http://127.0.0.1:6688/rss/weibo` | RSS 模式（需在 .env 开 `RSS_MODE`） |

默认缓存 60 分钟（`vendor/hot-service/.env` 的 `CACHE_TTL`），请求超时 6s。改完 `.env` 需要重启该服务。

## 四、配置

根目录 `.env`：

```ini
HOT_API_BASE=http://127.0.0.1:6688
```

留空则所有来源显示内置示例数据（页面标注「示例数据」）。

## 五、自己新增一个来源

1. **走聚合服务**（最简单）：把 `HotSourceKey` 加进 `lib/hot.ts` 的联合类型、`HOT_SOURCES`、`SEED`，确认 DailyHotApi 有同名路由即可，无需改抓取代码。
2. **走原生适配器**：在 `lib/hot-native.ts` 里加一个 `fetchXxx(): Promise<HotItem[]>` 并注册进 `NATIVE`。要求：返回按热度排序的 `HotItem[]`，失败时抛错（由上层降级）。
3. 前端不需要改：`/daily-hot` 与 `/api/hot` 都从 `HOT_SOURCES` 渲染。

## 六、注意事项

- **上游条款**：这些接口都是各平台的公开接口，抓取行为可能违反其用户协议；本项目仅供技术研究与自用演示，对外运营前请确认授权或换用有授权的数据源。
- **反爬会失效**：微博、抖音等平台随时可能调整风控（本次就遇到了微博 432）。失效后对应来源会自动回退到示例数据，不会影响整页。
- **不要高频请求**：聚合服务自带 60 分钟缓存，本项目的 `/api/hot` 还有 3 分钟软缓存；请不要在页面上做自动轮询。
- **许可证**：DailyHotApi 为 MIT，`vendor/hot-service/node_modules/dailyhot-api/LICENSE` 保留了原始版权声明；本项目未修改其源码，仅通过公开 API 调用。

## 七、排障

| 现象 | 检查 |
|---|---|
| 全部来源都是「示例」 | `HOT_API_BASE` 是否配置、`npm run hot:start` 是否在跑、`curl http://127.0.0.1:6688/juejin` 是否 200 |
| 单个来源一直失败 | 看聚合服务日志里对应上游的状态码（如 432/500/超时），该来源通常需要原生适配器 |
| 数据不更新 | 聚合服务 `CACHE_TTL=3600`，或本项目 3 分钟软缓存；点「刷新」并等待 |
| 微博 432 | 已在原生适配器里改走 `weibo.com/ajax/side/hotSearch`；若再次失效，需要补 Cookie/换接口 |
