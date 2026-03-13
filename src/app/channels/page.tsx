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

function categoryLabel(cat: string | null) {
  return cat ?? "Другое";
}

export default async function ChannelsPage() {
  const channels = await prisma.channel.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { videos: true } } },
  });

  const grouped = new Map<string, typeof channels>();
  for (const ch of channels) {
    const key = categoryLabel(ch.category);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(ch);
  }

  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Каналы</h1>
        <p className="mt-2 text-sm text-[#aaaaaa]">
          {channels.length} каналов в {sortedKeys.length} категориях
        </p>
      </header>

      {channels.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#3f3f3f] bg-[#181818] p-6 text-sm text-[#aaaaaa]">
          Пока нет каналов. Добавьте хотя бы один канал в{" "}
          <Link className="text-[#3ea6ff] underline" href="/admin">
            админке
          </Link>
          .
        </div>
      ) : (
        sortedKeys.map((cat) => {
          const items = grouped.get(cat)!;
          const totalVideos = items.reduce((s, c) => s + c._count.videos, 0);
          return (
            <section key={cat}>
              <div className="mb-3 flex items-baseline gap-3">
                <h2 className="text-lg font-semibold">{cat}</h2>
                <span className="text-xs text-[#aaaaaa]">
                  {items.length} каналов · {totalVideos.toLocaleString("ru-RU")} видео
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-start gap-3 rounded-xl bg-[#181818] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                  >
                    {ch.thumbnailUrl && (
                      <img
                        src={ch.thumbnailUrl}
                        alt={ch.title}
                        className="h-12 w-12 shrink-0 rounded-full object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{ch.title}</h3>
                      <p className="text-xs text-[#aaaaaa]">
                        {ch._count.videos} видео
                        {ch.handle && ` · ${ch.handle}`}
                      </p>
                      <a
                        href={`https://www.youtube.com/channel/${ch.youtubeChannelId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-[#3ea6ff] hover:underline"
                      >
                        YouTube →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
