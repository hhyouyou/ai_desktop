import serveHotApi from "dailyhot-api";

const port = Number(process.env.PORT || 6688);

try {
  serveHotApi(port);
  console.log(`[hot-service] DailyHotApi 已启动: http://127.0.0.1:${port}/weibo`);
} catch (error) {
  console.error("[hot-service] 启动失败:", error);
  process.exit(1);
}
