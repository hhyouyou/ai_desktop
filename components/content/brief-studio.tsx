"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { BriefPayload } from "@/lib/brief";
import { aiHeaders, hasLocalKey, loadAiSettings } from "@/lib/ai/settings";
import { formatDate } from "@/lib/utils";

type Props = {
  initialBrief: BriefPayload | null;
  selectedDate: string;
  today: string;
  aiConfigured: boolean;
  /** 今天还没有简报、或热榜比简报新时为 true：挂载后自动生成一次 */
  autoGenerate: boolean;
};

type BriefApiResponse =
  | { ok: true; data: { brief: BriefPayload; warning: string | null; skipped?: boolean } }
  | { ok: false; error: string };

type Mainline = BriefPayload["mainlines"][number];
type MustRead = BriefPayload["mustRead"][number];

const MAINLINE_ACCENTS = ["bg-coral text-white", "bg-blue text-white", "bg-mint text-ink"];

function MainlineCard({ item, index }: { item: Mainline; index: number }) {
  return (
    <section className="relative rounded-[22px] edge bg-paper p-4 shadow-hard-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] edge font-[family-name:var(--font-display)] text-[15px] ${
            MAINLINE_ACCENTS[index % MAINLINE_ACCENTS.length]
          }`}
        >
          0{index + 1}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15.5px] font-extrabold leading-snug">{item.title}</h3>
          <div className="prose-blockset mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            <p>{item.detail}</p>
          </div>
          {item.sources.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.sources.map((source) => (
                <span key={source} className="tag px-2 py-0.5 text-[10px]">
                  {source}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MustReadRow({ item }: { item: MustRead }) {
  const content = (
    <>
      <span className="tag tag-sun shrink-0 px-2 py-0.5 text-[10px]">{item.source}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-extrabold leading-snug">{item.title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-soft">{item.reason}</span>
      </span>
      {item.url ? (
        <Icon name="arrow" size={14} className="mt-1 shrink-0 -rotate-45 text-ink-soft" />
      ) : null}
    </>
  );

  if (!item.url) {
    return <div className="flex items-start gap-2.5 border-b-2 border-dashed border-ink/10 py-2.5 last:border-0">{content}</div>;
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2.5 border-b-2 border-dashed border-ink/10 py-2.5 transition-colors last:border-0 hover:bg-cream/60"
    >
      {content}
    </a>
  );
}

function NewsItem({ item }: { item: NonNullable<BriefPayload["news"]>[number] }) {
  const date = item.publishedAt ? new Date(item.publishedAt) : null;
  return (
    <article className="border-b-2 border-dashed border-ink/10 py-3 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 text-[10.5px] text-ink-soft">
        <span className="tag tag-sun px-2 py-0.5 text-[10px]">{item.siteName ?? "权威来源"}</span>
        <span>权威度 {item.authority >= 3 ? `${item.authority}/4 · 高` : `${item.authority}/4`}</span>
        {date && !Number.isNaN(date.getTime()) ? (
          <span>
            {formatDate(date.getTime(), true).slice(0, 10)}
            {date.getHours() || date.getMinutes() ? ` ${formatDate(date.getTime(), true).slice(11, 16)}` : ""}
          </span>
        ) : null}
      </div>
      <h3 className="mt-1.5 text-[14.5px] font-extrabold leading-snug">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-coral hover:underline"
        >
          {item.title}
        </a>
      </h3>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-soft">{item.summary}</p>
      {item.keyPoints.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {item.keyPoints.map((point) => (
            <li key={point} className="flex items-start gap-2 text-[12px] leading-relaxed">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-coral" aria-hidden="true" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold text-coral underline decoration-dashed underline-offset-2"
      >
        查看原文
        <Icon name="arrow" size={12} className="-rotate-45" />
      </a>
    </article>
  );
}

function BriefContent({ brief }: { brief: BriefPayload }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-[16px] edge-2 bg-cream/60 px-3 py-2 text-[11.5px] text-ink-soft">
        <span className="tag tag-sun px-2 py-0.5 text-[10px]">{brief.date}</span>
        {brief.demo ? (
          <span className="tag px-2 py-0.5 text-[10px]">模板生成 · 演示模式</span>
        ) : (
          <span className="tag tag-mint px-2 py-0.5 text-[10px]">AI 生成</span>
        )}
        {brief.model ? <span>模型 {brief.model}</span> : null}
        <span className="ml-auto">
          来源 {brief.stats.sources} 个 · 条目 {brief.stats.items} 条 · 实时 {brief.stats.liveSources} 个
        </span>
      </div>

      {brief.demo ? (
        <div className="rounded-[18px] edge bg-sun/80 p-3.5 text-[12.5px] leading-relaxed">
          <span className="tag tag-ink mr-2">演示模式</span>
          这份简报由模板规则生成，没有调用任何模型。到{" "}
          <Link href="/ai/app/settings" className="font-extrabold underline decoration-[3px] underline-offset-2">
            模型设置
          </Link>{" "}
          配置接口后重新生成，就会改用模型整理。
        </div>
      ) : null}

      {brief.dataMode === "sample" ? (
        <div className="rounded-[18px] edge/30 bg-cream/70 p-3.5 text-[12px] leading-relaxed text-ink-soft">
          注意：所有来源当前都是示例数据，这份简报反映的是示例榜单。到每日热点页接入{" "}
          <code className="font-[family-name:var(--font-mono)] text-[11px]">HOT_API_BASE</code>{" "}
          并刷新后，再生成才会反映真实热榜。
        </div>
      ) : null}

      <section className="surface-tight p-4 sm:p-5">
        <p className="eyebrow">Keywords</p>
        <h2 className="mt-1 text-[17px] font-extrabold">今日关键词</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {brief.keywords.map((keyword) => (
            <span key={keyword} className="tag tag-sun px-3 py-1 text-[12.5px]">
              #{keyword}
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2.5 flex items-end justify-between">
          <div>
            <p className="eyebrow">Mainlines</p>
            <h2 className="mt-1 text-[18px] font-extrabold">3 条主线</h2>
          </div>
          <span className="tag px-2 py-0.5 text-[10px]">{brief.mainlines.length} 条</span>
        </div>
        <div className="space-y-3">
          {brief.mainlines.map((item, index) => (
            <MainlineCard key={`${item.title}-${index}`} item={item} index={index} />
          ))}
        </div>
      </section>

      <section className="surface-tight p-4 sm:p-5">
        <div className="mb-1 flex items-end justify-between">
          <div>
            <p className="eyebrow">Worth Reading</p>
            <h2 className="mt-1 text-[18px] font-extrabold">值得一读</h2>
          </div>
          <span className="tag px-2 py-0.5 text-[10px]">{brief.mustRead.length} 条</span>
        </div>
        {brief.mustRead.length > 0 ? (
          <div>
            {brief.mustRead.map((item) => (
              <MustReadRow key={`${item.source}-${item.title}`} item={item} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-soft">今天没有特别挑出来的条目，扫一遍热榜即可。</p>
        )}
      </section>

      {brief.news && brief.news.length > 0 ? (
        <section className="surface-tight p-4 sm:p-5">
          <div className="mb-1 flex items-end justify-between">
            <div>
              <p className="eyebrow">Deep Dive</p>
              <h2 className="mt-1 text-[18px] font-extrabold">重点新闻 · 权威来源</h2>
            </div>
            <span className="tag tag-mint px-2 py-0.5 text-[10px]">{brief.news.length} 条</span>
          </div>
          <p className="mb-2 text-[11.5px] leading-relaxed text-ink-soft">
            沿主线用 DeepSeek 网页搜索找出权威报道，抓取正文后生成简述；链接可点开原文核对。
          </p>
          <div>
            {brief.news.map((item) => (
              <NewsItem key={`${item.siteName}-${item.title}`} item={item} />
            ))}
          </div>
          <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
            来源筛选：站点权威度（authority ≥ 2）或权威媒体白名单；简述仅依据抓取到的正文，不由模型补充事实。
          </p>
        </section>
      ) : brief.newsMeta?.message ? (
        <p className="rounded-[14px] edge-2 bg-cream/60 px-3 py-2 text-[11.5px] leading-relaxed text-ink-soft">
          重点新闻：{brief.newsMeta.message}
        </p>
      ) : null}

      <section className="rounded-[24px] edge bg-sun p-5 shadow-hard-sm">
        <p className="eyebrow text-ink/60">TL;DR</p>
        <h2 className="mt-1 text-[18px] font-extrabold">一句话总结</h2>
        <div className="prose-blockset mt-2.5 text-[15px] font-semibold leading-relaxed text-ink">
          <p>{brief.summary}</p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-ink-soft">
        <span>生成时间 {formatDate(brief.generatedAt, true)}</span>
        <span>{brief.demo ? "模板规则 · 无网络请求" : `模型 ${brief.model ?? "AI"}`}</span>
      </div>
    </div>
  );
}

export function BriefStudio({
  initialBrief,
  selectedDate,
  today,
  aiConfigured,
  autoGenerate,
}: Props) {
  const router = useRouter();
  const [brief, setBrief] = useState<BriefPayload | null>(initialBrief);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [autoTried, setAutoTried] = useState(false);
  const [localConfigured, setLocalConfigured] = useState(false);
  const isToday = selectedDate === today;
  const configured = aiConfigured || localConfigured;
  const generatingRef = useRef(false);

  async function generate(options?: { auto?: boolean }) {
    if (generatingRef.current || !isToday) return;
    generatingRef.current = true;
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/brief${options?.auto ? "?auto=1" : ""}`, {
        method: "POST",
        // 设置页存在浏览器里的模型配置，通过 X-AI-* 头带给服务端
        headers: aiHeaders(loadAiSettings()),
      });
      const json = (await response.json()) as BriefApiResponse;
      if (!response.ok || !json.ok) {
        throw new Error(json.ok ? "生成失败，请稍后重试" : json.error);
      }
      setBrief(json.data.brief);
      setNotice(json.data.warning);
      if (!json.data.skipped) router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成失败，请稍后重试");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }

  useEffect(() => {
    setLocalConfigured(hasLocalKey(loadAiSettings()));
  }, []);

  // 每天首次打开 / 热榜有更新时自动生成一次（服务端 30 分钟内会跳过重复调用）
  useEffect(() => {
    if (!autoGenerate || !isToday || autoTried) return;
    setAutoTried(true);
    void generate({ auto: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, isToday, autoTried]);

  return (
    <div>
      <div className="surface-tight flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div>
          <p className="eyebrow">Daily Brief</p>
          <h2 className="mt-1 text-[18px] font-extrabold">{selectedDate} 的简报</h2>
          <p className="mt-1 max-w-[460px] text-[12px] leading-relaxed text-ink-soft">
            {configured
              ? "已配置模型（本地设置或环境变量）：将调用 OpenAI 兼容接口整理，失败会自动降级为模板。每天首次打开会自动生成一版。"
              : "未配置模型：用模板规则生成，并在页面上标注演示模式。每天首次打开会自动生成一版。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isToday ? (
            <Link href="/daily-brief" className="btn btn-sm">
              回到今日
            </Link>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void generate()}
            disabled={generating || !isToday}
            aria-busy={generating}
            title={isToday ? "用缓存的 8 个来源生成今日简报" : "只能为今天生成新简报"}
          >
            <Icon
              name={generating ? "clock" : "spark"}
              size={14}
              className={generating ? "animate-spin" : undefined}
            />
            {generating ? "生成中…" : brief ? "重新生成今日简报" : "生成今日简报"}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="mt-3 flex items-center gap-2 rounded-[14px] border-2 border-dashed border-ink/25 bg-cream/60 px-3 py-2.5 text-[12px] font-bold text-ink-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-coral" />
          正在汇总 8 个来源的前 5 条数据并整理结构，请稍候…
        </div>
      ) : null}

      {notice ? (
        <div className="mt-3 rounded-[14px] edge-2 bg-cream px-3 py-2.5 text-[12px] leading-relaxed">
          <span className="font-extrabold">提示：</span>
          {notice}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center gap-3 rounded-[14px] edge border-coral bg-coral/10 px-3 py-2.5"
        >
          <p className="flex-1 text-[12.5px] font-bold">{error}</p>
          <button type="button" className="btn btn-sm" onClick={() => void generate()} disabled={generating}>
            重试
          </button>
        </div>
      ) : null}

      {brief ? (
        <div className="mt-4">
          <BriefContent brief={brief} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[24px] edge border-dashed border-ink/40 bg-cream/50 px-6 py-14 text-center">
          <Icon name="text" size={30} className="text-ink-soft" />
          <p className="mt-3 text-[15px] font-extrabold">
            {isToday ? "今天还没有简报" : `${selectedDate} 没有简报记录`}
          </p>
          <p className="mt-1.5 max-w-[420px] text-[12.5px] leading-relaxed text-ink-soft">
            {isToday
              ? "点上面的按钮，会用本地缓存的 8 个来源热榜生成一份结构化摘要。没有配置模型也能生成，只是会标注演示模式。"
              : "只有今天可以生成新简报，可以回到今日，或者从右侧历史记录里挑一期看看。"}
          </p>
          {isToday ? (
            <button
              type="button"
              className="btn btn-sm btn-primary mt-5"
              onClick={() => void generate()}
              disabled={generating}
            >
              <Icon name="spark" size={14} />
              生成今日简报
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
