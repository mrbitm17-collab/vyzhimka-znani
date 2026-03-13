import Link from "next/link";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CATEGORY_ORDER = [
  "AI",
  "Бизнес",
  "Технологии",
  "Образование",
  "SEO / Маркетинг",
  "Продуктивность",
  "Финансы",
  "Здоровье",
];

// Маппинг категория → slug дистиллята (совпадает с pipeline-topics.ts)
function categoryToSlug(cat: string): string {
  const TRANSLIT: Record<string, string> = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"shch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return "topic-" + cat
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/[а-яё]/gi, (c) => TRANSLIT[c.toLowerCase()] ?? c)
    .replace(/-+/g, "-")
    .slice(0, 50);
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  AI: "Искусственный интеллект, нейросети, Claude Code, Gemini, автоматизация, вайбкодинг",
  Бизнес: "Предпринимательство, стартапы, партнёрства, масштабирование, управление",
  Технологии: "Разработка, продукты, инструменты, обзоры технологий",
  Образование: "Лекции, TED-доклады, обучение, развитие навыков",
  "SEO / Маркетинг": "Поисковая оптимизация, продвижение, контент-маркетинг",
  Продуктивность: "Организация работы, тайм-менеджмент, рабочие системы",
  Финансы: "Инвестиции, деньги, финансовая грамотность",
  Здоровье: "Медицина, здоровый образ жизни, питание, наука о теле",
};

export default async function LibraryPage() {
  const [channels, libraryItems] = await Promise.all([
    prisma.channel.findMany({
      orderBy: { title: "asc" },
      include: { _count: { select: { videos: true } } },
    }),
    prisma.libraryItem.findMany({
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Множество slug-ов topic-дистиллятов для быстрой проверки
  const topicSlugs = new Set(libraryItems.map((i) => i.slug));

  const grouped = new Map<string, typeof channels>();
  for (const ch of channels) {
    const key = ch.category ?? "Другое";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ch);
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const totalVideos = channels.reduce((s, c) => s + c._count.videos, 0);
  const totalReadTime = libraryItems.reduce((s, item) => {
    const meta = item.json as Record<string, string> | null;
    const minutes = parseInt(meta?.readTime ?? "0", 10);
    return s + (isNaN(minutes) ? 0 : minutes);
  }, 0);

  return (
    <div className="space-y-10">
      {/* Header */}
      <header>
        <nav className="mb-3 text-xs text-[#aaaaaa]">
          <Link href="/" className="hover:text-white">
            Главная
          </Link>
          <span className="mx-1">/</span>
          <span className="text-white">Библиотека знаний</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Библиотека знаний
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaaaaa]">
          Практические руководства по работе с AI-инструментами. Основано на
          опыте Ray Amjad — разработчика, который использует Claude Code более
          1600 часов.
        </p>
      </header>

      {/* Distillates */}
      {libraryItems.length > 0 && (
        <section className="space-y-4">
          {libraryItems.map((item) => {
            const meta = item.json as Record<string, string> | null;
            const tags = meta?.tags
              ?.split(",")
              .map((t: string) => t.trim())
              .filter(Boolean);
            return (
              <Link
                key={item.id}
                href={`/library/${item.slug}`}
                className="block rounded-xl bg-[#181818] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.7)] transition-colors hover:bg-[#222]"
              >
                <h2 className="text-base font-semibold leading-snug md:text-lg">
                  {item.title}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#aaaaaa]">
                  {tags &&
                    tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full bg-[#272727] px-2 py-0.5 text-[10px] text-[#d4d4d4]"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
                {item.summary && (
                  <p className="mt-3 text-sm leading-relaxed text-[#aaaaaa]">
                    {item.summary}
                  </p>
                )}
                <div className="mt-3 flex gap-4 text-xs text-[#aaaaaa]">
                  {meta?.readTime && <span>{meta.readTime} чтения</span>}
                  {meta?.source && <span>{meta.source}</span>}
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-8 rounded-xl bg-[#181818] px-6 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
        <div className="text-center">
          <div className="text-xl font-semibold">{libraryItems.length}</div>
          <div className="text-xs text-[#aaaaaa]">дистиллятов</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold">{totalReadTime}</div>
          <div className="text-xs text-[#aaaaaa]">мин чтения</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold">1600+</div>
          <div className="text-xs text-[#aaaaaa]">часов опыта</div>
        </div>
      </div>

      {/* Topics by category */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">Разделы по темам</h2>
        <p className="mb-4 text-sm text-[#aaaaaa]">
          Навигация по {totalVideos.toLocaleString("ru-RU")} видео из{" "}
          {channels.length} каналов, организованным в {sortedKeys.length}{" "}
          тематических разделов.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedKeys.map((cat) => {
            const items = grouped.get(cat)!;
            const videoCount = items.reduce((s, c) => s + c._count.videos, 0);
            const desc = CATEGORY_DESCRIPTIONS[cat] ?? "";
            const topicSlug = categoryToSlug(cat);
            const hasDistillate = topicSlugs.has(topicSlug);

            return (
              <div
                key={cat}
                className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold">{cat}</h3>
                  {hasDistillate && (
                    <Link
                      href={`/library/${topicSlug}`}
                      className="shrink-0 rounded-full bg-[#3ea6ff]/15 px-2.5 py-0.5 text-[10px] font-medium text-[#3ea6ff] hover:bg-[#3ea6ff]/25"
                    >
                      Дистиллят →
                    </Link>
                  )}
                </div>
                <p className="mt-1 text-xs text-[#aaaaaa]">
                  {items.length} каналов · {videoCount.toLocaleString("ru-RU")} видео
                </p>
                {desc && (
                  <p className="mt-2 text-xs leading-relaxed text-[#d4d4d4]">{desc}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1">
                  {items.slice(0, 5).map((ch) => (
                    <span
                      key={ch.id}
                      className="inline-block rounded-full bg-[#272727] px-2 py-0.5 text-[10px] text-[#d4d4d4]"
                    >
                      {ch.title}
                    </span>
                  ))}
                  {items.length > 5 && (
                    <span className="inline-block rounded-full bg-[#272727] px-2 py-0.5 text-[10px] text-[#aaaaaa]">
                      +{items.length - 5}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Popular videos by category */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Популярные видео по категориям
        </h2>
        {sortedKeys.map((cat) => {
          const catChannelIds = grouped.get(cat)!.map((c) => c.id);
          return (
            <TopVideosByCategory
              key={cat}
              category={cat}
              channelIds={catChannelIds}
            />
          );
        })}
      </section>
    </div>
  );
}

async function TopVideosByCategory({
  category,
  channelIds,
}: {
  category: string;
  channelIds: string[];
}) {
  const videos = await prisma.video.findMany({
    where: { channelId: { in: channelIds } },
    orderBy: { views: "desc" },
    take: 4,
    include: { channel: true },
  });

  if (videos.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-semibold text-[#aaaaaa]">
        {category}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {videos.map((v) => (
          <Link
            key={v.id}
            href={`/video/${v.youtubeVideoId}`}
            className="group overflow-hidden rounded-lg bg-[#181818] shadow-[0_1px_2px_rgba(0,0,0,0.7)] transition-colors hover:bg-[#222]"
          >
            {v.thumbnailUrl && (
              <img
                src={v.thumbnailUrl}
                alt={v.title}
                className="aspect-video w-full object-cover"
              />
            )}
            <div className="p-2">
              <h4 className="line-clamp-2 text-xs font-medium leading-snug">
                {v.title}
              </h4>
              <p className="mt-1 text-[10px] text-[#aaaaaa]">
                {v.channel.title}
                {v.views != null &&
                  ` · ${v.views.toLocaleString("ru-RU")} просм.`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
