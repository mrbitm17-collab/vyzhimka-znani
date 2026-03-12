import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = await prisma.libraryItem.findUnique({
    where: { slug },
    include: { tags: { include: { tag: true } } },
  });

  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    tags: item.tags.map((t) => t.tag.name),
    markdown: item.markdown,
    json: item.json,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  });
}

