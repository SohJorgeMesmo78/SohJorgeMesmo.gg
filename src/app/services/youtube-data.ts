import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  latestVideoPlaceholder,
  youtubeChannelPlaceholder,
} from '../hub.config';
import type { YoutubeApiPayload } from './youtube-api-payload';
export type { YoutubeApiPayload } from './youtube-api-payload';

interface YoutubeCallError extends Error {
  status?: number;
  url?: string;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_CHANNEL_ID = 'UCbmWTrqndKH7NilwHkv4oMg';
const MAX_UPLOAD_PAGES = 3;
const MAX_UPLOAD_RESULTS_PER_PAGE = 50;
const isDevelopment = process.env['NODE_ENV'] === 'development' || process.env['VERCEL_ENV'] === 'development' || (!process.env['VERCEL_ENV'] && !process.env['NODE_ENV']);

function redactApiKey(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.searchParams.has('key')) {
      parsed.searchParams.set('key', '[REDACTED]');
    }
    return parsed.toString();
  } catch {
    return url.replace(/key=([^&]+)/gi, 'key=[REDACTED]');
  }
}

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
    available: false,
    videoAvailable: false,
    channelUrl: youtubeChannelPlaceholder.externalUrl,
    channelName: youtubeChannelPlaceholder.name,
    subscriberCount: youtubeChannelPlaceholder.subscriberCount,
    videoTitle: null,
    videoPublishedAt: null,
    videoUrl: null,
    thumbnailUrl: latestVideoPlaceholder.thumbnailUrl,
  };
}

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    let quotaReason: string | undefined;

    try {
      const errorBody = JSON.parse(message) as {
        error?: { errors?: Array<{ reason?: string }> };
      };
      quotaReason = errorBody.error?.errors?.find((item) =>
        ['quotaExceeded', 'rateLimitExceeded'].includes(item.reason ?? ''),
      )?.reason;
    } catch {
      quotaReason = undefined;
    }

    if (response.status === 429 || quotaReason) {
      console.error('[YouTube API] Quota limit reached.', {
        status: response.status,
        reason: quotaReason ?? 'HTTP 429',
      });
    }

    const error = new Error(`YouTube API request failed (${response.status}): ${message}`) as YoutubeCallError;
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return (await response.json()) as T;
}

async function getChannelData(channelId: string, apiKey: string) {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(
    channelId,
  )}&key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await requestJson<{
      items?: Array<{
        snippet?: { title?: string };
        statistics?: { subscriberCount?: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }>;
    }>(url);

    const result = data.items?.[0];

    if (!result) {
      throw new Error('Unable to fetch YouTube channel data.');
    }

    return {
      channelName: result.snippet?.title ?? youtubeChannelPlaceholder.name,
      subscriberCount: result.statistics?.subscriberCount ?? youtubeChannelPlaceholder.subscriberCount,
      uploadsPlaylistId: result.contentDetails?.relatedPlaylists?.uploads,
    };
  } catch (error) {
    const typedError = error as YoutubeCallError;
    typedError.url = url;
    throw typedError;
  }
}

function parseYouTubeDuration(duration?: string): number {
  if (!duration) {
    return 0;
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return 0;
  }

  const [, hours = '0', minutes = '0', seconds = '0'] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

async function getLatestVideo(uploadsPlaylistId: string, apiKey: string) {
  let nextPageToken: string | undefined;
  let isLive = false;

  for (let pageIndex = 0; pageIndex < MAX_UPLOAD_PAGES; pageIndex += 1) {
    const uploadsUrl = `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
      uploadsPlaylistId,
    )}&maxResults=${MAX_UPLOAD_RESULTS_PER_PAGE}${nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''}&key=${encodeURIComponent(apiKey)}`;

    try {
      const uploadsData = await requestJson<{
        nextPageToken?: string;
        items?: Array<{
          contentDetails?: { videoId?: string };
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
      }>(uploadsUrl);

      const videoIds = uploadsData.items
        ?.map((item) => item.contentDetails?.videoId)
        .filter((videoId): videoId is string => Boolean(videoId)) ?? [];

      if (videoIds.length === 0) {
        break;
      }

      const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status,liveStreamingDetails&id=${encodeURIComponent(
        videoIds.join(','),
      )}&key=${encodeURIComponent(apiKey)}`;

      const detailsData = await requestJson<{
        items?: Array<{
          id?: string;
          snippet?: {
            title?: string;
            publishedAt?: string;
            thumbnails?: {
              maxres?: { url?: string };
              standard?: { url?: string };
              high?: { url?: string };
              medium?: { url?: string };
              default?: { url?: string };
            };
            liveBroadcastContent?: string;
          };
          status?: { uploadStatus?: string };
          contentDetails?: { duration?: string };
          liveStreamingDetails?: Record<string, unknown> | null;
        }>;
      }>(detailsUrl);

      const detailsById = new Map(
        (detailsData.items ?? []).map((item) => [item.id, item] as const),
      );

      isLive = isLive || (detailsData.items ?? []).some(
        (item) => item.snippet?.liveBroadcastContent === 'live',
      );

      const validVideo = uploadsData.items?.find((item) => {
        const videoId = item.contentDetails?.videoId;
        if (!videoId) {
          return false;
        }

        const details = detailsById.get(videoId);
        if (!details) {
          return false;
        }

        const isLiveVideo = Boolean(details.liveStreamingDetails) || details.snippet?.liveBroadcastContent === 'live';
        const durationSeconds = parseYouTubeDuration(details.contentDetails?.duration);
        const isShortVideo = durationSeconds <= 180;

        return !isLiveVideo && !isShortVideo;
      });

      if (validVideo) {
        const selectedVideoId = validVideo.contentDetails?.videoId;
        const selectedDetails = selectedVideoId ? detailsById.get(selectedVideoId) : undefined;
        const thumbnails = selectedDetails?.snippet?.thumbnails;
        const thumbnailUrl =
          thumbnails?.maxres?.url ||
          thumbnails?.standard?.url ||
          thumbnails?.high?.url ||
          thumbnails?.medium?.url ||
          thumbnails?.default?.url ||
          latestVideoPlaceholder.thumbnailUrl;

        return {
          videoTitle: selectedDetails?.snippet?.title ?? validVideo.snippet?.title ?? latestVideoPlaceholder.title,
          videoPublishedAt:
            selectedDetails?.snippet?.publishedAt ?? validVideo.snippet?.publishedAt ?? latestVideoPlaceholder.date,
          videoUrl: selectedVideoId
            ? `https://www.youtube.com/watch?v=${selectedVideoId}`
            : latestVideoPlaceholder.externalUrl,
          thumbnailUrl,
          isLive,
        };
      }

      if (!uploadsData.nextPageToken) {
        break;
      }

      nextPageToken = uploadsData.nextPageToken;
    } catch (error) {
      const typedError = error as YoutubeCallError;
      typedError.url = uploadsUrl;
      throw typedError;
    }
  }

  return {
    videoTitle: null,
    videoPublishedAt: null,
    videoUrl: null,
    thumbnailUrl: '',
    isLive,
  };
}

export async function fetchYoutubeData(): Promise<YoutubeApiPayload> {
  const apiKey = getYoutubeApiKey();

  if (!apiKey) {
    const missing = {
      keyConfigured: false,
      status: 500,
      message: 'YOUTUBE_API_KEY is missing. Set it in the environment before calling the YouTube API.',
      url: undefined,
    };

    console.error('[YouTube API] Missing YOUTUBE_API_KEY.', missing);

    if (isDevelopment) {
      throw Object.assign(new Error(missing.message), {
        status: missing.status,
        url: missing.url,
      });
    }

    return createYoutubeFallbackPayload();
  }

  try {
    const channelData = await getChannelData(YOUTUBE_CHANNEL_ID, apiKey);

    if (!channelData.uploadsPlaylistId) {
      throw new Error('Unable to resolve the YouTube uploads playlist from channel data.');
    }

    const latestVideo = await getLatestVideo(channelData.uploadsPlaylistId, apiKey);

    return {
      available: true,
      videoAvailable: Boolean(
        latestVideo.videoTitle &&
        latestVideo.videoUrl &&
        latestVideo.thumbnailUrl &&
        latestVideo.videoPublishedAt &&
        !Number.isNaN(Date.parse(latestVideo.videoPublishedAt))
      ),
      channelUrl: `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`,
      channelName: channelData.channelName,
      subscriberCount: channelData.subscriberCount,
      videoTitle: latestVideo.videoTitle,
      videoPublishedAt: latestVideo.videoPublishedAt,
      videoUrl: latestVideo.videoUrl,
      thumbnailUrl: latestVideo.thumbnailUrl,
    };
  } catch (error) {
    const typedError = error as YoutubeCallError;
    const details = {
      keyConfigured: true,
      status: typedError.status || 500,
      message: typedError.message || 'Unknown YouTube API error.',
      url: typedError.url ? redactApiKey(typedError.url) : undefined,
    };

    console.error('[YouTube API] fetchYoutubeData failed:', details);

    if (isDevelopment) {
      throw Object.assign(new Error(details.message), {
        status: details.status,
        url: details.url,
      });
    }

    return createYoutubeFallbackPayload();
  }
}
