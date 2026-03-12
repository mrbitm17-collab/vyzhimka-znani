import { NextResponse } from "next/server";
import { getAuthorizedYoutubeClient } from "@/server/youtubeAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const youtube = await getAuthorizedYoutubeClient();
  const resp = await youtube.subscriptions.list({
    part: ["snippet"],
    mine: true,
    maxResults: 50,
  });

  return NextResponse.json({
    items:
      resp.data.items?.map((s) => ({
        id: s.id,
        channelId: s.snippet?.resourceId?.channelId,
        title: s.snippet?.title,
      })) ?? [],
  });
}

