import "dotenv/config";
import { prisma } from "../src/server/db";

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function getMultiArg(name: string) {
  const out: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === `--${name}` && process.argv[i + 1]) {
      out.push(process.argv[i + 1]!);
      i++;
    }
  }
  return out;
}

async function main() {
  const slug = getArg("slug");
  const title = getArg("title");
  const videoIds = getMultiArg("youtubeVideoId");

  if (!slug || !title || videoIds.length === 0) {
    throw new Error(
      'Usage: npm run pipeline:library -- --slug "workflow" --title "Рабочий процесс" --youtubeVideoId "id1" --youtubeVideoId "id2"',
    );
  }

  const videos = await prisma.video.findMany({
    where: { youtubeVideoId: { in: videoIds } },
    include: { workbook: true, channel: true },
  });

  const missing = videoIds.filter((id) => !videos.some((v) => v.youtubeVideoId === id));
  if (missing.length) throw new Error(`Missing videos in DB: ${missing.join(", ")}`);

  const lines: string[] = [];
  lines.push(`# ${title}`);
  lines.push("");
  lines.push(`Дистиллят (черновик). Собран из ${videos.length} видео.`);
  lines.push("");
  lines.push("## Источники");
  lines.push("");
  for (const v of videos) {
    lines.push(
      `- ${v.channel.title}: ${v.title} (YouTube: \`${v.youtubeVideoId}\`)`,
    );
  }
  lines.push("");

  lines.push("## Ключевые идеи (агрегация)");
  lines.push("");
  for (const v of videos) {
    if (!v.workbook?.summary) continue;
    lines.push(`### ${v.title}`);
    lines.push("");
    lines.push(v.workbook.summary);
    lines.push("");
  }

  const markdown = lines.join("\n");

  const item = await prisma.libraryItem.upsert({
    where: { slug },
    create: { slug, title, summary: null, markdown, json: { videoIds } },
    update: { title, markdown, json: { videoIds } },
  });

  console.log(JSON.stringify({ ok: true, slug: item.slug }, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

