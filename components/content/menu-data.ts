/**
 * 网址导航的静态数据：只收录常用、稳定、无需登录即可查看的站点。
 * 纯数据文件，客户端搜索组件可以直接引用。
 */
import type { Accent } from "@/lib/accent";
import type { IconKey } from "@/lib/site";

export type MenuSite = {
  name: string;
  url: string;
  desc: string;
};

export type MenuGroup = {
  key: string;
  label: string;
  blurb: string;
  icon: IconKey;
  accent: Accent;
  sites: MenuSite[];
};

export const MENU_GROUPS: MenuGroup[] = [
  {
    key: "dev",
    label: "开发工具",
    blurb: "查文档、查兼容性、找包，写代码时最常打开的几页。",
    icon: "code",
    accent: "blue",
    sites: [
      {
        name: "MDN Web Docs",
        url: "https://developer.mozilla.org/zh-CN/",
        desc: "Web 平台最权威的文档，HTML / CSS / JavaScript 都能在这里查到。",
      },
      {
        name: "GitHub",
        url: "https://github.com/",
        desc: "全球最大的代码托管平台，找开源项目和读源码的第一站。",
      },
      {
        name: "Can I use",
        url: "https://caniuse.com/",
        desc: "查浏览器特性兼容性，做渐进增强前先来这里看一眼。",
      },
      {
        name: "Stack Overflow",
        url: "https://stackoverflow.com/",
        desc: "开发者问答社区，遇到的报错大概率已经有人问过。",
      },
      {
        name: "npm",
        url: "https://www.npmjs.com/",
        desc: "JavaScript 包搜索与版本信息，装依赖前先看维护状态。",
      },
      {
        name: "DevDocs",
        url: "https://devdocs.io/",
        desc: "把几十种技术文档收进一个界面，支持搜索和离线。",
      },
      {
        name: "Tailwind CSS",
        url: "https://tailwindcss.com/docs",
        desc: "工具类 CSS 框架文档，查类名和配置项很快。",
      },
    ],
  },
  {
    key: "design",
    label: "设计资源",
    blurb: "配色、图标、截图与灵感，做界面之前先来逛一圈。",
    icon: "palette",
    accent: "coral",
    sites: [
      {
        name: "Figma",
        url: "https://www.figma.com/",
        desc: "浏览器里的协同设计工具，画原型和整理设计稿都合适。",
      },
      {
        name: "Dribbble",
        url: "https://dribbble.com/",
        desc: "设计师作品社区，适合找视觉风格和细节灵感。",
      },
      {
        name: "Coolors",
        url: "https://coolors.co/",
        desc: "快速生成、锁定与对比调整配色方案，支持导出多种格式。",
      },
      {
        name: "Unsplash",
        url: "https://unsplash.com/",
        desc: "可商用的高质量摄影图库，文章配图与占位图都能用。",
      },
      {
        name: "iconfont",
        url: "https://www.iconfont.cn/",
        desc: "国内常用的图标素材库，支持批量下载与字体图标。",
      },
      {
        name: "Awwwards",
        url: "https://www.awwwards.com/",
        desc: "获奖网站合集，看动效、排版与整站节奏的参考。",
      },
    ],
  },
  {
    key: "read",
    label: "学习阅读",
    blurb: "长文、周刊与开发者社区，通勤路上可以读的东西。",
    icon: "book",
    accent: "mint",
    sites: [
      {
        name: "阮一峰的网络日志",
        url: "https://www.ruanyifeng.com/blog/",
        desc: "中文技术写作的长期主义样本，科技爱好者周刊尤其推荐。",
      },
      {
        name: "少数派",
        url: "https://sspai.com/",
        desc: "关注数字生活与效率工具，适合找软件使用思路。",
      },
      {
        name: "掘金",
        url: "https://juejin.cn/",
        desc: "中文前端与后端技术社区，实践类文章比较多。",
      },
      {
        name: "V2EX",
        url: "https://www.v2ex.com/",
        desc: "开发者社区，独立开发、产品与生活话题都能看到。",
      },
      {
        name: "Hacker News",
        url: "https://news.ycombinator.com/",
        desc: "海外技术圈的信息入口，评论区常有高质量讨论。",
      },
      {
        name: "知乎",
        url: "https://www.zhihu.com/",
        desc: "中文问答社区，适合搜索一个问题的多种视角。",
      },
    ],
  },
  {
    key: "productivity",
    label: "效率服务",
    blurb: "记东西、画图、压图、调正则，日常杂事集中在这里。",
    icon: "settings",
    accent: "violet",
    sites: [
      {
        name: "Notion",
        url: "https://www.notion.so/",
        desc: "文档、表格与数据库混排的笔记工具，适合整理长期资料。",
      },
      {
        name: "Excalidraw",
        url: "https://excalidraw.com/",
        desc: "手绘风格的在线白板，画架构草图和流程很快。",
      },
      {
        name: "TinyPNG",
        url: "https://tinypng.com/",
        desc: "在线压缩 PNG / JPEG，上传前先看看体积能降多少。",
      },
      {
        name: "Squoosh",
        url: "https://squoosh.app/",
        desc: "Google 出品的图片压缩对比工具，可调编码参数并预览效果。",
      },
      {
        name: "Carbon",
        url: "https://carbon.now.sh/",
        desc: "把代码截图成漂亮的图片，分享片段时很省事。",
      },
      {
        name: "Regex101",
        url: "https://regex101.com/",
        desc: "正则表达式调试器，实时解释匹配过程并给出测试用例。",
      },
      {
        name: "DeepL",
        url: "https://www.deepl.com/translator",
        desc: "翻译长句和文档的常用工具，术语一致性比机翻好一些。",
      },
    ],
  },
];

export const MENU_TOTAL = MENU_GROUPS.reduce((sum, group) => sum + group.sites.length, 0);
