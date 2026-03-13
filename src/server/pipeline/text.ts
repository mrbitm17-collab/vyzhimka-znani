export function cleanTranscript(text: string) {
  return (
    text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function splitIntoSegments(text: string, opts?: { maxChars?: number }) {
  const maxChars = opts?.maxChars ?? 900;
  const paragraphs = text.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);
  const segments: string[] = [];
  let buf = "";

  for (const p of paragraphs) {
    if (!buf) { buf = p; continue; }
    if ((buf + "\n\n" + p).length <= maxChars) { buf = buf + "\n\n" + p; continue; }
    segments.push(buf);
    buf = p;
  }
  if (buf) segments.push(buf);

  const normalized: string[] = [];
  for (const s of segments) {
    if (s.length <= maxChars) { normalized.push(s); continue; }
    const parts = s.split(/(?<=[.!?])\s+/g);
    let chunk = "";
    for (const part of parts) {
      if (!chunk) { chunk = part; continue; }
      if ((chunk + " " + part).length <= maxChars) { chunk = chunk + " " + part; }
      else { normalized.push(chunk); chunk = part; }
    }
    if (chunk) normalized.push(chunk);
  }
  return normalized;
}

// ─── Тезисы ──────────────────────────────────────────────────────────────────

export type Thesis = {
  n: number;
  title: string;
  body: string;
  startSec?: number; // таймстамп в видео (если известен)
};

/**
 * Извлекает N тезисов из текста.
 * captionTimestamps — массив { text, offsetMs } из субтитров YouTube.
 * Если передан, каждый тезис получает startSec через поиск по тексту.
 */
export function extractTheses(
  text: string,
  max = 10,
  captionTimestamps?: Array<{ text: string; offsetMs: number }>,
): Thesis[] {
  const sentences = splitToSentences(text);
  if (!sentences.length) return [];

  // Скоринг предложений: длина ~120-200 символов, наличие цифр/запятых
  const scored = sentences.map((s) => {
    const len = s.length;
    if (len < 40 || len > 500) return { s, score: 0 };
    const commas = (s.match(/,/g) ?? []).length;
    const digits = (s.match(/\d/g) ?? []).length;
    const isQuestion = s.endsWith("?") ? -5 : 0;
    const score = Math.max(0, 300 - Math.abs(len - 160)) + commas * 8 + digits * 3 + isQuestion;
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const selected: string[] = [];
  for (const { s } of scored) {
    if (selected.length >= max) break;
    if (selected.some((u) => u.includes(s) || s.includes(u))) continue;
    selected.push(s);
  }

  return selected.map((s, i) => {
    const words = s.split(" ");
    const titleWords = words.slice(0, 7).join(" ").replace(/[,:]$/, "");

    // Ищем таймстамп: находим субтитр, чья строка наиболее похожа на начало тезиса
    let startSec: number | undefined;
    if (captionTimestamps?.length) {
      const snippet = s.slice(0, 40).toLowerCase();
      let bestScore = 0;
      for (const cap of captionTimestamps) {
        const capLower = cap.text.toLowerCase();
        if (capLower.includes(snippet.slice(0, 20))) {
          const score = 20;
          if (score > bestScore) { bestScore = score; startSec = Math.floor(cap.offsetMs / 1000); }
        }
      }
    }

    return { n: i + 1, title: titleWords, body: s, ...(startSec !== undefined ? { startSec } : {}) };
  });
}

// ─── Цитаты ───────────────────────────────────────────────────────────────────

export type Quote = {
  text: string;
  speaker: string;
};

/**
 * Извлекает фразы, похожие на прямую речь или ключевые высказывания.
 * Ищет: текст в кавычках, короткие утвердительные фразы, эмоциональные утверждения.
 */
export function extractQuotes(text: string, speaker: string, max = 6): Quote[] {
  const sentences = splitToSentences(text);
  const quotes: Quote[] = [];

  // 1. Текст в русских кавычках « »
  const ruQuoteRe = /«([^»]{20,200})»/g;
  let m: RegExpExecArray | null;
  while ((m = ruQuoteRe.exec(text)) !== null && quotes.length < max) {
    quotes.push({ text: m[1].trim(), speaker });
  }

  if (quotes.length >= max) return quotes.slice(0, max);

  // 2. Текст в "английских кавычках"
  const enQuoteRe = /"([^"]{20,200})"/g;
  while ((m = enQuoteRe.exec(text)) !== null && quotes.length < max) {
    const t = m[1].trim();
    if (!quotes.some((q) => q.text === t)) quotes.push({ text: t, speaker });
  }

  if (quotes.length >= max) return quotes.slice(0, max);

  // 3. Добираем: короткие яркие утверждения (40-140 символов)
  const bright = sentences
    .filter((s) => {
      const len = s.length;
      if (len < 40 || len > 160) return false;
      if (s.endsWith("?")) return false;
      // Признаки яркого утверждения
      const hasNumbers = /\d/.test(s);
      const hasComparison = /\b(лучше|хуже|быстрее|важнее|главное|ключевое|основа|всегда|никогда|каждый|любой)\b/i.test(s);
      return hasNumbers || hasComparison;
    })
    .slice(0, max - quotes.length);

  for (const s of bright) {
    if (!quotes.some((q) => q.text === s)) {
      quotes.push({ text: s, speaker });
    }
  }

  return quotes.slice(0, max);
}

// ─── Задания ─────────────────────────────────────────────────────────────────

export type Task = {
  n: number;
  title: string;
  goal: string;
};

/**
 * Генерирует практические задания на основе ключевых тезисов.
 * Создаёт универсальные педагогические задачи + специфические под контент.
 */
export function generateTasks(theses: Thesis[], _transcript: string): Task[] {
  const tasks: Task[] = [];

  // Задание 1: Применить главную идею
  if (theses[0]) {
    tasks.push({
      n: 1,
      title: "Применить главную идею",
      goal: `Прочитайте тезис №1: «${theses[0].body.slice(0, 120)}...». Сформулируйте, как эта идея применима в вашей работе прямо сейчас. Запишите 1 конкретное действие, которое можно сделать сегодня.`,
    });
  }

  // Задание 2: Выписать концепции
  tasks.push({
    n: 2,
    title: "Выписать ключевые концепции",
    goal: "Просмотрите тезисы и выпишите 5 главных понятий или концепций. Для каждого найдите один реальный пример из вашей практики или жизни.",
  });

  // Задание 3: Составить чек-лист
  tasks.push({
    n: 3,
    title: "Составить чек-лист действий",
    goal: "На основе тезисов составьте чек-лист из 7-10 конкретных действий. Отметьте: какие из них вы уже делаете, какие можно автоматизировать, какие нужно внедрить в первую очередь.",
  });

  // Задание 4: Специфическое под тезис 2-3
  if (theses[1]) {
    tasks.push({
      n: 4,
      title: "Проверить на практике",
      goal: `Возьмите тезис: «${theses[1].body.slice(0, 100)}...». Проведите эксперимент: примените эту идею в течение одной рабочей недели. Зафиксируйте результат и поделитесь выводом.`,
    });
  }

  // Задание 5: Поделиться знаниями
  tasks.push({
    n: tasks.length + 1,
    title: "Передать знание дальше",
    goal: "Объясните ключевую идею из этого видео другому человеку (коллеге, другу) за 2 минуты без использования записей. Это лучший способ проверить, насколько хорошо вы её усвоили.",
  });

  return tasks;
}

// ─── Вспомогательные функции ──────────────────────────────────────────────────

function splitToSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);
}

/** Устаревшая функция — оставлена для совместимости. */
export function extractKeySentences(text: string, max = 10): string[] {
  return extractTheses(text, max).map((t) => t.body);
}
