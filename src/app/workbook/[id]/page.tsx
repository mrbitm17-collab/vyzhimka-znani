import Link from "next/link";
import { notFound } from "next/navigation";
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

function formatSec(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function WorkbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const wb = await prisma.workbook.findUnique({
    where: { id },
    include: { video: { include: { channel: true } } },
  });
  if (!wb) notFound();

  const data = wb.json as Partial<WorkbookData> | null;
  const isV2 = data?.version === 2;
  const isLocal = wb.video.youtubeVideoId.startsWith("local_");
  const ytId = wb.video.youtubeVideoId;

  // Тезисы с таймкодами
  const timestampedTheses = isV2
    ? (data?.theses ?? []).filter((t) => t.startSec !== undefined)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">

      {/* ── Шапка ── */}
      <header className="space-y-3">
        <Link href="/workbooks" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Все выжимки
        </Link>
        <h1 className="text-2xl font-semibold leading-snug tracking-tight">
          {wb.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-400">
          {!isLocal && (
            <a
              href={`https://youtube.com/watch?v=${ytId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[#3ea6ff] hover:underline"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Смотреть на YouTube
            </a>
          )}
          {formatDuration(wb.video.durationSec) && (
            <span>{formatDuration(wb.video.durationSec)}</span>
          )}
          <span>{wb.video.channel.title}</span>
          {wb.video.publishedAt && (
            <span>{new Date(wb.video.publishedAt).toLocaleDateString("ru-RU")}</span>
          )}
        </div>

        {isV2 && data && (
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
              {data.theses?.length ?? 0} тезисов
            </span>
            <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
              {data.tasks?.length ?? 0} заданий
            </span>
            <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
              {data.quotes?.length ?? 0} цитат
            </span>
          </div>
        )}

        <div className="text-xs text-zinc-600">
          <Link href={`/api/v1/workbook/${id}`} className="hover:text-zinc-400">JSON</Link>
          {" · "}
          <Link href={`/workbook/${id}.md`} className="hover:text-zinc-400">Markdown</Link>
        </div>
      </header>

      {/* ── TL;DR ── */}
      {isV2 && data?.tldr && (
        <section className="rounded-xl border border-[#3ea6ff]/20 bg-[#3ea6ff]/5 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#3ea6ff]">
            TL;DR — суть за 30 секунд
          </p>
          <p className="text-sm leading-7 text-zinc-200">{data.tldr}</p>
        </section>
      )}

      {/* ── YouTube плеер + тайм-коды ── */}
      {!isLocal && (
        <section className="space-y-4">
          {/* Встроенный плеер */}
          <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={wb.title}
            />
          </div>

          {/* Навигация по тайм-кодам */}
          {timestampedTheses.length > 0 && (
            <div className="rounded-xl bg-[#181818] p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Ключевые моменты
              </p>
              <ul className="space-y-1.5">
                {timestampedTheses.map((t) => (
                  <li key={t.n}>
                    <a
                      href={`https://youtube.com/watch?v=${ytId}&t=${t.startSec}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-white/5"
                    >
                      <span className="shrink-0 font-mono text-xs text-[#3ea6ff]">
                        {formatSec(t.startSec!)}
                      </span>
                      <span className="line-clamp-1 text-zinc-300">{t.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Тезисы ── */}
      {isV2 && data?.theses && data.theses.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Ключевые тезисы
          </h2>
          <ol className="space-y-4">
            {data.theses.map((t) => (
              <li key={t.n} className="rounded-xl bg-[#181818] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3ea6ff]/15 text-xs font-bold text-[#3ea6ff]">
                    {t.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium leading-snug">{t.title}</p>
                      {!isLocal && t.startSec !== undefined && (
                        <a
                          href={`https://youtube.com/watch?v=${ytId}&t=${t.startSec}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-full bg-[#3ea6ff]/10 px-2 py-0.5 font-mono text-xs text-[#3ea6ff] hover:bg-[#3ea6ff]/20"
                          title="Перейти к этому моменту на YouTube"
                        >
                          {formatSec(t.startSec)}
                        </a>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{t.body}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Задания ── */}
      {isV2 && data?.tasks && data.tasks.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Практические задания
          </h2>
          <div className="space-y-3">
            {data.tasks.map((t) => (
              <div key={t.n} className="rounded-xl bg-[#181818] p-4">
                <p className="font-medium">
                  <span className="mr-2 text-zinc-500">#{t.n}</span>
                  {t.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{t.goal}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Цитаты ── */}
      {isV2 && data?.quotes && data.quotes.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Ключевые цитаты
          </h2>
          <div className="space-y-3">
            {data.quotes.map((q, i) => (
              <blockquote
                key={i}
                className="rounded-xl border-l-4 border-[#3ea6ff]/40 bg-[#181818] py-3 pl-4 pr-4"
              >
                <p className="text-sm leading-6 text-zinc-200">«{q.text}»</p>
                <footer className="mt-1.5 text-xs text-zinc-500">— {q.speaker}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* ── Транскрипт ── */}
      {isV2 && data?.transcript && (
        <section>
          <details className="group">
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
              Транскрипт ▸
            </summary>
            <div className="mt-4 rounded-xl bg-[#181818] p-4 text-sm leading-7 text-zinc-400 whitespace-pre-wrap">
              {data.transcript}
            </div>
          </details>
        </section>
      )}

      {/* ── Fallback для старого формата ── */}
      {!isV2 && wb.markdown && (
        <section className="rounded-xl bg-[#181818] p-4 text-sm leading-7 text-zinc-300 whitespace-pre-wrap">
          {wb.markdown}
        </section>
      )}
    </div>
  );
}
