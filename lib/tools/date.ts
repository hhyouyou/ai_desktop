/** 时区相关的时间格式化与解析（不依赖任何三方库，只用 Intl）。 */

export type ZonedParts = { y: number; mo: number; d: number; h: number; mi: number; s: number };

export type TimeZoneOption = { value: string; label: string };

export const TIME_ZONES: TimeZoneOption[] = [
  { value: "Asia/Shanghai", label: "北京时间 (UTC+8)" },
  { value: "UTC", label: "UTC 协调世界时" },
  { value: "Asia/Tokyo", label: "东京 (UTC+9)" },
  { value: "Asia/Singapore", label: "新加坡 (UTC+8)" },
  { value: "Asia/Kolkata", label: "印度 (UTC+5:30)" },
  { value: "Europe/London", label: "伦敦" },
  { value: "Europe/Berlin", label: "柏林" },
  { value: "America/New_York", label: "纽约" },
  { value: "America/Los_Angeles", label: "洛杉矶" },
  { value: "Australia/Sydney", label: "悉尼" },
];

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;
  const next = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  formatterCache.set(timeZone, next);
  return next;
}

export function getZonedParts(ms: number, timeZone: string): ZonedParts {
  const parts = formatter(timeZone).formatToParts(new Date(ms));
  const pick = (type: Intl.DateTimeFormatPartTypes): number => {
    const found = parts.find((part) => part.type === type);
    return found ? Number(found.value) : 0;
  };
  return {
    y: pick("year"),
    mo: pick("month"),
    d: pick("day"),
    h: pick("hour"),
    mi: pick("minute"),
    s: pick("second"),
  };
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(ms: number, timeZone: string, withSeconds = true): string {
  if (!Number.isFinite(ms)) return "-";
  const p = getZonedParts(ms, timeZone);
  const date = `${p.y}-${pad2(p.mo)}-${pad2(p.d)}`;
  const time = withSeconds ? `${pad2(p.h)}:${pad2(p.mi)}:${pad2(p.s)}` : `${pad2(p.h)}:${pad2(p.mi)}`;
  return `${date} ${time}`;
}

/** 该时区在这一时刻相对 UTC 的偏移（分钟） */
export function timeZoneOffsetMinutes(ms: number, timeZone: string): number {
  const p = getZonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
  return Math.round((asUtc - ms) / 60000);
}

export function formatOffset(ms: number, timeZone: string): string {
  const offset = timeZoneOffsetMinutes(ms, timeZone);
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return `UTC${sign}${pad2(hours)}:${pad2(minutes)}`;
}

/** 把某时区的“墙上时间”转成真实时间戳（带两次偏移校正，能处理 DST） */
export function zonedTimeToMs(wall: ZonedParts, timeZone: string): number {
  const target = Date.UTC(wall.y, wall.mo - 1, wall.d, wall.h, wall.mi, wall.s);
  let ts = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actualParts = getZonedParts(ts, timeZone);
    const actual = Date.UTC(
      actualParts.y,
      actualParts.mo - 1,
      actualParts.d,
      actualParts.h,
      actualParts.mi,
      actualParts.s,
    );
    const diff = target - actual;
    if (diff === 0) break;
    ts += diff;
  }
  return ts;
}

/** 解析 <input type="datetime-local"> 的值 */
export function parseDateTimeLocal(value: string): ZonedParts | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;
  const parts: ZonedParts = {
    y: Number(match[1]),
    mo: Number(match[2]),
    d: Number(match[3]),
    h: Number(match[4]),
    mi: Number(match[5]),
    s: Number(match[6] ?? "0"),
  };
  if (!Number.isFinite(parts.y) || !Number.isFinite(parts.mo) || !Number.isFinite(parts.d)) return null;
  return parts;
}

/** 当前时区的 yyyy-MM-ddTHH:mm */
export function toDateTimeLocalValue(ms: number, timeZone: string): string {
  const p = getZonedParts(ms, timeZone);
  return `${p.y}-${pad2(p.mo)}-${pad2(p.d)}T${pad2(p.h)}:${pad2(p.mi)}`;
}

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Shanghai";
  } catch {
    return "Asia/Shanghai";
  }
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    formatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function weekday(ms: number, timeZone: string): string {
  const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const p = getZonedParts(ms, timeZone);
  const day = new Date(Date.UTC(p.y, p.mo - 1, p.d)).getUTCDay();
  return names[day] ?? "";
}

/** 距离现在多久：用于“刚刚 / 3 分钟前” */
export function humanizeDelta(ms: number): string {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  if (abs < 5000) return "刚刚";
  if (abs < 60000) return `${Math.round(abs / 1000)} 秒${diff > 0 ? "前" : "后"}`;
  if (abs < 3600000) return `${Math.round(abs / 60000)} 分钟${diff > 0 ? "前" : "后"}`;
  if (abs < 86400000) return `${Math.round(abs / 3600000)} 小时${diff > 0 ? "前" : "后"}`;
  return `${Math.round(abs / 86400000)} 天${diff > 0 ? "前" : "后"}`;
}
