import { NextResponse } from "next/server";
import { getAuthorizedYoutubeClient } from "@/server/youtubeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { subscriptionId?: string };
  const subscriptionId = body?.subscriptionId;
  if (!subscriptionId) {
    return NextResponse.json({ ok: false, error: "missing_subscriptionId" }, { status: 400 });
  }

  const youtube = await getAuthorizedYoutubeClient();
  await youtube.subscriptions.delete({ id: subscriptionId });
  return NextResponse.json({ ok: true });
}

