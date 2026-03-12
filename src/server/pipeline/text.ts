export function cleanTranscript(text: string) {
  return (
    text
      // normalize newlines
      .replace(/\r\n/g, "\n")
      // collapse excessive spaces
      .replace(/[ \t]+/g, " ")
      // collapse 3+ newlines to 2
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
    if (!buf) {
      buf = p;
      continue;
    }

    if ((buf + "\n\n" + p).length <= maxChars) {
      buf = buf + "\n\n" + p;
      continue;
    }

    segments.push(buf);
    buf = p;
  }
  if (buf) segments.push(buf);

  // if a paragraph was too large, split by sentences
  const normalized: string[] = [];
  for (const s of segments) {
    if (s.length <= maxChars) {
      normalized.push(s);
      continue;
    }
    const parts = s.split(/(?<=[.!?])\s+/g);
    let chunk = "";
    for (const part of parts) {
      if (!chunk) {
        chunk = part;
        continue;
      }
      if ((chunk + " " + part).length <= maxChars) {
        chunk = chunk + " " + part;
      } else {
        normalized.push(chunk);
        chunk = part;
      }
    }
    if (chunk) normalized.push(chunk);
  }

  return normalized;
}

export function extractKeySentences(text: string, max = 10) {
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/g)
    .map((s) => s.trim())
    .filter((s) => s.length >= 40);

  // naive scoring: prefer medium-length sentences with some commas/digits
  const scored = sentences.map((s) => {
    const len = s.length;
    const commas = (s.match(/,/g) ?? []).length;
    const digits = (s.match(/\d/g) ?? []).length;
    const score =
      Math.max(0, 200 - Math.abs(len - 140)) + commas * 10 + digits * 2;
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const unique: string[] = [];
  for (const { s } of scored) {
    if (unique.length >= max) break;
    if (unique.some((u) => u.includes(s) || s.includes(u))) continue;
    unique.push(s);
  }
  return unique;
}

