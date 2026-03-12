import { prisma } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const match = url.pathname.match(/^\/workbook\/(.+)\.md$/);
  const id = match?.[1];
  if (!id) return new Response("Not found", { status: 404 });

  const wb = await prisma.workbook.findUnique({ where: { id } });
  if (!wb || !wb.markdown) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(wb.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

