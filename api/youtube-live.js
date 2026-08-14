const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOADS_PLAYLIST_ID = 'UUbmWTrqndKH7NilwHkv4oMg';
const LIVE_CACHE_SECONDS = 45;
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' || (!process.env.VERCEL_ENV && !process.env.NODE_ENV);

function setHeaders(res, cacheable) {
  if (isDevelopment || !cacheable) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    return;
  }

  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${LIVE_CACHE_SECONDS}`);
  res.setHeader('CDN-Cache-Control', `public, max-age=${LIVE_CACHE_SECONDS}`);
  res.setHeader('Vercel-CDN-Cache-Control', `public, max-age=${LIVE_CACHE_SECONDS}`);
}

async function requestJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`YouTube live status request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

module.exports = async function handler(req, res) {
  setHeaders(res, false);

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!apiKey) {
    console.error('[YouTube Live API] YOUTUBE_API_KEY configured: false');
    return res.status(isDevelopment ? 500 : 200).json({ available: false, isLive: false, checkedAt: new Date().toISOString() });
  }

  try {
    const uploadsUrl = `${YOUTUBE_API_BASE}/playlistItems?part=contentDetails&playlistId=${encodeURIComponent(YOUTUBE_UPLOADS_PLAYLIST_ID)}&maxResults=10&key=${encodeURIComponent(apiKey)}`;
    const uploads = await requestJson(uploadsUrl);
    const videoIds = (uploads.items ?? []).map((item) => item.contentDetails?.videoId).filter(Boolean);

    if (videoIds.length === 0) {
      throw Object.assign(new Error('YouTube uploads playlist returned no candidates.'), { status: 502 });
    }

    const videosUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,liveStreamingDetails&id=${encodeURIComponent(videoIds.join(','))}&key=${encodeURIComponent(apiKey)}`;
    const videos = await requestJson(videosUrl);
    const isLive = (videos.items ?? []).some((item) => item.snippet?.liveBroadcastContent === 'live');
    const payload = { available: true, isLive, checkedAt: new Date().toISOString() };

    console.log('[YouTube Live API]', { available: true, isLive, candidates: videoIds.length });
    setHeaders(res, true);
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[YouTube Live API] Function failed.', {
      keyConfigured: true,
      status: error.status || 500,
      message: error.message || 'Unknown YouTube live status error.',
    });
    return res.status(isDevelopment ? (error.status || 500) : 200).json({
      available: false,
      isLive: false,
      checkedAt: new Date().toISOString(),
    });
  }
};
