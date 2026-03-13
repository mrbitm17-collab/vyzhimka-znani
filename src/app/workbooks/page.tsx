import Link from "next/link";
import { prisma } from "@/server/db";
import type { WorkbookData } from "@/server/pipeline/workbook";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDuration(sec: number | null) {
  if (!sec) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getWorkbookCounts(json: unknown): { theses: number; tasks: number; quotes: number } | null {
  if (!json || typeof json !== "object") return null;
  const d = json as Partial<WorkbookData>;
  if (d.version !== 2) return null;
  return {
    theses: d.theses?.length ?? 0,
    tasks: d.tasks?.length ?? 0,
    quotes: d.quotes?.length ?? 0,
  };
}

export default async function WorkbooksPage() {
  const workbooks = await prisma.workbook.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      video: {
        include: { channel: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Выжимки</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Структурированные знания из одного видео: тезисы, задания, цитаты — для людей и AI-агентов
        </p>
      </header>

      {workbooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-[#181818] p-6 text-sm text-zinc-400">
          Пока нет выжимок. Запустите{" "}
          <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-xs">
            npm run sync:full -- --channelId UCxxxx
          </code>{" "}
          чтобы добавить канал и автоматически создать выжимки.
        </div>
      ) : (
        <div className="space-y-3">
          {workbooks.map((wb) => {
            const counts = getWorkbookCounts(wb.json);
            const dur = formatDuration(wb.video.durationSec);

            return (
              <Link
                key={wb.id}
                href={`/workbook/${wb.id}`}
                className="block rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)] hover:bg-[#222] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-medium leading-snug line-clamp-2">
                      {wb.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-400">
                      {dur && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          {dur}
                        </span>
                      )}
                      <span>{wb.video.channel.title}</span>
                      {wb.video.publishedAt && (
                        <span>{new Date(wb.video.publishedAt).toLocaleDateString("ru-RU")}</span>
                      )}
                    </div>
                    {wb.summary && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400 leading-snug">
                        {wb.summary}
                      </p>
                    )}
                  </div>

                  {wb.video.thumbnailUrl && (
                    <img
                      src={wb.video.thumbnailUrl}
                      alt={wb.title}
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                  )}
                </div>

                {counts && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-zinc-300">
                      {counts.theses} тезисов
                    </span>
                    <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-zinc-300">
                      {counts.tasks} заданий
                    </span>
                    <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-zinc-300">
                      {counts.quotes} цитат
                    </span>
                    <span className="ml-auto text-xs text-[#3ea6ff]">
                      Читать →
                    </span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
