const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_CHANNEL_ID = 'UCbmWTrqndKH7NilwHkv4oMg';
const MAX_UPLOAD_PAGES = 3;
const MAX_UPLOAD_RESULTS_PER_PAGE = 50;
const YOUTUBE_CACHE_SECONDS = 600;
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' || (!process.env.VERCEL_ENV && !process.env.NODE_ENV);

function logSafeStep(stage, details = {}) {
  const payload = {
    stage,
    keyConfigured: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
    ...details,
  };

  console.log('[YouTube API]', JSON.stringify(payload));
}

const fallbackPayload = {
  available: false,
  videoAvailable: false,
  isLive: false,
  channelUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
  channelName: 'SohJorgeMesmo',
  subscriberCount: '---',
  videoTitle: null,
  videoPublishedAt: null,
  videoUrl: null,
  thumbnailUrl: '',
};

function redactApiKey(url) {
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

function buildErrorPayload({ message, status, url, keyConfigured }) {
  return {
    error: {
      keyConfigured,
      status,
      message,
      url: url ? redactApiKey(url) : undefined,
    },
  };
}

function setCacheHeaders(res, cacheable) {
  if (isDevelopment || !cacheable) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('CDN-Cache-Control', 'no-store');
    res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    return;
  }

  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${YOUTUBE_CACHE_SECONDS}, stale-while-revalidate=60`);
  res.setHeader('CDN-Cache-Control', `public, max-age=${YOUTUBE_CACHE_SECONDS}`);
  res.setHeader('Vercel-CDN-Cache-Control', `public, max-age=${YOUTUBE_CACHE_SECONDS}`);
}

async function requestJson(url, stage) {
  const response = await fetch(url);
  const rawText = await response.text();

  if (!response.ok) {
    const message = rawText ? rawText.slice(0, 1000) : 'No response body';
    let quotaReason;

    try {
      const errorBody = JSON.parse(rawText);
      quotaReason = errorBody?.error?.errors?.find((item) =>
        ['quotaExceeded', 'rateLimitExceeded'].includes(item?.reason),
      )?.reason;
    } catch {
      quotaReason = undefined;
    }

    const error = new Error(
      `YouTube API request failed (${response.status}): ${message}`,
    );
    error.status = response.status;
    error.url = url;
    logSafeStep(stage, {
      status: response.status,
      ok: false,
      quotaExceeded: response.status === 429 || Boolean(quotaReason),
      quotaReason,
      message,
    });
    throw error;
  }

  let json;
  try {
    json = rawText ? JSON.parse(rawText) : {};
  } catch (parseError) {
    logSafeStep(stage, {
      status: response.status,
      ok: true,
      parseError: parseError.message,
    });
    return {};
  }

  logSafeStep(stage, {
    status: response.status,
    ok: true,
  });

  return json;
}

async function getChannelData(channelId, apiKey) {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${encodeURIComponent(
    channelId,
  )}&key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await requestJson(url, 'channel');
    const result = data.items?.[0];

    logSafeStep('channel', {
      subscriberCount: result?.statistics?.subscriberCount ?? 'not-found',
      channelTitle: result?.snippet?.title ?? 'not-found',
    });

    if (!result) {
      throw new Error('Unable to fetch YouTube channel data.');
    }

    return {
      channelName: result.snippet?.title ?? fallbackPayload.channelName,
      subscriberCount: result.statistics?.subscriberCount ?? fallbackPayload.subscriberCount,
      uploadsPlaylistId: result.contentDetails?.relatedPlaylists?.uploads,
    };
  } catch (error) {
    error.url = url;
    throw error;
  }
}

function parseYouTubeDuration(duration) {
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

async function getLatestVideo(uploadsPlaylistId, apiKey) {
  let nextPageToken;
  let pageIndex = 0;
  let latestLongFormVideo = null;
  let isLive = false;

  while (pageIndex < MAX_UPLOAD_PAGES) {
    const uploadsUrl = `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
      uploadsPlaylistId,
    )}&maxResults=${MAX_UPLOAD_RESULTS_PER_PAGE}${nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''}&key=${encodeURIComponent(apiKey)}`;

    pageIndex += 1;

    try {
      const uploadsData = await requestJson(uploadsUrl, 'uploads');
      const items = uploadsData.items ?? [];
      const videoIds = items
        .map((item) => item.contentDetails?.videoId)
        .filter(Boolean);

      logSafeStep('uploads', {
        page: pageIndex,
        uploadsFound: items.length,
        ids: videoIds,
        hasNextPage: Boolean(uploadsData.nextPageToken),
      });

      if (videoIds.length === 0) {
        break;
      }

      const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status,liveStreamingDetails&id=${encodeURIComponent(
        videoIds.join(','),
      )}&key=${encodeURIComponent(apiKey)}`;
      const detailsData = await requestJson(detailsUrl, 'video-details');
      const detailsById = new Map((detailsData.items ?? []).map((item) => [item.id, item]));

      isLive = isLive || (detailsData.items ?? []).some(
        (item) => item.snippet?.liveBroadcastContent === 'live',
      );

      const candidates = items.map((item) => {
        const videoId = item.contentDetails?.videoId;
        const details = videoId ? detailsById.get(videoId) : undefined;
        const durationSeconds = parseYouTubeDuration(details?.contentDetails?.duration);
        const isLiveVideo = Boolean(details?.liveStreamingDetails) || details?.snippet?.liveBroadcastContent === 'live';
        const isShortVideo = durationSeconds <= 180;
        const reason = !details
          ? 'missing-video-details'
          : isLiveVideo
            ? 'live-or-streaming-video'
            : isShortVideo
              ? 'short-video-under-3-min'
              : null;

        return {
          videoId,
          title: details?.snippet?.title ?? item.snippet?.title ?? 'unknown-title',
          durationSeconds,
          hasLiveStreamingDetails: Boolean(details?.liveStreamingDetails),
          isLiveVideo,
          isShortVideo,
          reason,
          details, // carry the details object found in this page's videos.list
          rawSnippet: item.snippet,
        };
      });

      logSafeStep('filter', {
        page: pageIndex,
        videosConsulted: candidates.length,
        remainingAfterFilter: candidates.filter((candidate) => !candidate.reason).length,
        discarded: candidates.filter((candidate) => candidate.reason).map((candidate) => ({
          videoId: candidate.videoId,
          reason: candidate.reason,
          durationSeconds: candidate.durationSeconds,
          hasLiveStreamingDetails: candidate.hasLiveStreamingDetails,
        })),
      });

      const firstValidVideo = candidates.find((candidate) => !candidate.reason);
      if (firstValidVideo) {
        // Keep the details object with the selected candidate to avoid an extra request when possible
        latestLongFormVideo = firstValidVideo;
        break;
      }

      if (!uploadsData.nextPageToken) {
        break;
      }

      nextPageToken = uploadsData.nextPageToken;
    } catch (error) {
      error.url = uploadsUrl;
      throw error;
    }
  }

  if (!latestLongFormVideo) {
    return {
      videoTitle: null,
      videoPublishedAt: null,
      videoUrl: null,
      thumbnailUrl: '',
      isLive,
    };
  }

  const selectedVideoId = latestLongFormVideo.videoId;
  // Prefer the details object we already have from the scanned page
  let selectedDetails = latestLongFormVideo.details;

  if (!selectedDetails && selectedVideoId) {
    const fresh = await requestJson(
      `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status,liveStreamingDetails&id=${encodeURIComponent(selectedVideoId)}&key=${encodeURIComponent(apiKey)}`,
      'video-details',
    );
    selectedDetails = (fresh.items ?? [])[0];
  }

  // Thumbnail preference: maxres > standard > high > medium > default
  const thumbs = selectedDetails?.snippet?.thumbnails ?? {};
  const thumbnailUrl = thumbs?.maxres?.url || thumbs?.standard?.url || thumbs?.high?.url || thumbs?.medium?.url || thumbs?.default?.url || fallbackPayload.thumbnailUrl;

  const title = selectedDetails?.snippet?.title ?? latestLongFormVideo.title ?? fallbackPayload.videoTitle;
  const publishedAt = selectedDetails?.snippet?.publishedAt ?? latestLongFormVideo.rawSnippet?.publishedAt ?? fallbackPayload.videoPublishedAt;

  return {
    videoTitle: title,
    videoPublishedAt: publishedAt,
    videoUrl: selectedVideoId ? `https://www.youtube.com/watch?v=${selectedVideoId}` : fallbackPayload.videoUrl,
    thumbnailUrl,
    isLive,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  setCacheHeaders(res, false);

  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (!apiKey) {
    const missingKeyError = {
      keyConfigured: false,
      status: 500,
      message: 'YOUTUBE_API_KEY is missing. Set it in the environment before calling the YouTube API.',
      url: undefined,
    };

    console.error('[YouTube API] Missing YOUTUBE_API_KEY.', missingKeyError);

    if (isDevelopment) {
      return res.status(500).json({ error: missingKeyError });
    }

    return res.status(200).json(fallbackPayload);
  }

  try {
    const channelData = await getChannelData(YOUTUBE_CHANNEL_ID, apiKey);

    if (!channelData.uploadsPlaylistId) {
      throw new Error('Unable to resolve the YouTube uploads playlist from channel data.');
    }

    const latestVideo = await getLatestVideo(channelData.uploadsPlaylistId, apiKey);

    const payload = {
      available: true,
      videoAvailable: Boolean(
        latestVideo.videoTitle &&
        latestVideo.videoUrl &&
        latestVideo.thumbnailUrl &&
        latestVideo.videoPublishedAt &&
        !Number.isNaN(Date.parse(latestVideo.videoPublishedAt))
      ),
      isLive: latestVideo.isLive,
      channelUrl: `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`,
      channelName: channelData.channelName,
      subscriberCount: channelData.subscriberCount,
      videoTitle: latestVideo.videoTitle,
      videoPublishedAt: latestVideo.videoPublishedAt,
      videoUrl: latestVideo.videoUrl,
      thumbnailUrl: latestVideo.thumbnailUrl,
    };

    setCacheHeaders(res, true);
    return res.status(200).json(payload);
  } catch (error) {
    const details = {
      keyConfigured: true,
      status: error.status || 500,
      message: error.message || 'Unknown YouTube API error.',
      url: error.url ? redactApiKey(error.url) : undefined,
    };

    console.error('[YouTube API] Function failed.', details);

    if (isDevelopment) {
      return res.status(details.status).json({ error: details });
    }

    return res.status(200).json(fallbackPayload);
  }
};
