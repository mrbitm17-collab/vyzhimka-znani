import Link from "next/link";

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Библиотека
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{slug}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          JSON:{" "}
          <Link className="underline" href={`/api/v1/library/${slug}`}>
            /api/v1/library/{slug}
          </Link>{" "}
          · Markdown:{" "}
          <Link className="underline" href={`/library/${slug}.md`}>
            /library/{slug}.md
          </Link>
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        После генерации здесь будет отрендеренный markdown дистиллята.
      </div>
    </div>
  );
}

