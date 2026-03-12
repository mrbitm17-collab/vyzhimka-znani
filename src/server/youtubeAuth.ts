import "server-only";
import { google } from "googleapis";
import { prisma } from "@/server/db";
import { getGoogleOAuthClient } from "@/server/googleAuth";

export async function getAuthorizedYoutubeClient() {
  const token = await prisma.authToken.findUnique({ where: { provider: "google" } });
  if (!token?.refreshToken) {
    throw new Error("Not authenticated with Google yet. Visit /api/auth/google/start");
  }

  const oauth2 = getGoogleOAuthClient();
  oauth2.setCredentials({
    access_token: token.accessToken ?? undefined,
    refresh_token: token.refreshToken ?? undefined,
    scope: token.scope ?? undefined,
    token_type: token.tokenType ?? undefined,
    expiry_date: token.expiryDate ? token.expiryDate.getTime() : undefined,
  });

  // Persist refreshed tokens automatically when they change
  oauth2.on("tokens", async (tokens) => {
    await prisma.authToken.upsert({
      where: { provider: "google" },
      create: {
        provider: "google",
        accessToken: tokens.access_token ?? null,
        refreshToken: tokens.refresh_token ?? token.refreshToken ?? null,
        scope: tokens.scope ?? token.scope ?? null,
        tokenType: tokens.token_type ?? token.tokenType ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : token.expiryDate ?? null,
      },
      update: {
        accessToken: tokens.access_token ?? token.accessToken ?? null,
        refreshToken: tokens.refresh_token ?? token.refreshToken ?? null,
        scope: tokens.scope ?? token.scope ?? null,
        tokenType: tokens.token_type ?? token.tokenType ?? null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : token.expiryDate ?? null,
      },
    });
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2 });
  return youtube;
}

