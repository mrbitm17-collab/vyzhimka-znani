/**
 * Авто-создание дистиллятов по темам (категориям каналов).
 * Для каждой категории в базе создаёт/обновляет LibraryItem со сводными тезисами.
 *
 * Использование:
 *   npm run pipeline:topics              — все категории
 *   npm run pipeline:topics -- --category AI   — одна категория
 *   npm run pipeline:topics -- --dry-run       — показать что будет без записи
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
function getFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

// slug из названия категории: "SEO / Маркетинг" → "seo-marketing"
function categoryToSlug(cat: string): string {
  return "topic-" + cat
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/[а-яё]/gi, (c) => TRANSLIT[c.toLowerCase()] ?? c)
    .replace(/-+/g, "-")
    .slice(0, 50);
}

const TRANSLIT: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
  к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
  х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
};

type EnrichedThesis = Thesis & { videoTitle: string; ytId: string };

function deduplicateTheses(theses: EnrichedThesis[], max: number): EnrichedThesis[] {
  const out: EnrichedThesis[] = [];
  for (const t of theses) {
    const b = t.body.toLowerCase();
    const dupe = out.some((u) => {
      const overlap = [...b].filter((ch) => u.body.toLowerCase().includes(ch)).length;
      return overlap / b.length > 0.65;
    });
    if (!dupe) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function deduplicateTasks(
  tasks: Array<Task & { videoTitle: string }>,
  max: number,
): Array<Task & { videoTitle: string }> {
  const seen = new Set<string>();
  return tasks.filter((t) => {
    const key = t.title.toLowerCase().slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, max);
}

function buildMarkdown(args: {
  title: string;
  description: string;
  theses: EnrichedThesis[];
  tasks: Array<Task & { videoTitle: string }>;
  sources: Array<{ title: string; ytId: string; channel: string }>;
}): { markdown: string; summary: string } {
  const { title, description, theses, tasks, sources } = args;

  const summary = theses
    .slice(0, 3)
    .map((t) => t.body.split(/[.!?]/)[0].trim())
    .filter(Boolean)
    .join(". ") + ".";

  const lines = [
    `# ${title}`,
    ``,
    description,
    ``,
    `---`,
    ``,
    `## Источники (${sources.length} видео)`,
    ``,
    ...sources.map(
      (s) => `- **${s.channel}**: [${s.title}](https://youtube.com/watch?v=${s.ytId})`,
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

// Описания тем для дистиллятов
const TOPIC_DESCRIPTIONS: Record<string, string> = {
  AI: "Сводные знания об искусственном интеллекте, нейросетях, Claude Code, Gemini и автоматизации — из всех видео этой категории.",
  Бизнес: "Ключевые идеи о предпринимательстве, стартапах, масштабировании и управлении — из всех бизнес-видео.",
  Технологии: "Лучшие тезисы о разработке, продуктах и технологических инструментах.",
  Образование: "Главные идеи из лекций, TED-докладов и обучающих видео.",
  "SEO / Маркетинг": "Ключевые инсайты по поисковой оптимизации, продвижению и контент-маркетингу.",
  Продуктивность: "Лучшие практики по организации работы, тайм-менеджменту и рабочим системам.",
  Финансы: "Ключевые идеи об инвестициях, деньгах и финансовой грамотности.",
  Здоровье: "Главные знания о здоровье, питании и образе жизни.",
};

async function processCategory(
  category: string,
  dryRun: boolean,
  maxTheses = 25,
  maxTasks = 12,
): Promise<void> {
  const slug = categoryToSlug(category);
  const title = `Главное о теме: ${category}`;
  const description = TOPIC_DESCRIPTIONS[category]
    ?? `Сводные тезисы и задания из всех видео категории «${category}».`;

  console.log(`\n  📂 ${category} → /library/${slug}`);

  const videos = await prisma.video.findMany({
    where: { channel: { category }, workbook: { isNot: null } },
    include: { workbook: true, channel: true },
    orderBy: { views: "desc" },
  });

  if (!videos.length) {
    console.log(`     Нет видео с выжимками — пропускаем`);
    return;
  }

  const allTheses: EnrichedThesis[] = [];
  const allTasks: Array<Task & { videoTitle: string }> = [];
  const sources: Array<{ title: string; ytId: string; channel: string }> = [];

  for (const v of videos) {
    if (!v.workbook) continue;
    sources.push({ title: v.title, ytId: v.youtubeVideoId, channel: v.channel.title });

    const data = v.workbook.json as Partial<WorkbookData> | null;

    if (data?.version === 2 && data.theses?.length) {
      for (const t of data.theses) {
        allTheses.push({ ...t, videoTitle: v.title, ytId: v.youtubeVideoId });
      }
      for (const t of data.tasks ?? []) {
        allTasks.push({ ...t, videoTitle: v.title });
      }
    } else if (v.workbook.summary) {
      allTheses.push({
        n: 1,
        title: v.title.split(" ").slice(0, 6).join(" "),
        body: v.workbook.summary,
        videoTitle: v.title,
        ytId: v.youtubeVideoId,
      });
    }
  }

  const theses = deduplicateTheses(allTheses, maxTheses);
  const tasks = deduplicateTasks(allTasks, maxTasks);

  console.log(`     видео: ${videos.length} | тезисов: ${theses.length} | заданий: ${tasks.length}`);

  if (dryRun) {
    console.log(`     [dry-run] запись пропущена`);
    return;
  }

  const { markdown, summary } = buildMarkdown({ title, description, theses, tasks, sources });

  const json = {
    type: "topic-distillate",
    version: 2,
    category,
    videoCount: sources.length,
    thesesCount: theses.length,
    tasksCount: tasks.length,
    tags: category,
    readTime: `${Math.ceil(markdown.split(" ").length / 200)} мин`,
  };

  await prisma.libraryItem.upsert({
    where: { slug },
    create: { slug, title, summary, markdown, json },
    update: { title, summary, markdown, json },
  });

  console.log(`     ✓ Сохранён: /library/${slug}`);
}

async function main() {
  const onlyCategory = getArg("category");
  const dryRun = getFlag("dry-run");

  console.log(`\n📚 Генерация дистиллятов по темам${dryRun ? " [dry-run]" : ""}...`);

  // Получаем все категории из базы
  const channels = await prisma.channel.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });

  const categories = channels
    .map((c) => c.category!)
    .filter(Boolean)
    .sort();

  if (!categories.length) {
    console.log("  Нет категорий в базе. Сначала добавьте каналы через sync:youtube или sync:full.");
    return;
  }

  const toProcess = onlyCategory ? [onlyCategory] : categories;
  console.log(`  Категорий: ${toProcess.join(", ")}`);

  for (const cat of toProcess) {
    await processCategory(cat, dryRun);
  }

  console.log("\n✅ Готово. Дистилляты доступны в /library");
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
