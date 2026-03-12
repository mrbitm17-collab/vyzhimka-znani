import "dotenv/config";
import { prisma } from "../src/server/db";
import {
  fetchChannel,
  fetchVideos,
  listUploadsPlaylistVideoIds,
  parseIsoDurationToSeconds,
} from "../src/server/youtube";

const CHANNELS = [
  { ytId: "UCcz_GEYeb44A2JE7vtTR_ig", category: "business" },
  { ytId: "UC0yHbz4OxdQFwmVX2BBQqLg", category: "AI" },
  { ytId: "UCxLQz3Bhp6fxDnT4J5zwnvQ", category: "AI" },
  { ytId: "UCW6QeFhV3uUJi0fvjYdkqzg", category: "AI" },
  { ytId: "UCfQNB91qRP_5ILeu_S_bSkg", category: "AI" },
  { ytId: "UCrDwWp7EBBv4NwvScIpBDOA", category: "AI" },
  { ytId: "UCId9a_jQqvJre0_dE2lE_Rw", category: "tech" },
  { ytId: "UCSxPE9PHHxQUEt6ajGmQyMA", category: "AI" },
  { ytId: "UC2gtQOm5jFEASO6mg_ibT_Q", category: "AI" },
  { ytId: "UCuKVsDS3oVzTuNjnQ79pEEg", category: "tech" },
  { ytId: "UCwAnu01qlnVg1Ai2AbtTMaA", category: "productivity" },
  { ytId: "UCGpsgNbzdF7BECCVbB1COHw", category: "SEO" },
  { ytId: "UCtgZ4-4GI85PPMCCgzrdBgA", category: "AI" },
  { ytId: "UCxgAuX3XZROujMmGphN_scA", category: "finance" },
  { ytId: "UC2ojq-nuP8ceeHqiroeKhBA", category: "AI" },
  { ytId: "UCM_ka9z2rAH6wSSjfdhRgVw", category: "AI" },
  { ytId: "UCmeU2DYiVy80wMBGZzEWnbw", category: "AI" },
  { ytId: "UCnpBg7yqNauHtlNSpOl5-cg", category: "tech" },
  { ytId: "UCLA7cJBnqr0nLF2bQBD9uUg", category: "AI" },
  { ytId: "UCLk7uewdd5s7kszfy736ScA", category: "AI" },
  { ytId: "UCH6k750mdcOXU6PYHSCOlrA", category: "business" },
  { ytId: "UCmxeYVU2qMS-w5G3QQpQ1tA", category: "AI" },
  { ytId: "UCO66zvpQorlNfs_7hFCfmaw", category: "education" },
  { ytId: "UCAuUUnT6oDeKwE6v1NGQxug", category: "education" },
  { ytId: "UCHhYXsLBEVVnbvsq57n1MTQ", category: "AI" },
  { ytId: "UC2UXDak6o7rBm23k3Vv5dww", category: "tech" },
  { ytId: "UCYwLV1gDwzGbg7jXQ52bVnQ", category: "AI" },
  { ytId: "UClXAalunTPaX1YV185DWUeg", category: "AI" },
  { ytId: "UCuaYG7fdQ-4myL_CVtvwNHQ", category: "business" },
  { ytId: "UCaR6XjSJJsLbKN3n6VYsGKw", category: "business" },
  { ytId: "UCVVNJJXC7TQgPpAjQdgrqNw", category: "business" },
  { ytId: "UCgdWHRfIsTD6HzSTBUAIsGw", category: "tech" },
  { ytId: "UCjiDBsEL3QtROdoM-FphuKQ", category: "productivity" },
  { ytId: "UCoVpToOpCIPNOxdGHBsLRkw", category: "business" },
  { ytId: "UCEbHY5kY9881hKPNrRtxfhQ", category: "business" },
  { ytId: "UCLkP6wuW_P2hnagdaZMBtCw", category: "AI" },
  { ytId: "UCfu0YIJFvtMYFxvI1r5HPpg", category: "AI" },
  { ytId: "UCq_L4pHHIuWBW6OSKKxBbgw", category: "AI" },
  { ytId: "UCfEJzUftrJW0GhFuY-jOJ7A", category: "business" },
  { ytId: "UCoosOi7ok8jJKl7rb0xhlWQ", category: "tech" },
  { ytId: "UCL-HTw4Wfi9Igh9r1CBrrDA", category: "business" },
  { ytId: "UCFJnZHIusOlHr-pbYVHmr-A", category: "business" },
  { ytId: "UCqy1GczwhhO9p7dfx7FzhMw", category: "business" },
  { ytId: "UCKyNmWAGzC-qhRxKg89Y9lg", category: "education" },
  { ytId: "UCy5E4aFQdeX9cvRC4sttsSw", category: "health" },
];

async function syncChannel(ytId: string) {
  const ch = await fetchChannel(ytId);
  if (!ch.uploadsPlaylistId) {
    console.log(`  [SKIP] No uploads playlist for ${ch.title}`);
    return { title: ch.title, videos: 0 };
  }

  await prisma.channel.upsert({
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

  const channel = await prisma.channel.findUnique({ where: { youtubeChannelId: ch.id } });
  if (!channel) throw new Error("Channel not found after upsert");

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
    upserted++;
  }

  return { title: ch.title, videos: upserted };
}

async function main() {
  console.log(`Starting sync of ${CHANNELS.length} channels...\n`);
  let totalVideos = 0;
  let synced = 0;

  for (const { ytId } of CHANNELS) {
    try {
      const result = await syncChannel(ytId);
      synced++;
      totalVideos += result.videos;
      console.log(`[${synced}/${CHANNELS.length}] ${result.title}: ${result.videos} videos`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[${synced + 1}/${CHANNELS.length}] ERROR for ${ytId}: ${msg}`);
      synced++;
    }
  }

  console.log(`\nDone! Synced ${synced} channels, ${totalVideos} total videos.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
