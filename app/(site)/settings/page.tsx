import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AppearancePanel } from "@/components/user/appearance-panel";
import { SettingsPanel } from "@/components/user/settings-panel";
import { getViewer } from "@/lib/auth";
import { scheduleCounts } from "@/lib/schedules";
import { THEME_COOKIE, normalizeTheme } from "@/lib/theme";
import { todoCounts } from "@/lib/todos";

export const metadata: Metadata = {
  title: "设置",
  description: "块集 BlockSet 设置：昵称、账号类型、桌面外观、待办数据导出与清空、本地列表偏好。",
};

export default async function SettingsPage() {
  const viewer = await getViewer();
  const counts = todoCounts(viewer.id);
  const schedules = scheduleCounts(viewer.id);
  const store = await cookies();
  const theme = normalizeTheme(store.get(THEME_COOKIE)?.value);

  return (
    <>
      <PageHeader
        eyebrow="SETTINGS"
        title="设置"
        icon={<Icon name="settings" size={26} />}
        desc="账号、桌面外观与本地偏好。这里的改动只影响当前身份的数据。"
        actions={
          <>
            <Link href="/user/todo" className="btn btn-sm">
              <Icon name="check" size={14} />
              待办清单
            </Link>
            <Link href="/user/todo/analysis" className="btn btn-sm btn-ink">
              <Icon name="calc" size={14} />
              待办分析
            </Link>
          </>
        }
      />
      <div className="shell space-y-5 py-8 md:py-10">
        <AppearancePanel initialTheme={theme} />
        <SettingsPanel viewer={viewer} counts={counts} scheduleTotal={schedules.total} />
      </div>
    </>
  );
}
