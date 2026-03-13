/**
 * Бесплатное получение субтитров YouTube через пакет youtube-transcript.
 * Не требует API-ключа. Использует публичные субтитры/автогенерацию YouTube.
 */
import { YoutubeTranscript } from "youtube-transcript";

export type CaptionSegment = {
  text: string;
  offset: number; // миллисекунды
  duration: number;
};

/**
 * Загружает субтитры для YouTube-видео.
 * Предпочитает русские субтитры, затем английские, затем любые.
 * Возвращает null, если субтитры недоступны.
 */
export async function fetchCaptions(
  youtubeVideoId: string,
): Promise<CaptionSegment[] | null> {
  for (const lang of ["ru", "en", undefined]) {
    try {
      const opts = lang ? { lang } : undefined;
      const raw = await YoutubeTranscript.fetchTranscript(youtubeVideoId, opts);
      if (!raw?.length) continue;
      return raw.map((s) => ({
        text: s.text,
        offset: s.offset,
        duration: s.duration,
      }));
    } catch {
      // попробовать следующий язык
    }
  }
  return null;
}

/** Собирает сегменты в сплошной текст. */
export function captionsToText(segments: CaptionSegment[]): string {
  return segments
    .map((s) =>
      s.text
        .replace(/\[.*?\]/g, "") // убрать [музыка], [аплодисменты] и т.п.
        .replace(/&amp;/g, "&")
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .trim(),
    )
    .filter(Boolean)
    .join(" ");
}
