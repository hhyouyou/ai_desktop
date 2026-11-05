---
title: 浏览器本地计算：图片压缩为什么不花服务器一分钱
date: 2026-09-28
summary: 从 Canvas 到 WebCodecs，浏览器已经能承担大部分日常图像处理。这篇记录块集里图片压缩、裁剪、九宫格的实现思路与踩过的坑。
tags: [前端, 性能, 图像]
---

图片压缩听上去是后端活，但真正决定压缩质量的是**编码器参数**，而编码器浏览器就有。

## 核心只有三步

```ts
const bitmap = await createImageBitmap(file);
const canvas = new OffscreenCanvas(width, height);
const ctx = canvas.getContext("2d")!;
ctx.drawImage(bitmap, 0, 0, width, height);
const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.82 });
```

`OffscreenCanvas` + `convertToBlob` 的好处是不用把 canvas 塞进 DOM，跑在 worker 里也不会卡住主线程。

## 质量 vs 体积：不要用固定值

固定 `quality: 0.8` 的问题很明显：一张本来就模糊的图会越压越糊，而一张细节丰富的图又压不下去。

更稳的做法是**二分搜索**：

1. 先按 0.9 压一次，体积达标就结束；
2. 不达标就往下探，直到满足目标体积或触到底线质量；
3. 对比不同格式（WebP / JPEG / AVIF）的体积，取最小的那个。

代价是编码多次，一张 4000×3000 的图大约多花 300–800ms。所以块集对超过 20MP 的图会提示降采样。

## 几个真实的坑

- **EXIF 方向**：`createImageBitmap` 默认遵守 EXIF，但 Safari 老版本会丢方向，导出前要手动处理；
- **透明通道**：转 JPEG 必须先把 alpha 通道铺白，否则透明区域变黑；
- **色彩空间**：带 ICC 的图和 sRGB 混在一起，导出颜色会偏，需要 `colorSpace: "srgb"`；
- **内存**：一张 5000 万像素的图解码后约 200MB，移动端很容易直接崩。

> 本地计算不是"把服务器的工作挪到浏览器"，而是"只做浏览器擅长的那部分"。

## 什么时候仍然需要服务器

- 需要 AVIF 这种浏览器编码支持还不完整的格式
- 需要批量处理几百张图并且保留任务队列
- 需要跨设备同步结果

块集目前的选择是：**单张、少量、隐私敏感 → 本地；批量、跨端 → 才考虑上传**。这条边界写清楚，比硬吹"全本地"更可信。
