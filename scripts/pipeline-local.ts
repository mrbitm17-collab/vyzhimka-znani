/**
 * Пакетный пайплайн для локальных транскрипций
 *
 * Сканирует папку «Знания по курсору» (или другую через --folder),
 * находит все .txt файлы и для каждого:
 *   1. Читает текст транскрипции
 *   2. Очищает и нарезает на сегменты
 *   3. Генерирует Markdown-выжимку (.md рядом с .txt)
 *   4. Сохраняет Video + Transcript + Segment + Workbook в PostgreSQL
 *
 * Соглашение по именованию файлов:
 *   "dQw4w9WgXcQ - Название видео.txt"  →  YouTube ID + название
 *   "Название видео.txt"                →  только название, ID = local_<хэш>
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/server/db";
import {
  cleanTranscript,
  extractKeySentences,
  splitIntoSegments,
} from "../src/server/pipeline/text";

// ─── Константы ────────────────────────────────────────────────────────────────

const DEFAULT_FOLDER = path.resolve(
  __dirname,
  "../../Знания по курсору",
);

const LOCAL_CHANNEL_ID = "local";
const LOCAL_CHANNEL_TITLE = "Локальные транскрипции";

// YouTube video ID: ровно 11 символов (буквы, цифры, - _)
const YT_ID_RE = /^([A-Za-z0-9_-]{11})\s+-\s+(.+)$/;

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function getArg(name: string): string | null {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

/** Простой детерминированный хэш строки → 8 hex-символов */
function shortHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** Разбирает имя файла на { youtubeVideoId, title } */
function parseFileName(name: string): { youtubeVideoId: string; title: string } {
  const base = path.basename(name, ".txt");
  const match = YT_ID_RE.exec(base);
  if (match) {
    return { youtubeVideoId: match[1], title: match[2].trim() };
  }
  return { youtubeVideoId: `local_${shortHash(base)}`, title: base };
}

/** Генерирует Markdown-выжимку без Prisma-объекта */
function buildMarkdown(args: {
  title: string;
  youtubeVideoId: string;
  cleanedTranscript: string;
}): { summary: string; markdown: string } {
  const { title, youtubeVideoId, cleanedTranscript } = args;
  const key = extractKeySentences(cleanedTranscript, 12);
  const summary = key.slice(0, 3).join(" ");
  const isLocal = youtubeVideoId.startsWith("local_");

  const lines: string[] = [
    `# ${title}`,
    ``,
    `Выжимка (сгенерировано автоматически из локального транскрипта).`,
    ``,
    isLocal
      ? `- Источник: локальный файл`
      : `- YouTube: https://youtube.com/watch?v=${youtubeVideoId}`,
    ``,
    `## Кратко`,
    ``,
    summary || `Недостаточно данных для краткого резюме.`,
    ``,
    `## Тезисы`,
    ``,
    ...key.slice(0, 10).map((s) => `- ${s}`),
    ``,
    `## Задания`,
    ``,
    `- Сформулируйте 3 главных идеи своими словами и примените одну из них сегодня.`,
    `- Выпишите 5 ключевых терминов/концепций и найдите примеры применения.`,
    `- Составьте чек-лист действий из тезисов и отметьте, что можно автоматизировать.`,
    ``,
    `## Транскрипт`,
    ``,
    cleanedTranscript,
    ``,
  ];

  return { summary, markdown: lines.join("\n") };
}

// ─── Основная логика ──────────────────────────────────────────────────────────

async function ensureLocalChannel(): Promise<string> {
  const existing = await prisma.channel.findUnique({
    where: { youtubeChannelId: LOCAL_CHANNEL_ID },
  });
  if (existing) return existing.id;

  const created = await prisma.channel.create({
    data: {
      youtubeChannelId: LOCAL_CHANNEL_ID,
      title: LOCAL_CHANNEL_TITLE,
    },
  });
  console.log(`  ✓ Создан локальный канал (id=${created.id})`);
  return created.id;
}

async function processFile(
  filePath: string,
  localChannelId: string,
): Promise<void> {
  const { youtubeVideoId, title } = parseFileName(filePath);

  console.log(`\n▶ ${path.basename(filePath)}`);
  console.log(`  title:          ${title}`);
  console.log(`  youtubeVideoId: ${youtubeVideoId}`);

  const raw = await fs.readFile(filePath, "utf8");
  const cleaned = cleanTranscript(raw);

  // 1. Video (upsert)
  const video = await prisma.video.upsert({
    where: { youtubeVideoId },
    create: { youtubeVideoId, channelId: localChannelId, title },
    update: { title },
  });

  // 2. Transcript (upsert)
  await prisma.transcript.upsert({
    where: { videoId: video.id },
    create: {
      videoId: video.id,
      source: "manual",
      rawText: raw,
      cleanedText: cleaned,
    },
    update: {
      source: "manual",
      rawText: raw,
      cleanedText: cleaned,
    },
  });

  // 3. Сегменты (пересоздать)
  await prisma.segment.deleteMany({ where: { videoId: video.id } });
  const segs = splitIntoSegments(cleaned, { maxChars: 900 });
  await prisma.segment.createMany({
    data: segs.map((text) => ({ videoId: video.id, text })),
  });
  console.log(`  сегментов: ${segs.length}`);

  // 4. Выжимка (upsert)
  const { summary, markdown } = buildMarkdown({ title, youtubeVideoId, cleanedTranscript: cleaned });
  const bullets = extractKeySentences(cleaned, 10);
  const json = {
    type: "workbook",
    version: 1,
    video: { youtubeVideoId, title },
    summary,
    bullets,
    transcript: cleaned,
  };

  const workbook = await prisma.workbook.upsert({
    where: { videoId: video.id },
    create: { videoId: video.id, title, summary, markdown, json },
    update: { title, summary, markdown, json },
  });
  console.log(`  workbook id:    ${workbook.id}`);

  // 5. Сохранить .md файл рядом с .txt
  const mdPath = filePath.replace(/\.txt$/i, ".md");
  await fs.writeFile(mdPath, markdown, "utf8");
  console.log(`  ✓ Сохранён: ${path.basename(mdPath)}`);
}

async function main() {
  const folderArg = getArg("folder");
  const folder = folderArg ? path.resolve(folderArg) : DEFAULT_FOLDER;

  console.log(`\n📂 Папка: ${folder}`);

  let entries: string[];
  try {
    const dir = await fs.readdir(folder);
    entries = dir
      .filter((f) => f.toLowerCase().endsWith(".txt"))
      .map((f) => path.join(folder, f));
  } catch {
    throw new Error(`Папка не найдена или недоступна: ${folder}`);
  }

  if (entries.length === 0) {
    console.log("  Нет .txt файлов для обработки.");
    return;
  }

  console.log(`  Найдено файлов: ${entries.length}`);

  const localChannelId = await ensureLocalChannel();

  let ok = 0;
  let fail = 0;

  for (const filePath of entries) {
    try {
      await processFile(filePath, localChannelId);
      ok++;
    } catch (e) {
      console.error(`  ✗ Ошибка: ${path.basename(filePath)}`, e);
      fail++;
    }
  }

  console.log(`\n✅ Готово: обработано ${ok}, ошибок ${fail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
