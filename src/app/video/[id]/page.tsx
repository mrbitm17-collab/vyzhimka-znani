import Link from "next/link";
import { prisma } from "@/server/db";
import { notFound } from "next/navigation";

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

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const video = await prisma.video.findFirst({
    where: { youtubeVideoId: id },
    include: { channel: true },
  });

  if (!video) return notFound();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl bg-[#181818] shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="p-4">
          <h1 className="text-xl font-semibold leading-tight">{video.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#aaaaaa]">
            <Link
              href="/channels"
              className="flex items-center gap-2 hover:text-white"
            >
              {video.channel.thumbnailUrl && (
                <img
                  src={video.channel.thumbnailUrl}
                  alt={video.channel.title}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="font-medium text-[#f1f1f1]">
                {video.channel.title}
              </span>
            </Link>

            {video.views != null && (
              <span>{video.views.toLocaleString("ru-RU")} просм.</span>
            )}
            {video.durationSec && (
              <span>{formatDuration(video.durationSec)}</span>
            )}
            {video.publishedAt && (
              <span>
                {new Date(video.publishedAt).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            )}
          </div>

          {video.description && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-[#3ea6ff] hover:underline">
                Описание
              </summary>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#d4d4d4]">
                {video.description}
              </p>
            </details>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <a
          href={`https://www.youtube.com/watch?v=${video.youtubeVideoId}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-full bg-[#272727] px-4 text-sm text-[#f1f1f1] shadow-[0_1px_2px_rgba(0,0,0,0.6)] hover:bg-[#3d3d3d]"
        >
          Смотреть на YouTube
        </a>
      </div>
    </div>
  );
}
