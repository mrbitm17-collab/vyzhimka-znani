/**
 * Модуль перевода текста в русский язык.
 * Использует бесплатный Google Translate (без API-ключа).
 * Автоматически определяет язык и переводит только нерусские тексты.
 */
import { translate } from "@vitalets/google-translate-api";

// ─── Определение языка ────────────────────────────────────────────────────────

/** Возвращает true, если текст содержит достаточно кириллицы (≥30%) → считается русским */
export function isRussian(text: string): boolean {
  const sample = text.slice(0, 500);
  const cyrillic = (sample.match(/[\u0400-\u04FF]/g) ?? []).length;
  const letters = (sample.match(/[a-zA-Z\u0400-\u04FF]/g) ?? []).length;
  if (letters === 0) return true;
  return cyrillic / letters >= 0.3;
}

// ─── Перевод с паузами ────────────────────────────────────────────────────────

const CHUNK_SIZE = 4500; // Google Translate принимает до ~5000 символов за запрос
const PAUSE_MS = 800;    // пауза между запросами чтобы не получить 429

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Разбивает текст на куски по абзацам, не превышая CHUNK_SIZE */
function splitToChunks(text: string): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Переводит текст на русский.
 * Если текст уже русский — возвращает без изменений.
 * Для длинных текстов разбивает на чанки.
 */
export async function translateToRussian(text: string): Promise<string> {
  if (isRussian(text)) return text;

  const chunks = splitToChunks(text);
  const results: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await sleep(PAUSE_MS);
    try {
      const { text: translated } = await translate(chunks[i], { to: "ru" });
      results.push(translated);
    } catch (e: unknown) {
      // При ошибке (rate limit, сеть) — оставляем оригинал
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`    ⚠ Перевод чанка ${i + 1}/${chunks.length} не удался: ${msg}`);
      results.push(chunks[i]);
    }
  }

  return results.join("\n\n");
}

/**
 * Переводит короткую строку (заголовок, тезис, цитата).
 * Используется для отдельных строк без разбивки на чанки.
 */
export async function translateShort(text: string): Promise<string> {
  if (!text || isRussian(text)) return text;
  try {
    await sleep(200);
    const { text: translated } = await translate(text, { to: "ru" });
    return translated;
  } catch {
    return text;
  }
}
