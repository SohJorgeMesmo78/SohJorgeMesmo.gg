import type { YoutubeLiveApiPayload } from './youtube-live-status';

const API_BASE = 'https://www.googleapis.com/youtube/v3';
const UPLOADS_PLAYLIST_ID = 'UUbmWTrqndKH7NilwHkv4oMg';

export async function fetchYoutubeLiveData(): Promise<YoutubeLiveApiPayload> {
  const apiKey = process.env['YOUTUBE_API_KEY']?.trim();
  if (!apiKey) return { available: false, isLive: false, checkedAt: new Date().toISOString() };

  try {
    const uploadsResponse = await fetch(`${API_BASE}/playlistItems?part=contentDetails&playlistId=${UPLOADS_PLAYLIST_ID}&maxResults=10&key=${encodeURIComponent(apiKey)}`);
    if (!uploadsResponse.ok) throw new Error(`uploads ${uploadsResponse.status}`);
    const uploads = await uploadsResponse.json() as { items?: Array<{ contentDetails?: { videoId?: string } }> };
    const ids = (uploads.items ?? []).map((item) => item.contentDetails?.videoId).filter((id): id is string => Boolean(id));
    if (!ids.length) throw new Error('no candidates');
    const videosResponse = await fetch(`${API_BASE}/videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(ids.join(','))}&key=${encodeURIComponent(apiKey)}`);
    if (!videosResponse.ok) throw new Error(`videos ${videosResponse.status}`);
    const videos = await videosResponse.json() as { items?: Array<{ snippet?: { liveBroadcastContent?: string } }> };
    return { available: true, isLive: (videos.items ?? []).some((item) => item.snippet?.liveBroadcastContent === 'live'), checkedAt: new Date().toISOString() };
  } catch (error) {
    console.error('[YouTube Live API] SSR status failed.', { message: error instanceof Error ? error.message : 'unknown' });
    return { available: false, isLive: false, checkedAt: new Date().toISOString() };
  }
}
