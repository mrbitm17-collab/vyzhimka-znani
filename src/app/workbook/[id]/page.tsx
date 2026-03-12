import Link from "next/link";

export default async function WorkbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Выжимка
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{id}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          JSON:{" "}
          <Link className="underline" href={`/api/v1/workbook/${id}`}>
            /api/v1/workbook/{id}
          </Link>{" "}
          · Markdown:{" "}
          <Link className="underline" href={`/workbook/${id}.md`}>
            /workbook/{id}.md
          </Link>
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        После генерации здесь будет отрендеренный markdown выжимки.
      </div>
    </div>
  );
}

