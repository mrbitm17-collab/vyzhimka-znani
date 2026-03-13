import Link from "next/link";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDuration(sec: number | null) {
  if (!sec) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(v: number | null) {
  if (!v) return "";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return v.toLocaleString("ru-RU");
}

function formatHours(totalSec: number) {
  const h = Math.round(totalSec / 3600);
  if (h >= 1000) return `~${(h / 1000).toFixed(1)}K`;
  return `~${h}`;
}

export default async function Home() {
  const [
    channelCount,
    videoCount,
    totalDuration,
    libraryItems,
    recentVideos,
    popularVideos,
    topChannels,
  ] = await Promise.all([
    prisma.channel.count(),
    prisma.video.count(),
    prisma.video.aggregate({ _sum: { durationSec: true } }),
    prisma.libraryItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.video.findMany({
      take: 8,
      orderBy: { publishedAt: "desc" },
      include: { channel: true },
    }),
    prisma.video.findMany({
      take: 8,
      orderBy: { views: "desc" },
      include: { channel: true },
    }),
    prisma.channel.findMany({
      take: 6,
      orderBy: { videos: { _count: "desc" } },
      include: { _count: { select: { videos: true } } },
    }),
  ]);

  const totalHours = formatHours(totalDuration._sum.durationSec ?? 0);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="rounded-xl bg-[#181818] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.7)] md:p-8">
        <h1 className="text-2xl font-medium tracking-tight md:text-3xl">
          Выжимка Знаний
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aaaaaa]">
          Структурированные знания из YouTube: выжимки из отдельных видео и
          дистилляты тем — верифицированный контент для людей и AI-агентов.
        </p>
        <div className="mt-5 flex flex-wrap gap-8 text-sm">
          <Stat value={channelCount} label="каналов" />
          <Stat
            value={videoCount.toLocaleString("ru-RU")}
            label="видео"
          />
          <Stat value={totalHours} label="часов" />
        </div>
      </section>

      {/* Library — distillates */}
      {libraryItems.length > 0 && (
        <section>
          <SectionHeader
            title="Библиотека знаний"
            subtitle={`${libraryItems.length} дистиллятов на основе практического опыта`}
            href="/library"
            linkText={`Все ${libraryItems.length} дистиллятов`}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {libraryItems.slice(0, 3).map((item) => {
              const meta = item.json as Record<string, string> | null;
              return (
                <Link
                  key={item.id}
                  href={`/library/${item.slug}`}
                  className="group rounded-xl bg-[#181818] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.7)] transition-colors hover:bg-[#222]"
                >
                  <h3 className="text-sm font-semibold leading-snug group-hover:text-[#3ea6ff]">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#aaaaaa]">
                      {item.summary}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#3ea6ff]">
                    {meta?.readTime && <span>{meta.readTime}</span>}
                    {meta?.tags &&
                      (meta.tags as string)
                        .split(",")
                        .slice(0, 3)
                        .map((t: string) => (
                          <span
                            key={t}
                            className="rounded-full bg-[#272727] px-2 py-0.5 text-[#d4d4d4]"
                          >
                            {t.trim()}
                          </span>
                        ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Channels */}
      <section>
        <SectionHeader
          title="Каналы"
          href="/channels"
          linkText={`Все ${channelCount}`}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topChannels.map((ch) => (
            <Link
              key={ch.id}
              href="/channels"
              className="flex items-center gap-3 rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)] transition-colors hover:bg-[#222]"
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

      {/* Recently added */}
      {recentVideos.length > 0 && (
        <section>
          <SectionHeader title="Недавно добавленные" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}

      {/* Most popular */}
      {popularVideos.length > 0 && (
        <section>
          <SectionHeader title="Самое популярное" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popularVideos.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <span className="text-xl font-semibold">{value}</span>{" "}
      <span className="text-[#aaaaaa]">{label}</span>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  linkText,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-[#aaaaaa]">{subtitle}</p>
        )}
      </div>
      {href && linkText && (
        <Link
          href={href}
          className="shrink-0 text-sm text-[#3ea6ff] hover:underline"
        >
          {linkText} →
        </Link>
      )}
    </div>
  );
}

function VideoCard({
  video,
}: {
  video: {
    id: string;
    youtubeVideoId: string;
    title: string;
    thumbnailUrl: string | null;
    durationSec: number | null;
    views: number | null;
    publishedAt: Date | null;
    channel: { title: string };
  };
}) {
  return (
    <Link
      href={`/video/${video.youtubeVideoId}`}
      className="group overflow-hidden rounded-xl bg-[#181818] shadow-[0_1px_2px_rgba(0,0,0,0.7)] transition-colors hover:bg-[#222]"
    >
      {video.thumbnailUrl && (
        <div className="relative">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="aspect-video w-full object-cover"
          />
          {video.durationSec && (
            <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.5 text-[11px] font-medium">
              {formatDuration(video.durationSec)}
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          {video.title}
        </h3>
        <p className="mt-1 text-xs text-[#aaaaaa]">{video.channel.title}</p>
        <p className="text-xs text-[#aaaaaa]">
          {video.publishedAt && (
            <span>
              {new Date(video.publishedAt).toLocaleDateString("ru-RU", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          )}
          {video.views != null && video.views > 0 && (
            <span>
              {video.publishedAt ? " · " : ""}
              {formatViews(video.views)} просм.
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
