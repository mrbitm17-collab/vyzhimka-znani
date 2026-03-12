import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [channels, videos, transcripts, segments, workbooks, libraryItems, tags] =
    await Promise.all([
      prisma.channel.count(),
      prisma.video.count(),
      prisma.transcript.count(),
      prisma.segment.count(),
      prisma.workbook.count(),
      prisma.libraryItem.count(),
      prisma.tag.count(),
    ]);

  return NextResponse.json({
    counts: { channels, videos, transcripts, segments, workbooks, libraryItems, tags },
  });
}

