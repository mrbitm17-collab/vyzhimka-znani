import Link from "next/link";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(v: number | null) {
  if (!v) return "";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

export default async function Home() {
  const [channelCount, videoCount, recentVideos, channels] = await Promise.all([
    prisma.channel.count(),
    prisma.video.count(),
    prisma.video.findMany({
      take: 8,
      orderBy: { publishedAt: "desc" },
      include: { channel: true },
    }),
    prisma.channel.findMany({
      take: 6,
      orderBy: { importedAt: "desc" },
      include: { _count: { select: { videos: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-[#181818] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
          Выжимка знаний
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaaaaa]">
          Структурированные знания из YouTube: каналы, видео, выжимки и дистилляты.
        </p>
        <div className="mt-4 flex gap-6 text-sm">
          <div>
            <span className="text-xl font-semibold">{channelCount}</span>{" "}
            <span className="text-[#aaaaaa]">каналов</span>
          </div>
          <div>
            <span className="text-xl font-semibold">{videoCount}</span>{" "}
            <span className="text-[#aaaaaa]">видео</span>
          </div>
        </div>
      </section>

      {recentVideos.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Недавние видео</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentVideos.map((v) => (
              <Link
                key={v.id}
                href={`/video/${v.youtubeVideoId}`}
                className="group rounded-xl bg-[#181818] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.7)] hover:bg-[#222]"
              >
                {v.thumbnailUrl && (
                  <div className="relative">
                    <img
                      src={v.thumbnailUrl}
                      alt={v.title}
                      className="aspect-video w-full object-cover"
                    />
                    {v.durationSec && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium">
                        {formatDuration(v.durationSec)}
                      </span>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug">
                    {v.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#aaaaaa]">
                    {v.channel.title}
                  </p>
                  <p className="text-xs text-[#aaaaaa]">
                    {v.views ? `${formatViews(v.views)} просм.` : ""}
                    {v.publishedAt && (
                      <>
                        {v.views ? " · " : ""}
                        {new Date(v.publishedAt).toLocaleDateString("ru-RU")}
                      </>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {channels.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Каналы</h2>
            <Link href="/channels" className="text-sm text-[#3ea6ff] hover:underline">
              Все {channelCount} →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {channels.map((ch) => (
              <Link
                key={ch.id}
                href={`/channels`}
                className="flex items-center gap-3 rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)] hover:bg-[#222]"
              >
                {ch.thumbnailUrl && (
                  <img
                    src={ch.thumbnailUrl}
                    alt={ch.title}
                    className="h-12 w-12 shrink-0 rounded-full object-cover"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">{ch.title}</h3>
                  <p className="text-xs text-[#aaaaaa]">
                    {ch._count.videos} видео
                    {ch.handle && ` · ${ch.handle}`}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
