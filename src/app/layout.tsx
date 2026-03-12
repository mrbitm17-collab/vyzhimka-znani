import type { Metadata } from "next";
import Link from "next/link";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Выжимка знаний",
  description:
    "База знаний из YouTube: каналы, видео, выжимки и дистилляты.",
};

const nav = [
  { href: "/", label: "Главная" },
  { href: "/library", label: "Библиотека" },
  { href: "/workbooks", label: "Выжимки" },
  { href: "/channels", label: "Каналы" },
  { href: "/search", label: "Поиск" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${roboto.variable} ${robotoMono.variable} antialiased bg-[#0f0f0f] text-white`}
      >
        <div className="min-h-dvh bg-[#0f0f0f] text-white">
          <header className="sticky top-0 z-20 bg-[#0f0f0f]">
            <div className="flex items-center justify-between gap-4 px-4 py-2 lg:px-6">
              {/* Left: logo */}
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-1">
                  <span className="inline-flex h-5 items-center justify-center rounded-sm bg-[#ff0000] px-1 text-[11px] font-semibold leading-none text-white shadow-md">
                    VZ
                  </span>
                  <span className="ml-1 text-[18px] font-medium tracking-tight">
                    Vyzhimka Znaniy
                  </span>
                </Link>
              </div>

              {/* Center: search bar (YouTube-like) */}
              <div className="hidden flex-1 items-center justify-center md:flex">
                <form
                  action="/search"
                  className="flex w-full max-w-[640px] items-stretch"
                >
                  <input
                    name="q"
                    className="h-9 w-full rounded-l-full border border-[#303030] bg-[#121212] px-4 text-sm text-white outline-none placeholder:text-[#aaaaaa] focus:border-[#3ea6ff]"
                    placeholder="Поиск"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-14 items-center justify-center rounded-r-full border border-l-0 border-[#303030] bg-[#222222] text-[#f1f1f1] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                  >
                    🔍
                  </button>
                </form>
              </div>

              {/* Right: action buttons */}
              <div className="flex items-center gap-2">
                <Link
                  href="/admin"
                  className="inline-flex h-8 items-center justify-center rounded-full bg-[#272727] px-3 text-xs font-medium text-[#f1f1f1] shadow-[0_1px_2px_rgba(0,0,0,0.6)] hover:bg-[#3d3d3d]"
                >
                  Админка
                </Link>
              </div>
            </div>

            {/* Secondary nav like YouTube chips */}
            <nav className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1 text-xs text-[#e5e5e5] lg:px-6">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-full bg-[#272727] px-3 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.6)] hover:bg-white hover:text-black"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-4 lg:px-6">
            {children}
          </main>
          <footer className="border-t border-[#272727] px-4 py-6 text-xs text-[#aaaaaa] lg:px-6">
            <p>
              «Выжимка знаний». Вдохновлено{" "}
              <a
                className="text-[#3ea6ff] hover:underline"
                href="https://ekstraktznaniy.ru/"
                target="_blank"
                rel="noreferrer"
              >
                ekstraktznaniy.ru
              </a>
              .
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
