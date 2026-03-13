import type { Channel, Video } from "@prisma/client";
import type { CaptionSegment } from "../captions";
import {
  extractTheses,
  extractQuotes,
  generateTasks,
  type Thesis,
  type Quote,
  type Task,
} from "./text";

export type WorkbookData = {
  type: "workbook";
  version: 2;
  video: {
    youtubeVideoId: string;
    title: string;
    publishedAt: string | null;
    durationSec: number | null;
    channel: string;
    speaker: string;
  };
  tldr: string;          // 3-5 предложений — "смотреть или нет"
  summary: string;       // первые 3 тезиса соединённых
  theses: Thesis[];      // { n, title, body, startSec? }
  tasks: Task[];
  quotes: Quote[];
  transcript: string;
};

export function generateWorkbookData(args: {
  video: Video & { channel: Channel };
  cleanedTranscript: string;
  captions?: CaptionSegment[];
}): WorkbookData {
  const { video, cleanedTranscript, captions } = args;

  const captionTimestamps = captions?.map((c) => ({ text: c.text, offsetMs: c.offset }));
  const theses = extractTheses(cleanedTranscript, 12, captionTimestamps);
  const tasks = generateTasks(theses, cleanedTranscript);
  const quotes = extractQuotes(cleanedTranscript, video.channel.title, 7);

  const summary = theses.slice(0, 3).map((t) => t.body).join(" ");

  // TL;DR: 3 самых важных тезиса в виде коротких предложений
  const tldr = theses
    .slice(0, 3)
    .map((t) => t.body.split(".")[0].trim() + ".")
    .filter((s) => s.length > 10)
    .join(" ");

  return {
    type: "workbook",
    version: 2,
    video: {
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      publishedAt: video.publishedAt?.toISOString() ?? null,
      durationSec: video.durationSec ?? null,
      channel: video.channel.title,
      speaker: video.channel.title,
    },
    tldr,
    summary,
    theses,
    tasks,
    quotes,
    transcript: cleanedTranscript,
  };
}

export function generateWorkbookMarkdown(data: WorkbookData): string {
  const { video, summary, theses, tasks, quotes, transcript } = data;
  const isLocal = video.youtubeVideoId.startsWith("local_");

  const lines: (string | null)[] = [
    `# ${video.title}`,
    ``,
    `## Метаданные`,
    ``,
    isLocal
      ? `- Источник: локальный файл`
      : `- YouTube: https://www.youtube.com/watch?v=${video.youtubeVideoId}`,
    video.durationSec
      ? `- Длительность: ${formatDuration(video.durationSec)}`
      : null,
    `- Канал: ${video.channel}`,
    `- Спикер: ${video.speaker}`,
    video.publishedAt
      ? `- Дата: ${new Date(video.publishedAt).toLocaleDateString("ru-RU")}`
      : null,
    ``,
    `## Кратко`,
    ``,
    summary || "Нет данных.",
    ``,
    `## Ключевые тезисы`,
    ``,
    ...theses.flatMap((t) => [
      `${t.n}. **${t.title}** — ${t.body}`,
      ``,
    ]),
    `## Практические задания`,
    ``,
    ...tasks.flatMap((t) => [
      `### Задание ${t.n}: ${t.title}`,
      ``,
      `Цель: ${t.goal}`,
      ``,
    ]),
    `## Ключевые цитаты`,
    ``,
    ...quotes.flatMap((q) => [
      `> «${q.text}»`,
      `> — ${q.speaker}`,
      ``,
    ]),
    `## Транскрипт`,
    ``,
    transcript,
    ``,
  ];

  return lines.filter((x): x is string => x !== null).join("\n");
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── Устаревшие функции — оставлены для совместимости ────────────────────────

export function generateWorkbookJson(args: {
  video: Video;
  summary: string;
  cleanedTranscript: string;
  bullets: string[];
}) {
  return {
    type: "workbook",
    version: 1,
    video: {
      youtubeVideoId: args.video.youtubeVideoId,
      title: args.video.title,
      publishedAt: args.video.publishedAt?.toISOString() ?? null,
      durationSec: args.video.durationSec ?? null,
    },
    summary: args.summary,
    bullets: args.bullets,
    transcript: args.cleanedTranscript,
  };
}
