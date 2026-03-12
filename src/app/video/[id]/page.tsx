export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          Видео
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {id}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Здесь будет страница видео: метаданные, сегменты, ссылки на выжимку и
          транскрипт.
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        Данные появятся после синхронизации YouTube и генерации контента.
      </div>
    </div>
  );
}

