export default function SearchPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Поиск</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          Поиск по сегментам, выжимкам и библиотеке. После подключения БД будет
          работать через `/api/search`.
        </p>
      </header>

      <form className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950 sm:flex-row sm:items-center">
        <input
          name="q"
          placeholder="Например: CLAUDE.md, subagents, cost..."
          className="h-11 w-full rounded-xl border border-black/10 bg-transparent px-4 text-sm outline-none placeholder:text-zinc-400 focus:border-black/30 dark:border-white/10 dark:placeholder:text-zinc-500 dark:focus:border-white/30"
        />
        <button
          type="submit"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
          Искать
        </button>
      </form>

      <div className="rounded-2xl border border-dashed border-black/20 bg-white p-6 text-sm text-zinc-700 dark:border-white/20 dark:bg-zinc-950 dark:text-zinc-300">
        Результаты появятся после реализации API и импорта данных.
      </div>
    </div>
  );
}

