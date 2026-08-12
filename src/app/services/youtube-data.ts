import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  latestVideoPlaceholder,
  youtubeChannelPlaceholder,
} from '../hub.config';

export interface YoutubeApiPayload {
  channelUrl: string;
  channelName: string;
  subscriberCount: string;
  videoTitle: string;
  videoPublishedAt: string;
  videoUrl: string;
  thumbnailUrl: string;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_LOOKUP_QUERY = 'SohJorgeMesmo-gg';

function loadEnvFileValue(key: string): string | undefined {
  const envPath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envPath)) {
    return undefined;
  }

  const raw = readFileSync(envPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [name, ...valueParts] = trimmed.split('=');
    if (name?.trim() === key) {
      return valueParts.join('=').trim();
    }
  }

  return undefined;
}

function getYoutubeApiKey(): string | undefined {
  const fromEnv = process.env['YOUTUBE_API_KEY']?.trim();
  const fromFile = loadEnvFileValue('YOUTUBE_API_KEY');
  return fromEnv || fromFile;
}

function createYoutubeFallbackPayload(): YoutubeApiPayload {
  return {
    channelUrl: youtubeChannelPlaceholder.externalUrl,
    channelName: youtubeChannelPlaceholder.name,
    subscriberCount: youtubeChannelPlaceholder.subscriberCount,
    videoTitle: latestVideoPlaceholder.title,
    videoPublishedAt: latestVideoPlaceholder.date,
    videoUrl: latestVideoPlaceholder.externalUrl,
    thumbnailUrl: latestVideoPlaceholder.thumbnailUrl,
  };
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`YouTube API request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

async function findChannelId(apiKey: string): Promise<string> {
  const url = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(
    CHANNEL_LOOKUP_QUERY,
  )}&key=${encodeURIComponent(apiKey)}`;

  const data = await requestJson<{ items?: Array<{ id?: { channelId?: string } }> }>(url);
  const channelId = data.items?.[0]?.id?.channelId;

  if (!channelId) {
    throw new Error('Unable to resolve YouTube channel id for SohJorgeMesmo.');
  }

  return channelId;
}

async function getChannelData(channelId: string, apiKey: string) {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(
    channelId,
  )}&key=${encodeURIComponent(apiKey)}`;

  const data = await requestJson<{
    items?: Array<{
      snippet?: { title?: string };
      statistics?: { subscriberCount?: string };
    }>;
  }>(url);

  const result = data.items?.[0];

  if (!result) {
    throw new Error('Unable to fetch YouTube channel data.');
  }

  return {
    channelName: result.snippet?.title ?? youtubeChannelPlaceholder.name,
    subscriberCount: result.statistics?.subscriberCount ?? youtubeChannelPlaceholder.subscriberCount,
  };
}

async function getLatestVideo(channelId: string, apiKey: string) {
  const url = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${encodeURIComponent(
    channelId,
  )}&order=date&type=video&maxResults=1&key=${encodeURIComponent(apiKey)}`;

  const data = await requestJson<{
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        publishedAt?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  }>(url);

  const video = data.items?.[0];

  if (!video) {
    throw new Error('Unable to fetch the latest YouTube video.');
  }

  const thumbnailUrl =
    video.snippet?.thumbnails?.high?.url ||
    video.snippet?.thumbnails?.medium?.url ||
    video.snippet?.thumbnails?.default?.url ||
    latestVideoPlaceholder.thumbnailUrl;

  return {
    videoTitle: video.snippet?.title ?? latestVideoPlaceholder.title,
    videoPublishedAt: video.snippet?.publishedAt ?? latestVideoPlaceholder.date,
    videoUrl: video.id?.videoId
      ? `https://www.youtube.com/watch?v=${video.id.videoId}`
      : latestVideoPlaceholder.externalUrl,
    thumbnailUrl,
  };
}

export async function fetchYoutubeData(): Promise<YoutubeApiPayload> {
  const apiKey = getYoutubeApiKey();

  if (!apiKey) {
    return createYoutubeFallbackPayload();
  }

  try {
    const channelId = await findChannelId(apiKey);
    const channelData = await getChannelData(channelId, apiKey);
    const latestVideo = await getLatestVideo(channelId, apiKey);

    return {
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      channelName: channelData.channelName,
      subscriberCount: channelData.subscriberCount,
      videoTitle: latestVideo.videoTitle,
      videoPublishedAt: latestVideo.videoPublishedAt,
      videoUrl: latestVideo.videoUrl,
      thumbnailUrl: latestVideo.thumbnailUrl,
    };
  } catch (error) {
    console.error('[YouTube API] fetchYoutubeData failed:', error);
    return createYoutubeFallbackPayload();
  }
}
