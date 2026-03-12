export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Библиотека</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Дистилляты — структурированные руководства по темам на базе нескольких
          видео. (Данные появятся после импорта и запуска пайплайна.)
        </p>
      </header>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        Пока пусто. Откройте <a className="underline" href="/admin">админку</a>,
        добавьте канал и запустите синхронизацию/генерацию.
      </div>
    </div>
  );
}

