"use client";

import { TOOL_COMPONENTS } from "./registry";
import { Notice } from "./ui";

/** 根据 slug 渲染对应工具；页面只负责传 slug，工具组件全部在客户端运行。 */
export function ToolRunner({ slug }: { slug: string }) {
  const Component = TOOL_COMPONENTS[slug];
  if (!Component) {
    return (
      <Notice tone="error">
        这个工具还没有准备好，请返回工具箱选择其他工具。
      </Notice>
    );
  }
  return <Component />;
}
