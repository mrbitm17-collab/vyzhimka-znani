import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const item = await prisma.workbook.findUnique({
    where: { id },
    include: {
      video: { include: { channel: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    id: item.id,
    title: item.title,
    speaker: item.speaker,
    summary: item.summary,
    tags: item.tags.map((t) => t.tag.name),
    markdown: item.markdown,
    json: item.json,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    video: {
      youtubeVideoId: item.video.youtubeVideoId,
      title: item.video.title,
      publishedAt: item.video.publishedAt,
      channel: {
        youtubeChannelId: item.video.channel.youtubeChannelId,
        title: item.video.channel.title,
      },
    },
  });
}

