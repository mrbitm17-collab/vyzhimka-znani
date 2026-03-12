import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getGoogleOAuthClient } from "@/server/googleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
  }

  const oauth2 = getGoogleOAuthClient();
  const { tokens } = await oauth2.getToken(code);

  await prisma.authToken.upsert({
    where: { provider: "google" },
    create: {
      provider: "google",
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      tokenType: tokens.token_type ?? null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
    update: {
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token ?? null,
      scope: tokens.scope ?? null,
      tokenType: tokens.token_type ?? null,
      expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });

  // Minimal local session indicator (single-user install)
  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set("ez_google_authed", "1", { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}

