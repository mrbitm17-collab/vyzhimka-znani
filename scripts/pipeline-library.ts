/**
 * Генератор дистиллятов (Library items).
 *
 * Режим 1 — указать конкретные видео:
 *   npm run pipeline:library -- --slug "workflow" --title "Название" --youtubeVideoId "id1" --youtubeVideoId "id2"
 *
 * Режим 2 — собрать из ВСЕХ выжимок в базе:
 *   npm run pipeline:library -- --slug "master" --title "Название" --all
 *
 * Режим 3 — по категории канала:
 *   npm run pipeline:library -- --slug "ai-master" --title "Название" --category "AI"
 */

import "dotenv/config";
import { prisma } from "../src/server/db";
import type { WorkbookData } from "../src/server/pipeline/workbook";
import type { Thesis, Task } from "../src/server/pipeline/text";

function getArg(name: string): string | null {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}
function getMultiArg(name: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) {
      out.push(process.argv[i + 1]!);
      i++;
    }
  }
  return out;
}
function getFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

// ─── Объединение тезисов ──────────────────────────────────────────────────────

type EnrichedThesis = Thesis & { videoTitle: string; videoId: string };

/** Убирает дубликаты: если два тезиса совпадают на 60%+ — оставляем один */
function deduplicateTheses(theses: EnrichedThesis[], maxOut: number): EnrichedThesis[] {
  const out: EnrichedThesis[] = [];
  for (const t of theses) {
    const body = t.body.toLowerCase();
    const isDupe = out.some((u) => {
      const shared = [...body].filter((ch) => u.body.toLowerCase().includes(ch)).length;
      return shared / body.length > 0.6;
    });
    if (!isDupe) out.push(t);
    if (out.length >= maxOut) break;
  }
  return out;
}

/** Убирает дубликаты заданий по заголовку */
function deduplicateTasks(tasks: Array<Task & { videoTitle: string }>, maxOut: number) {
  const seen = new Set<string>();
  return tasks.filter((t) => {
    const key = t.title.toLowerCase().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, maxOut);
}

// ─── Генерация markdown дистиллята ───────────────────────────────────────────

function buildDistillateMarkdown(args: {
  title: string;
  description: string;
  theses: EnrichedThesis[];
  tasks: Array<Task & { videoTitle: string }>;
  sources: Array<{ title: string; youtubeVideoId: string; channel: string }>;
}): { markdown: string; summary: string } {
  const { title, description, theses, tasks, sources } = args;

  const summary = theses.slice(0, 3).map((t) => t.body.split(".")[0]).join(". ") + ".";

  const lines: string[] = [
    `# ${title}`,
    ``,
    description,
    ``,
    `---`,
    ``,
    `## Источники (${sources.length} видео)`,
    ``,
    ...sources.map(
      (s) =>
        `- **${s.channel}**: [${s.title}](https://youtube.com/watch?v=${s.youtubeVideoId})`,
    ),
    ``,
    `---`,
    ``,
    `## Сводные тезисы (${theses.length})`,
    ``,
    ...theses.flatMap((t, i) => [
      `### ${i + 1}. ${t.title}`,
      ``,
      t.body,
      ``,
      `> *Из видео: ${t.videoTitle}*`,
      ``,
    ]),
    `---`,
    ``,
    `## Практические задания (${tasks.length})`,
    ``,
    ...tasks.flatMap((t, i) => [
      `### Задание ${i + 1}: ${t.title}`,
      ``,
      t.goal,
      ``,
      `> *Из видео: ${t.videoTitle}*`,
      ``,
    ]),
  ];

  return { markdown: lines.join("\n"), summary };
}

// ─── Основная логика ──────────────────────────────────────────────────────────

async function main() {
  const slug = getArg("slug");
  const title = getArg("title");
  const description = getArg("description") ?? `Дистиллят: объединение ключевых тезисов и заданий из всех выжимок.`;
  const allFlag = getFlag("all");
  const categoryFilter = getArg("category");
  const videoIds = getMultiArg("youtubeVideoId");
  const maxTheses = parseInt(getArg("maxTheses") ?? "30", 10);
  const maxTasks = parseInt(getArg("maxTasks") ?? "15", 10);

  if (!slug || !title) {
    throw new Error(
      [
        "Использование:",
        "  # Все выжимки:",
        "  npm run pipeline:library -- --slug master --title \"Главное\" --all",
        "  # По категории:",
        "  npm run pipeline:library -- --slug ai --title \"AI знания\" --category AI",
        "  # Конкретные видео:",
        '  npm run pipeline:library -- --slug my --title "Моё" --youtubeVideoId id1 --youtubeVideoId id2',
      ].join("\n"),
    );
  }

  // Получаем видео
  const include = { workbook: true, channel: true } as const;
  async function fetchVideos() {
    if (allFlag) {
      console.log("  Режим: все выжимки из базы");
      return prisma.video.findMany({
        where: { workbook: { isNot: null } },
        include,
        orderBy: { publishedAt: "desc" },
      });
    }
    if (categoryFilter) {
      console.log(`  Режим: категория «${categoryFilter}»`);
      return prisma.video.findMany({
        where: {
          channel: { category: categoryFilter },
          workbook: { isNot: null },
        },
        include,
        orderBy: { views: "desc" },
      });
    }
    if (!videoIds.length) throw new Error("Укажите --all, --category или хотя бы один --youtubeVideoId");
    const result = await prisma.video.findMany({
      where: { youtubeVideoId: { in: videoIds } },
      include,
    });
    const missing = videoIds.filter((id) => !result.some((v) => v.youtubeVideoId === id));
    if (missing.length) throw new Error(`Видео не найдены в БД: ${missing.join(", ")}`);
    return result;
  }
  const videos = await fetchVideos();

  if (!videos.length) {
    throw new Error("Нет выжимок в базе. Сначала запустите sync:full.");
  }

  console.log(`  Обрабатываем ${videos.length} выжимок...`);

  // Собираем тезисы и задания из v2 JSON
  const allTheses: EnrichedThesis[] = [];
  const allTasks: Array<Task & { videoTitle: string }> = [];
  const sources: Array<{ title: string; youtubeVideoId: string; channel: string }> = [];

  for (const v of videos) {
    if (!v.workbook) continue;
    sources.push({ title: v.title, youtubeVideoId: v.youtubeVideoId, channel: v.channel.title });

    const data = v.workbook.json as Partial<WorkbookData> | null;

    if (data?.version === 2 && data.theses) {
      for (const t of data.theses) {
        allTheses.push({ ...t, videoTitle: v.title, videoId: v.youtubeVideoId });
      }
    } else if (v.workbook.summary) {
      // Fallback: старый формат — используем summary как один тезис
      allTheses.push({
        n: 1,
        title: v.title.split(" ").slice(0, 6).join(" "),
        body: v.workbook.summary,
        videoTitle: v.title,
        videoId: v.youtubeVideoId,
      });
    }

    if (data?.version === 2 && data.tasks) {
      for (const t of data.tasks) {
        allTasks.push({ ...t, videoTitle: v.title });
      }
    }
  }

  // Дедупликация + отбор лучших
  const dedupedTheses = deduplicateTheses(allTheses, maxTheses);
  const dedupedTasks = deduplicateTasks(allTasks, maxTasks);

  console.log(`  Тезисов отобрано: ${dedupedTheses.length} из ${allTheses.length}`);
  console.log(`  Заданий отобрано: ${dedupedTasks.length} из ${allTasks.length}`);

  // Строим markdown
  const { markdown, summary } = buildDistillateMarkdown({
    title,
    description,
    theses: dedupedTheses,
    tasks: dedupedTasks,
    sources,
  });

  const json = {
    type: "distillate",
    version: 2,
    videoCount: sources.length,
    thesesCount: dedupedTheses.length,
    tasksCount: dedupedTasks.length,
    sources: sources.map((s) => s.youtubeVideoId),
    tags: categoryFilter ?? "all",
    readTime: `${Math.ceil(markdown.split(" ").length / 200)} мин`,
  };

  const item = await prisma.libraryItem.upsert({
    where: { slug },
    create: { slug, title, summary, markdown, json },
    update: { title, summary, markdown, json },
  });

  console.log(`\n✅ Дистиллят создан:`);
  console.log(`   slug:    ${item.slug}`);
  console.log(`   видео:   ${sources.length}`);
  console.log(`   тезисов: ${dedupedTheses.length}`);
  console.log(`   заданий: ${dedupedTasks.length}`);
  console.log(`   URL:     /library/${item.slug}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
