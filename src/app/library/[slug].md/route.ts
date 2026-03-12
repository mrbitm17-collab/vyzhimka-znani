import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/library\/(.+)\.md$/);
  const slug = match?.[1];
  if (!slug) return new Response("Not found", { status: 404 });

  const item = await prisma.libraryItem.findUnique({ where: { slug } });
  if (!item || !item.markdown) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(item.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

