/** 文本统计：中文字数、英文单词、字符、段落、行数与阅读时长。 */

export type TextStats = {
  chineseChars: number;
  englishWords: number;
  characters: number;
  charactersNoSpaces: number;
  paragraphs: number;
  lines: number;
  punctuation: number;
  readingSeconds: number;
};

const CHINESE_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const ENGLISH_WORD_RE = /[A-Za-z][A-Za-z'’-]*/g;
const PUNCTUATION_RE = /[，。！？；：、“”‘’（）《》〈〉…—,.!?;:'"()[\]{}<>]/g;

/** 中文 350 字/分钟，英文 220 词/分钟 */
export function readingSeconds(chineseChars: number, englishWords: number): number {
  return Math.round((chineseChars / 350 + englishWords / 220) * 60);
}

export function analyzeText(text: string): TextStats {
  const chineseChars = (text.match(CHINESE_RE) ?? []).length;
  const englishWords = (text.match(ENGLISH_WORD_RE) ?? []).length;
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\s/g, "")).length;
  const punctuation = (text.match(PUNCTUATION_RE) ?? []).length;
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean).length;
  const lines = text === "" ? 0 : text.replace(/\r\n?/g, "\n").split("\n").length;

  return {
    chineseChars,
    englishWords,
    characters,
    charactersNoSpaces,
    paragraphs,
    lines,
    punctuation,
    readingSeconds: readingSeconds(chineseChars, englishWords),
  };
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0 秒";
  if (totalSeconds < 60) return `${totalSeconds} 秒`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds === 0 ? `${minutes} 分钟` : `${minutes} 分 ${seconds} 秒`;
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时 ${minutes % 60} 分`;
}
