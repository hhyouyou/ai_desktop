/** 删除本地 SQLite 数据（.data 目录），用于重置演示数据 */
import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), ".data");
if (fs.existsSync(dir)) {
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`已删除 ${dir}`);
} else {
  console.log("没有本地数据目录，无需重置");
}
