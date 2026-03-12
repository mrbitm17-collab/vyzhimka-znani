import { NextResponse } from "next/server";
import { getGoogleOAuthClient, YOUTUBE_SCOPES } from "@/server/googleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const oauth2 = getGoogleOAuthClient();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: YOUTUBE_SCOPES,
  });
  return NextResponse.redirect(url);
}

