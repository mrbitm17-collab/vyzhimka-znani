import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, toInt(url.searchParams.get("limit"), 50)));
  const offset = Math.max(0, toInt(url.searchParams.get("offset"), 0));
  const type = url.searchParams.get("type") ?? "all"; // workbooks|library|videos|segments|all
  const tag = url.searchParams.get("tag") ?? null;

  const [workbooks, library] = await Promise.all([
    type === "all" || type === "workbooks"
      ? prisma.workbook.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: "desc" },
          where: tag
            ? { tags: { some: { tag: { name: tag } } } }
            : undefined,
          include: {
            video: { include: { channel: true } },
            tags: { include: { tag: true } },
          },
        })
      : Promise.resolve([]),
    type === "all" || type === "library"
      ? prisma.libraryItem.findMany({
          take: limit,
          skip: offset,
          orderBy: { updatedAt: "desc" },
          where: tag
            ? { tags: { some: { tag: { name: tag } } } }
            : undefined,
          include: { tags: { include: { tag: true } } },
        })
      : Promise.resolve([]),
  ]);

  const items = [
    ...workbooks.map((w) => ({
      type: "workbook",
      id: w.id,
      title: w.title,
      speaker: w.speaker,
      tags: w.tags.map((t) => t.tag.name),
      createdAt: w.createdAt,
      url: `/workbook/${w.id}`,
      urlMd: `/workbook/${w.id}.md`,
      video: {
        youtubeVideoId: w.video.youtubeVideoId,
        title: w.video.title,
        publishedAt: w.video.publishedAt,
        channel: {
          youtubeChannelId: w.video.channel.youtubeChannelId,
          title: w.video.channel.title,
        },
      },
    })),
    ...library.map((l) => ({
      type: "library",
      id: l.id,
      slug: l.slug,
      title: l.title,
      tags: l.tags.map((t) => t.tag.name),
      updatedAt: l.updatedAt,
      url: `/library/${l.slug}`,
      urlMd: `/library/${l.slug}.md`,
    })),
  ];

  return NextResponse.json({
    items,
    meta: {
      limit,
      offset,
      type,
      tag,
    },
  });
}

