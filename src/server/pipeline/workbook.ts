import type { Video } from "@prisma/client";
import { extractKeySentences } from "./text";

export function generateWorkbookMarkdown(args: {
  video: Video;
  cleanedTranscript: string;
}) {
  const { video, cleanedTranscript } = args;
  const key = extractKeySentences(cleanedTranscript, 12);
  const summary = key.slice(0, 3).join(" ");

  const md = [
    `# ${video.title}`,
    ``,
    `Выжимка из видео (черновик генерации).`,
    ``,
    `- YouTube ID: \`${video.youtubeVideoId}\``,
    video.publishedAt ? `- Дата: ${video.publishedAt.toISOString().slice(0, 10)}` : null,
    video.durationSec ? `- Длительность: ~${Math.round(video.durationSec / 60)} мин` : null,
    ``,
    `## Кратко`,
    ``,
    summary ? summary : `Пока нет данных для краткого резюме.`,
    ``,
    `## Тезисы`,
    ``,
    ...key.slice(0, 10).map((s) => `- ${s}`),
    ``,
    `## Задания`,
    ``,
    `- Сформулируйте 3 главных идеи видео своими словами и примените одну из них сегодня.`,
    `- Выпишите 5 терминов/концепций из видео и найдите по одному примеру на практике.`,
    `- Соберите чек-лист действий из тезисов и оцените, что можно автоматизировать.`,
    ``,
    `## Транскрипт`,
    ``,
    cleanedTranscript,
    ``,
  ]
    .filter((x): x is string => Boolean(x))
    .join("\n");

  return { summary, markdown: md };
}

export function generateWorkbookJson(args: {
  video: Video;
  summary: string;
  cleanedTranscript: string;
  bullets: string[];
}) {
  const { video, summary, cleanedTranscript, bullets } = args;
  return {
    type: "workbook",
    version: 1,
    video: {
      youtubeVideoId: video.youtubeVideoId,
      title: video.title,
      publishedAt: video.publishedAt?.toISOString() ?? null,
      durationSec: video.durationSec ?? null,
    },
    summary,
    bullets,
    transcript: cleanedTranscript,
  };
}

