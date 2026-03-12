export default function AdminPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Админка</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Здесь будут инструменты импорта: добавление каналов, синхронизация
          видео, загрузка транскриптов, запуск генерации выжимок и
          дистиллятов.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">1) Импорт</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Добавить каналы и синхронизировать список видео из YouTube Data API.
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
          <h2 className="text-base font-semibold">2) Пайплайн</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Транскрипт → сегменты → выжимка/дистиллят → теги/поиск/API.
          </p>
        </div>
      </section>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        На следующих шагах мы добавим кнопки, формы и статусы выполнения задач.
      </div>
    </div>
  );
}

