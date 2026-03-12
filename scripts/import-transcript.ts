import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/server/db";
import { cleanTranscript } from "../src/server/pipeline/text";

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const youtubeVideoId = getArg("youtubeVideoId");
  const file = getArg("file");
  if (!youtubeVideoId || !file) {
    throw new Error(
      'Usage: npm run import:transcript -- --youtubeVideoId "dQw4w9WgXcQ" --file "C:\\\\path\\\\transcript.txt"',
    );
  }

  const abs = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const raw = await fs.readFile(abs, "utf8");
  const cleaned = cleanTranscript(raw);

  const video = await prisma.video.findUnique({ where: { youtubeVideoId } });
  if (!video) throw new Error(`Video not found in DB: ${youtubeVideoId}. Run sync:youtube first.`);

  await prisma.transcript.upsert({
    where: { videoId: video.id },
    create: {
      videoId: video.id,
      source: "manual",
      rawText: raw,
      cleanedText: cleaned,
    },
    update: {
      source: "manual",
      rawText: raw,
      cleanedText: cleaned,
    },
  });

  console.log(JSON.stringify({ ok: true, youtubeVideoId, bytes: raw.length }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

