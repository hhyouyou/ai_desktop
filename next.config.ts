import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
  images: { unoptimized: true },
  poweredByHeader: false,
  // 关闭 dev 左下角的 Next.js 开发指示器，截图更干净（仅影响开发环境）
  devIndicators: false,
  // 允许用独立目录跑生产构建（避免和 dev server 抢占 .next）
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // 本机沙箱环境里 Next 无法 spawn 子进程跑类型检查，改为单独执行 `npm run typecheck`
  typescript: { ignoreBuildErrors: true },
  experimental: {
    // 本机沙箱不允许 fork 子进程；构建阶段用 1 个 worker 走串行路径
    cpus: 1,
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  // 允许通过 127.0.0.1 访问 dev 资源（否则 HMR websocket 会被判定跨源拦截）
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
