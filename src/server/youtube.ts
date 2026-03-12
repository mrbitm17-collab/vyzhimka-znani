const YT_API_BASE = "https://www.googleapis.com/youtube/v3";

export type YouTubeChannel = {
  id: string;
  title: string;
  description?: string;
  customUrl?: string;
  publishedAt?: string;
  thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  uploadsPlaylistId?: string;
};

export type YouTubeVideo = {
  id: string;
  title: string;
  description?: string;
  publishedAt?: string;
  thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  duration?: string; // ISO8601
  viewCount?: string;
  defaultLanguage?: string;
};

function requireApiKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error("Missing YOUTUBE_API_KEY in .env");
  return key;
}

async function ytFetch<T>(path: string, params: Record<string, string>) {
  const key = requireApiKey();
  const url = new URL(`${YT_API_BASE}${path}`);
  url.searchParams.set("key", key);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube API ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return (await res.json()) as T;
}

export async function fetchChannel(youtubeChannelId: string): Promise<YouTubeChannel> {
  const data = await ytFetch<{
    items?: Array<{
      id: string;
      snippet?: {
        title: string;
        description?: string;
        customUrl?: string;
        publishedAt?: string;
        thumbnails?: any;
      };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  }>("/channels", {
    part: "snippet,contentDetails",
    id: youtubeChannelId,
    maxResults: "1",
  });

  const item = data.items?.[0];
  if (!item?.id || !item.snippet?.title) throw new Error("Channel not found");

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    customUrl: item.snippet.customUrl,
    publishedAt: item.snippet.publishedAt,
    thumbnails: item.snippet.thumbnails,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  };
}

export async function listUploadsPlaylistVideoIds(uploadsPlaylistId: string) {
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  while (true) {
    const data = await ytFetch<{
      nextPageToken?: string;
      items?: Array<{ contentDetails?: { videoId?: string } }>;
    }>("/playlistItems", {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "50",
      ...(pageToken ? { pageToken } : {}),
    });

    for (const it of data.items ?? []) {
      const id = it.contentDetails?.videoId;
      if (id) videoIds.push(id);
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return videoIds;
}

export async function fetchVideos(youtubeVideoIds: string[]): Promise<YouTubeVideo[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < youtubeVideoIds.length; i += 50) {
    chunks.push(youtubeVideoIds.slice(i, i + 50));
  }

  const out: YouTubeVideo[] = [];
  for (const chunk of chunks) {
    const data = await ytFetch<{
      items?: Array<{
        id: string;
        snippet?: any;
        contentDetails?: any;
        statistics?: any;
      }>;
    }>("/videos", {
      part: "snippet,contentDetails,statistics",
      id: chunk.join(","),
      maxResults: "50",
    });

    for (const it of data.items ?? []) {
      out.push({
        id: it.id,
        title: it.snippet?.title ?? it.id,
        description: it.snippet?.description,
        publishedAt: it.snippet?.publishedAt,
        thumbnails: it.snippet?.thumbnails,
        duration: it.contentDetails?.duration,
        viewCount: it.statistics?.viewCount,
        defaultLanguage: it.snippet?.defaultLanguage,
      });
    }
  }

  return out;
}

export function parseIsoDurationToSeconds(iso?: string): number | null {
  if (!iso) return null;
  // PT#H#M#S
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = m[2] ? Number(m[2]) : 0;
  const s = m[3] ? Number(m[3]) : 0;
  return h * 3600 + min * 60 + s;
}

