import "server-only";
import { google } from "googleapis";

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET / GOOGLE_OAUTH_REDIRECT_URL in .env",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const YOUTUBE_SCOPES = [
  // manage subscriptions, playlists, etc.
  "https://www.googleapis.com/auth/youtube",
];

