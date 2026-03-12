import "dotenv/config";
import { prisma } from "../src/server/db";
import { cleanTranscript, extractKeySentences, splitIntoSegments } from "../src/server/pipeline/text";
import { generateWorkbookJson, generateWorkbookMarkdown } from "../src/server/pipeline/workbook";

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const youtubeVideoId = getArg("youtubeVideoId");
  if (!youtubeVideoId) {
    throw new Error('Usage: npm run pipeline:video -- --youtubeVideoId "dQw4w9WgXcQ"');
  }

  const video = await prisma.video.findUnique({
    where: { youtubeVideoId },
    include: { transcript: true },
  });
  if (!video) throw new Error(`Video not found: ${youtubeVideoId}`);
  if (!video.transcript?.rawText && !video.transcript?.cleanedText) {
    throw new Error(`Transcript missing for ${youtubeVideoId}. Use import:transcript first.`);
  }

  const cleaned = cleanTranscript(video.transcript.cleanedText ?? video.transcript.rawText);

  // (Re)create segments
  await prisma.segment.deleteMany({ where: { videoId: video.id } });
  const segs = splitIntoSegments(cleaned, { maxChars: 900 });
  await prisma.segment.createMany({
    data: segs.map((text) => ({ videoId: video.id, text })),
  });

  const { summary, markdown } = generateWorkbookMarkdown({ video, cleanedTranscript: cleaned });
  const bullets = extractKeySentences(cleaned, 10);
  const json = generateWorkbookJson({
    video,
    summary,
    cleanedTranscript: cleaned,
    bullets,
  });

  const workbook = await prisma.workbook.upsert({
    where: { videoId: video.id },
    create: {
      videoId: video.id,
      title: video.title,
      speaker: null,
      summary,
      markdown,
      json,
    },
    update: {
      title: video.title,
      summary,
      markdown,
      json,
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        youtubeVideoId,
        segments: segs.length,
        workbookId: workbook.id,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

