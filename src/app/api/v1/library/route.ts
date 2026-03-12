import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await prisma.libraryItem.findMany({
    orderBy: { updatedAt: "desc" },
    include: { tags: { include: { tag: true } } },
  });

  return NextResponse.json({
    items: items.map((l) => ({
      slug: l.slug,
      title: l.title,
      summary: l.summary,
      tags: l.tags.map((t) => t.tag.name),
      updatedAt: l.updatedAt,
      url: `/library/${l.slug}`,
      urlMd: `/library/${l.slug}.md`,
    })),
  });
}

