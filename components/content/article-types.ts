/**
 * 文章列表卡片使用的精简类型。
 * 列表/筛选是客户端组件，只传渲染所需字段，不把整篇 HTML 塞进浏览器包。
 */
export type ArticleCard = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  tags: string[];
  readingTime: number;
};

export type ArticleTagCount = { tag: string; count: number };
