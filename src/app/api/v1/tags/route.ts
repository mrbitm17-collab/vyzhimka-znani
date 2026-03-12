import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: {
      channels: true,
      videos: true,
      segments: true,
      workbooks: true,
      library: true,
    },
  });

  return NextResponse.json({
    items: tags.map((t) => ({
      name: t.name,
      counts: {
        channels: t.channels.length,
        videos: t.videos.length,
        segments: t.segments.length,
        workbooks: t.workbooks.length,
        library: t.library.length,
      },
    })),
  });
}

