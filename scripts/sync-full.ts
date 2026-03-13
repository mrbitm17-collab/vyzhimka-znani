/**
 * Полный авто-пайплайн для YouTube-канала:
 *   1. Синхронизация канала + видео (YouTube Data API)
 *   2. Получение субтитров (бесплатно, без API-ключа)
 *   3. Перевод в русский, если субтитры не на русском
 *   4. Сохранение .txt транскрипции в папку «Транскрибирование видео»
 *   5. Генерация выжимки (тезисы + задания + цитаты)
 *   6. Запись в PostgreSQL (Transcript + Segment + Workbook)
 *
 * Использование:
 *   npm run sync:full -- --channelId UCxxxx
 *   npm run sync:full -- --channelId UCxxxx --limit 10   (первые N видео)
 *   npm run sync:full -- --videoId dQw4w9WgXcQ           (одно видео)
 *   npm run sync:full -- --channelId UCxxxx --no-translate  (без перевода)
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/server/db";
import {
  fetchChannel,
  fetchVideos,
  listUploadsPlaylistVideoIds,
  parseIsoDurationToSeconds,
} from "../src/server/youtube";
import { fetchCaptions, captionsToText } from "../src/server/captions";
import { cleanTranscript, splitIntoSegments } from "../src/server/pipeline/text";
import { translateToRussian, isRussian } from "../src/server/translate";
import {
  generateWorkbookData,
  generateWorkbookMarkdown,
} from "../src/server/pipeline/workbook";

const TRANSCRIPTS_DIR = path.resolve(
  __dirname,
  "../../Транскрибирование видео",
);

function getArg(name: string): string | null {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function getFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function saveTranscriptFile(
  videoId: string,
  title: string,
  raw: string,
): Promise<void> {
  await ensureDir(TRANSCRIPTS_DIR);
  const safe = title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80);
  const filename = `${videoId} - ${safe}.txt`;
  const filepath = path.join(TRANSCRIPTS_DIR, filename);
  await fs.writeFile(filepath, raw, "utf8");
  console.log(`    📄 Транскрипция: ${filename}`);
}

let noTranslate = false; // устанавливается в main()

async function processVideo(
  youtubeVideoId: string,
  skipExisting: boolean,
): Promise<"ok" | "no_captions" | "skipped" | "error"> {
  try {
    const video = await prisma.video.findUnique({
      where: { youtubeVideoId },
      include: { channel: true },
    });
    if (!video) return "error";

    // Пропустить видео с уже готовой выжимкой
    if (skipExisting) {
      const existing = await prisma.workbook.findUnique({
        where: { videoId: video.id },
      });
      if (existing) {
        console.log(`  ⏭  ${video.title.slice(0, 60)} — уже обработано`);
        return "skipped";
      }
    }

    console.log(`\n  ▶ ${video.title.slice(0, 70)}`);

    // 1. Получить субтитры
    console.log(`    Загружаем субтитры...`);
    const captions = await fetchCaptions(youtubeVideoId);
    if (!captions?.length) {
      console.log(`    ⚠  Субтитры недоступны`);
      return "no_captions";
    }

    const raw = captionsToText(captions);
    let cleaned = cleanTranscript(raw);
    console.log(`    Текст: ${cleaned.length} символов`);

    // 2. Перевод в русский (если нужно)
    if (!noTranslate && !isRussian(cleaned)) {
      console.log(`    🌐 Переводим в русский...`);
      cleaned = await translateToRussian(cleaned);
      console.log(`    Переведено: ${cleaned.length} символов`);
    }

    // 3. Сохранить .txt
    await saveTranscriptFile(youtubeVideoId, video.title, cleaned);

    // 4. Transcript в БД
    await prisma.transcript.upsert({
      where: { videoId: video.id },
      create: { videoId: video.id, source: "youtube_captions", rawText: raw, cleanedText: cleaned, language: "ru" },
      update: { source: "youtube_captions", rawText: raw, cleanedText: cleaned, language: "ru" },
    });

    // 5. Сегменты
    await prisma.segment.deleteMany({ where: { videoId: video.id } });
    const segs = splitIntoSegments(cleaned, { maxChars: 900 });
    await prisma.segment.createMany({
      data: segs.map((text) => ({ videoId: video.id, text })),
    });
    console.log(`    Сегментов: ${segs.length}`);

    // 6. Выжимка (передаём субтитры для привязки тезисов к таймстампам)
    const data = generateWorkbookData({ video: video as any, cleanedTranscript: cleaned, captions });
    const markdown = generateWorkbookMarkdown(data);

    await prisma.workbook.upsert({
      where: { videoId: video.id },
      create: {
        videoId: video.id,
        title: video.title,
        summary: data.summary,
        markdown,
        json: data as any,
      },
      update: {
        title: video.title,
        summary: data.summary,
        markdown,
        json: data as any,
      },
    });

    console.log(
      `    ✓ Выжимка: ${data.theses.length} тезисов · ${data.tasks.length} заданий · ${data.quotes.length} цитат`,
    );
    return "ok";
  } catch (e) {
    console.error(`    ✗ Ошибка:`, e);
    return "error";
  }
}

async function main() {
  const channelId = getArg("channelId");
  const singleVideoId = getArg("videoId");
  const limitArg = getArg("limit");
  const limit = limitArg ? parseInt(limitArg, 10) : undefined;
  const skipExisting = !getFlag("reprocess");
  noTranslate = getFlag("no-translate");

  if (!channelId && !singleVideoId) {
    throw new Error(
      [
        "Использование:",
        "  npm run sync:full -- --channelId UCxxxx",
        "  npm run sync:full -- --channelId UCxxxx --limit 10",
        "  npm run sync:full -- --videoId dQw4w9WgXcQ",
        "  Добавьте --reprocess чтобы пересоздать уже готовые выжимки",
      ].join("\n"),
    );
  }

  // ── Режим одного видео ──────────────────────────────────────────────────────
  if (singleVideoId) {
    console.log(`\n📹 Обработка видео: ${singleVideoId}`);
    const result = await processVideo(singleVideoId, false);
    console.log(`\nРезультат: ${result}`);
    return;
  }

  // ── Режим канала ─────────────────────────────────────────────────────────────
  console.log(`\n📡 Синхронизация канала: ${channelId}`);

  const ch = await fetchChannel(channelId!);
  if (!ch.uploadsPlaylistId) throw new Error("Нет плейлиста загрузок для канала");

  const channel = await prisma.channel.upsert({
    where: { youtubeChannelId: ch.id },
    create: {
      youtubeChannelId: ch.id,
      title: ch.title,
      handle: ch.customUrl,
      description: ch.description,
      thumbnailUrl: ch.thumbnails?.high?.url ?? ch.thumbnails?.default?.url ?? null,
      lastSyncAt: new Date(),
    },
    update: {
      title: ch.title,
      handle: ch.customUrl,
      description: ch.description,
      thumbnailUrl: ch.thumbnails?.high?.url ?? ch.thumbnails?.default?.url ?? null,
      lastSyncAt: new Date(),
    },
  });

  console.log(`  Канал: ${ch.title}`);

  const videoIds = await listUploadsPlaylistVideoIds(ch.uploadsPlaylistId);
  const toProcess = limit ? videoIds.slice(0, limit) : videoIds;
  const videos = await fetchVideos(toProcess);

  // Upsert видео в БД
  for (const v of videos) {
    await prisma.video.upsert({
      where: { youtubeVideoId: v.id },
      create: {
        youtubeVideoId: v.id,
        channelId: channel.id,
        title: v.title,
        description: v.description,
        publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
        durationSec: parseIsoDurationToSeconds(v.duration),
        views: v.viewCount ? Number(v.viewCount) : null,
        thumbnailUrl: v.thumbnails?.high?.url ?? v.thumbnails?.default?.url ?? null,
        language: v.defaultLanguage ?? null,
        lastSyncAt: new Date(),
      },
      update: {
        title: v.title,
        description: v.description,
        publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
        durationSec: parseIsoDurationToSeconds(v.duration),
        views: v.viewCount ? Number(v.viewCount) : null,
        thumbnailUrl: v.thumbnails?.high?.url ?? v.thumbnails?.default?.url ?? null,
        language: v.defaultLanguage ?? null,
        lastSyncAt: new Date(),
      },
    });
  }

  console.log(`  Видео в БД: ${videos.length}`);
  console.log(`\n  Запускаем транскрибирование и генерацию выжимок...`);

  const stats = { ok: 0, no_captions: 0, skipped: 0, error: 0 };

  for (const v of videos) {
    const result = await processVideo(v.id, skipExisting);
    stats[result]++;
    // Пауза между запросами чтобы не превысить лимиты
    if (result !== "skipped") await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Канал «${ch.title}» — итого:`);
  console.log(`   Обработано:       ${stats.ok}`);
  console.log(`   Нет субтитров:    ${stats.no_captions}`);
  console.log(`   Пропущено (есть): ${stats.skipped}`);
  console.log(`   Ошибок:           ${stats.error}`);
  console.log(`   Транскрипции в:   ${TRANSCRIPTS_DIR}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
