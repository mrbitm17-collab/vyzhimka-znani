export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
        <p className="text-xs font-medium text-[#aaaaaa]">
          Локальная база знаний из YouTube
        </p>
        <h1 className="mt-2 text-2xl font-medium tracking-tight md:text-3xl">
          Выжимки и дистилляты — структурированные знания для людей и AI‑агентов
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d4d4d4]">
          Здесь будут храниться каналы, видео, транскрипты, сегменты, выжимки из
          отдельных видео и дистилляты тем. Начните с раздела «Библиотека» или
          добавьте канал в админке.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/library"
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#f1f1f1] px-5 text-sm font-medium text-black shadow-[0_1px_2px_rgba(0,0,0,0.5)] hover:bg-white"
          >
            Открыть библиотеку
          </a>
          <a
            href="/admin"
            className="inline-flex h-9 items-center justify-center rounded-full border border-[#3f3f3f] bg-[#272727] px-5 text-sm font-medium text-[#f1f1f1] shadow-[0_1px_2px_rgba(0,0,0,0.7)] hover:bg-[#3d3d3d]"
          >
            Админка / импорт
          </a>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          <h2 className="text-base font-semibold">Библиотека</h2>
          <p className="mt-2 text-xs leading-5 text-[#d4d4d4]">
            Дистилляты — синтез нескольких видео по одной теме.
          </p>
        </div>
        <div className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          <h2 className="text-base font-semibold">Выжимки</h2>
          <p className="mt-2 text-xs leading-5 text-[#d4d4d4]">
            Выжимка одного видео: тезисы, задания, цитаты, транскрипт.
          </p>
        </div>
        <div className="rounded-xl bg-[#181818] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.7)]">
          <h2 className="text-base font-semibold">API</h2>
          <p className="mt-2 text-xs leading-5 text-[#d4d4d4]">
            Публичные JSON и Markdown эндпоинты для агентов и интеграций.
          </p>
        </div>
      </section>
    </div>
  );
}
