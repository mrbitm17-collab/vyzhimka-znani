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
  const channels = await prisma.channel.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { videos: true } } },
  });

  const libraryItems = await prisma.libraryItem.findMany({
    orderBy: { createdAt: "desc" },
  });

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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Библиотека знаний</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaaaaa]">
          Навигация по {totalVideos.toLocaleString("ru-RU")} видео из{" "}
          {channels.length} каналов, организованным в {sortedKeys.length} тематических разделов.
        </p>
      </header>

      {libraryItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Дистилляты</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {libraryItems.map((item) => (
              <Link
                key={item.id}
                href={`/library/${item.slug}`}
                className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)] hover:bg-[#222]"
              >
                <h3 className="text-sm font-semibold">{item.title}</h3>
                {item.summary && (
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#aaaaaa]">
                    {item.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-lg font-semibold">Разделы по темам</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedKeys.map((cat) => {
            const items = grouped.get(cat)!;
            const videoCount = items.reduce((s, c) => s + c._count.videos, 0);
            const desc = CATEGORY_DESCRIPTIONS[cat] ?? "";
            return (
              <div
                key={cat}
                className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
              >
                <h3 className="text-base font-semibold">{cat}</h3>
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

      <section>
        <h2 className="mb-4 text-lg font-semibold">Популярные видео по категориям</h2>
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
      <h3 className="mb-2 text-sm font-semibold text-[#aaaaaa]">{category}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {videos.map((v) => (
          <Link
            key={v.id}
            href={`/video/${v.youtubeVideoId}`}
            className="group overflow-hidden rounded-lg bg-[#181818] shadow-[0_1px_2px_rgba(0,0,0,0.7)] hover:bg-[#222]"
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
                {v.views != null && ` · ${v.views.toLocaleString("ru-RU")} просм.`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
