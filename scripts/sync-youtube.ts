import "dotenv/config";
import { prisma } from "../src/server/db";
import {
  fetchChannel,
  fetchVideos,
  listUploadsPlaylistVideoIds,
  parseIsoDurationToSeconds,
} from "../src/server/youtube";

function getArg(name: string) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

async function main() {
  const channelId = getArg("channelId");
  if (!channelId) {
    throw new Error('Usage: npm run sync:youtube -- --channelId "UCxxxx"');
  }

  const ch = await fetchChannel(channelId);
  if (!ch.uploadsPlaylistId) throw new Error("Channel has no uploads playlist id");

  const channel = await prisma.channel.upsert({
    where: { youtubeChannelId: ch.id },
    create: {
      youtubeChannelId: ch.id,
      title: ch.title,
      handle: ch.customUrl,
      description: ch.description,
      thumbnailUrl: ch.thumbnails?.high?.url ?? ch.thumbnails?.default?.url ?? null,
      lastSyncAt: new Date(),
    },
    update: {
      title: ch.title,
      handle: ch.customUrl,
      description: ch.description,
      thumbnailUrl: ch.thumbnails?.high?.url ?? ch.thumbnails?.default?.url ?? null,
      lastSyncAt: new Date(),
    },
  });

  const videoIds = await listUploadsPlaylistVideoIds(ch.uploadsPlaylistId);
  const videos = await fetchVideos(videoIds);

  let upserted = 0;
  for (const v of videos) {
    await prisma.video.upsert({
      where: { youtubeVideoId: v.id },
      create: {
        youtubeVideoId: v.id,
        channelId: channel.id,
        title: v.title,
        description: v.description,
        publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
        durationSec: parseIsoDurationToSeconds(v.duration),
        views: v.viewCount ? Number(v.viewCount) : null,
        thumbnailUrl: v.thumbnails?.high?.url ?? v.thumbnails?.default?.url ?? null,
        language: v.defaultLanguage ?? null,
        lastSyncAt: new Date(),
      },
      update: {
        channelId: channel.id,
        title: v.title,
        description: v.description,
        publishedAt: v.publishedAt ? new Date(v.publishedAt) : null,
        durationSec: parseIsoDurationToSeconds(v.duration),
        views: v.viewCount ? Number(v.viewCount) : null,
        thumbnailUrl: v.thumbnails?.high?.url ?? v.thumbnails?.default?.url ?? null,
        language: v.defaultLanguage ?? null,
        lastSyncAt: new Date(),
      },
    });
    upserted += 1;
  }

  console.log(
    JSON.stringify(
      {
        channel: { youtubeChannelId: ch.id, title: ch.title },
        videos: { total: videos.length, upserted },
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

