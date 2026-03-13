import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DistillateJson = {
  type?: string;
  version?: number;
  videoCount?: number;
  thesesCount?: number;
  tasksCount?: number;
  readTime?: string;
  tags?: string;
  sources?: string[];
};

type ThesisBlock = { n: number; title: string; body: string; videoTitle?: string };
type TaskBlock   = { n: number; title: string; goal: string; videoTitle?: string };

/** Простой парсер Markdown → структурированные блоки для красивого рендера */
function parseDistillateMarkdown(md: string): {
  intro: string;
  sources: string[];
  theses: ThesisBlock[];
  tasks: TaskBlock[];
} {
  const theses: ThesisBlock[] = [];
  const tasks: TaskBlock[] = [];
  const sources: string[] = [];
  let intro = "";

  const lines = md.split("\n");
  let section = "";
  let current: Partial<ThesisBlock & TaskBlock> = {};
  let bodyLines: string[] = [];
  let videoTitle = "";

  const flush = () => {
    if (!current.title) return;
    if (section === "theses") {
      theses.push({
        n: theses.length + 1,
        title: current.title,
        body: bodyLines.join(" ").trim(),
        videoTitle,
      });
    } else if (section === "tasks") {
      tasks.push({
        n: tasks.length + 1,
        title: current.title,
        goal: bodyLines.join(" ").trim(),
        videoTitle,
      });
    }
    current = {};
    bodyLines = [];
    videoTitle = "";
  };

  let introLines: string[] = [];
  let passedFirstH2 = false;

  for (const line of lines) {
    if (line.startsWith("## Источники")) { flush(); section = "sources"; passedFirstH2 = true; continue; }
    if (line.startsWith("## Сводные тезисы") || line.startsWith("## Ключевые идеи")) {
      flush(); section = "theses"; passedFirstH2 = true; continue;
    }
    if (line.startsWith("## Практические задания")) { flush(); section = "tasks"; passedFirstH2 = true; continue; }
    if (line.startsWith("# ") || line.startsWith("---")) { passedFirstH2 = true; continue; }

    if (!passedFirstH2 && !line.startsWith("#")) {
      introLines.push(line);
      continue;
    }

    if (section === "sources") {
      const m = line.match(/^\s*[-*]\s+\*\*(.+?)\*\*:\s+\[(.+?)\]/);
      if (m) sources.push(`${m[1]}: ${m[2]}`);
      else if (line.match(/^\s*[-*]\s+/)) sources.push(line.replace(/^\s*[-*]\s+/, "").trim());
      continue;
    }

    if (section === "theses" || section === "tasks") {
      if (line.startsWith("### ")) {
        flush();
        current.title = line.replace(/^###\s+\d+\.\s*/, "").replace(/^###\s+/, "").trim();
        continue;
      }
      if (line.startsWith("> *Из видео:")) {
        videoTitle = line.replace(/^> \*Из видео:\s*/, "").replace(/\*$/, "").trim();
        continue;
      }
      if (line.startsWith(">") || line.trim() === "") continue;
      bodyLines.push(line.trim());
    }
  }
  flush();

  intro = introLines.filter(Boolean).join(" ").trim();

  return { intro, sources, theses, tasks };
}

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const item = await prisma.libraryItem.findUnique({ where: { slug } });
  if (!item) notFound();

  const meta = (item.json ?? {}) as DistillateJson;
  const isV2 = meta.version === 2;
  const parsed = item.markdown ? parseDistillateMarkdown(item.markdown) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">

      {/* ── Шапка ── */}
      <header className="space-y-3">
        <Link href="/library" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Библиотека
        </Link>
        <h1 className="text-2xl font-semibold leading-snug tracking-tight">
          {item.title}
        </h1>

        {/* Счётчики */}
        {isV2 && (
          <div className="flex flex-wrap gap-2">
            {meta.videoCount !== undefined && (
              <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
                {meta.videoCount} видео
              </span>
            )}
            {meta.thesesCount !== undefined && (
              <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
                {meta.thesesCount} тезисов
              </span>
            )}
            {meta.tasksCount !== undefined && (
              <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
                {meta.tasksCount} заданий
              </span>
            )}
            {meta.readTime && (
              <span className="rounded-full border border-white/15 px-3 py-0.5 text-xs">
                {meta.readTime}
              </span>
            )}
          </div>
        )}

        <div className="text-xs text-zinc-600">
          <Link href={`/api/v1/library/${slug}`} className="hover:text-zinc-400">JSON</Link>
          {" · "}
          <Link href={`/library/${slug}.md`} className="hover:text-zinc-400">Markdown</Link>
        </div>
      </header>

      {/* ── Кратко (summary) ── */}
      {item.summary && (
        <section className="rounded-xl border border-[#3ea6ff]/20 bg-[#3ea6ff]/5 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#3ea6ff]">Суть</p>
          <p className="text-sm leading-7 text-zinc-200">{item.summary}</p>
        </section>
      )}

      {/* ── Тезисы ── */}
      {parsed && parsed.theses.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Сводные тезисы ({parsed.theses.length})
          </h2>
          <ol className="space-y-4">
            {parsed.theses.map((t) => (
              <li key={t.n} className="rounded-xl bg-[#181818] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3ea6ff]/15 text-xs font-bold text-[#3ea6ff]">
                    {t.n}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{t.title}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{t.body}</p>
                    {t.videoTitle && (
                      <p className="mt-1.5 text-xs text-zinc-600">из: {t.videoTitle}</p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Задания ── */}
      {parsed && parsed.tasks.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Практические задания ({parsed.tasks.length})
          </h2>
          <div className="space-y-3">
            {parsed.tasks.map((t) => (
              <div key={t.n} className="rounded-xl bg-[#181818] p-4">
                <p className="font-medium">
                  <span className="mr-2 text-zinc-500">#{t.n}</span>
                  {t.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{t.goal}</p>
                {t.videoTitle && (
                  <p className="mt-1.5 text-xs text-zinc-600">из: {t.videoTitle}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Источники ── */}
      {parsed && parsed.sources.length > 0 && (
        <section>
          <details>
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-widest text-zinc-500 hover:text-zinc-300">
              Источники ({parsed.sources.length}) ▸
            </summary>
            <ul className="mt-3 space-y-1">
              {parsed.sources.map((s, i) => (
                <li key={i} className="text-sm text-zinc-400">
                  {s}
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}

      {/* ── Fallback: старый Markdown ── */}
      {(!parsed || (parsed.theses.length === 0 && parsed.tasks.length === 0)) &&
        item.markdown && (
          <section className="rounded-xl bg-[#181818] p-4 text-sm leading-7 text-zinc-300 whitespace-pre-wrap">
            {item.markdown}
          </section>
        )}
    </div>
  );
}
