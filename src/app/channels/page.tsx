import Link from "next/link";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChannelsPage() {
  const channels = await prisma.channel.findMany({
    orderBy: { title: "asc" },
    include: { _count: { select: { videos: true } } },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Каналы</h1>
        <p className="mt-2 text-sm text-[#aaaaaa]">
          {channels.length} каналов импортировано
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-start gap-4 rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
            >
              {ch.thumbnailUrl && (
                <img
                  src={ch.thumbnailUrl}
                  alt={ch.title}
                  className="h-16 w-16 shrink-0 rounded-full object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-semibold">{ch.title}</h2>
                <p className="text-xs text-[#aaaaaa]">
                  {ch._count.videos} видео
                  {ch.handle && ` · ${ch.handle}`}
                </p>
                {ch.description && (
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#d4d4d4]">
                    {ch.description}
                  </p>
                )}
                {ch.youtubeChannelId && (
                  <a
                    href={`https://www.youtube.com/channel/${ch.youtubeChannelId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-xs text-[#3ea6ff] hover:underline"
                  >
                    Открыть на YouTube →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
