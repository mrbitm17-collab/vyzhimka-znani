import { NextResponse } from "next/server";
import { getAuthorizedYoutubeClient } from "@/server/youtubeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { channelId?: string };
  const channelId = body?.channelId;
  if (!channelId) return NextResponse.json({ ok: false, error: "missing_channelId" }, { status: 400 });

  const youtube = await getAuthorizedYoutubeClient();
  const resp = await youtube.subscriptions.insert({
    part: ["snippet"],
    requestBody: {
      snippet: {
        resourceId: { kind: "youtube#channel", channelId },
      },
    },
  });

  return NextResponse.json({ ok: true, subscriptionId: resp.data.id });
}

