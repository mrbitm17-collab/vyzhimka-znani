import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DISTILLATES = [
  {
    slug: "workflow",
    title: "Рабочий процесс с Claude Code: от хаоса к системе",
    summary:
      "Как организовать работу с Claude Code по методу Ray Amjad (1600+ часов). Planning mode, CLAUDE.md, форма дифа, параллельный режим.",
    json: {
      readTime: "12 мин",
      source: "Ray Amjad — 35 видео о Claude Code",
      tags: "workflow, planning, CLAUDE.md, best practices",
      order: 1,
    },
  },
  {
    slug: "prompting",
    title: "Промптинг Claude Code: как объяснять AI, чтобы он делал то, что нужно",
    summary:
      "Официальные принципы Anthropic + практика Ray Amjad. Тон, точность, ограничения, контекст, богатые промпты.",
    json: {
      readTime: "10 мин",
      source: "Ray Amjad + Anthropic Prompt Engineering Guide",
      tags: "prompting, instructions, best practices, Anthropic",
      order: 2,
    },
  },
  {
    slug: "claudemd",
    title: "CLAUDE.md — точка максимального рычага",
    summary:
      "Почему CLAUDE.md важнее промптов. Структура, лимит инструкций, вложенные файлы, правила с мотивацией, workflow обновления.",
    json: {
      readTime: "11 мин",
      source: "Ray Amjad — The Highest Point of Leverage in Claude Code",
      tags: "CLAUDE.md, configuration, rules, leverage",
      order: 3,
    },
  },
  {
    slug: "subagents",
    title: "Субагенты и параллельный режим: Factorio-подход к разработке",
    summary:
      "Как запускать 3–5 агентов параллельно, создавать субагентов с изолированным контекстом, настраивать MCPs и Skills.",
    json: {
      readTime: "13 мин",
      source: "Ray Amjad — 35 видео о Claude Code",
      tags: "subagents, parallel, MCPs, Skills, Factorio, worktrees",
      order: 4,
    },
  },
  {
    slug: "advanced",
    title: "Продвинутые техники Claude Code: hooks, headless, голос, Obsidian",
    summary:
      "Lifecycle hooks, headless automation, голосовой ввод (HyperWhisper), Obsidian как база знаний, управление контекстом, custom slash commands.",
    json: {
      readTime: "14 мин",
      source: "Ray Amjad — 35 видео о Claude Code",
      tags: "hooks, headless, voice, Obsidian, sessions, slash-commands",
      order: 5,
    },
  },
  {
    slug: "insights",
    title: "60 инсайтов Ray Amjad: дистилляция 1600+ часов с Claude Code",
    summary:
      "Всё самое важное из 35 видео: ментальные модели, типичные ошибки, выбор моделей, стоимость, промптинг, параллельная работа.",
    json: {
      readTime: "18 мин",
      source: "Ray Amjad — 35 видео о Claude Code",
      tags: "insights, mental models, tips, mistakes, cost, models",
      order: 6,
    },
  },
];

async function main() {
  for (const d of DISTILLATES) {
    await prisma.libraryItem.upsert({
      where: { slug: d.slug },
      update: {
        title: d.title,
        summary: d.summary,
        json: d.json,
      },
      create: {
        slug: d.slug,
        title: d.title,
        summary: d.summary,
        json: d.json,
      },
    });
    console.log(`  ✓ ${d.slug}`);
  }
  console.log(`\nDone — ${DISTILLATES.length} distillates seeded.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
