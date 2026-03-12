export default function WorkbooksPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Выжимки</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Выжимка — рабочая тетрадь из одного видео: тезисы, задания, цитаты и
          транскрипт. (Данные появятся после импорта и генерации.)
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        Пока нет выжимок. Импортируйте видео в{" "}
        <a className="underline" href="/admin">
          админке
        </a>
        .
      </div>
    </div>
  );
}

