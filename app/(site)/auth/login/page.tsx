import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { PageHeader } from "@/components/ui/section-heading";
import { AuthPanel } from "@/components/user/auth-panel";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "登录 / 注册",
  description: "块集 BlockSet 账号：邮箱登录或注册，注册会把当前匿名身份升级为邮箱账号并保留已有数据。",
};

export default async function LoginPage() {
  const viewer = await getViewer();

  return (
    <>
      <PageHeader
        eyebrow="ACCOUNT"
        title="登录 / 注册"
        icon={<Icon name="lock" size={26} />}
        desc="登录不是必须的：匿名访问也能用待办和已安排。绑定邮箱后，数据会跟着账号走。"
        actions={
          <Link href="/user/todo" className="btn btn-sm">
            <Icon name="check" size={14} />
            先去用待办
          </Link>
        }
      />
      <div className="shell py-8 md:py-10">
        <AuthPanel viewer={viewer} />
      </div>
    </>
  );
}
