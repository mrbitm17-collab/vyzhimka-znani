import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeType(type: string | null) {
  switch (type) {
    case "segments":
    case "workbooks":
    case "library":
    case "all":
      return type;
    default:
      return "segments";
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const type = normalizeType(url.searchParams.get("type"));

  if (!q) {
    return NextResponse.json({ q, type, items: [] });
  }

  const take = 25;

  const [segments, workbooks, library] = await Promise.all([
    type === "segments" || type === "all"
      ? prisma.segment.findMany({
          take,
          where: { text: { contains: q } },
          orderBy: { createdAt: "desc" },
          include: { video: { include: { channel: true } } },
        })
      : Promise.resolve([]),
    type === "workbooks" || type === "all"
      ? prisma.workbook.findMany({
          take,
          where: {
            OR: [
              { title: { contains: q } },
              { summary: { contains: q } },
              { speaker: { contains: q } },
              { markdown: { contains: q } },
            ],
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    type === "library" || type === "all"
      ? prisma.libraryItem.findMany({
          take,
          where: {
            OR: [
              { title: { contains: q } },
              { summary: { contains: q } },
              { slug: { contains: q } },
              { markdown: { contains: q } },
            ],
          },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json({
    q,
    type,
    items: [
      ...segments.map((s) => ({
        type: "segment",
        id: s.id,
        text: s.text,
        startSec: s.startSec,
        endSec: s.endSec,
        video: {
          youtubeVideoId: s.video.youtubeVideoId,
          title: s.video.title,
          channelTitle: s.video.channel.title,
        },
        url: `/video/${s.video.youtubeVideoId}`,
      })),
      ...workbooks.map((w) => ({
        type: "workbook",
        id: w.id,
        title: w.title,
        speaker: w.speaker,
        summary: w.summary,
        url: `/workbook/${w.id}`,
        urlMd: `/workbook/${w.id}.md`,
      })),
      ...library.map((l) => ({
        type: "library",
        id: l.id,
        slug: l.slug,
        title: l.title,
        summary: l.summary,
        url: `/library/${l.slug}`,
        urlMd: `/library/${l.slug}.md`,
      })),
    ],
  });
}

