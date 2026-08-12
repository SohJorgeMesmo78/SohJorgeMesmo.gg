const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_LOOKUP_QUERY = 'SohJorgeMesmo-gg';
const MAX_UPLOAD_PAGES = 3;
const MAX_UPLOAD_RESULTS_PER_PAGE = 50;
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
  channelUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
  channelName: 'SohJorgeMesmo',
  subscriberCount: '---',
  videoTitle: 'Último vídeo ainda não carregado automaticamente',
  videoPublishedAt: 'Data disponível com integração YouTube',
  videoUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
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

async function requestJson(url, stage) {
  const response = await fetch(url);
  const rawText = await response.text();

  if (!response.ok) {
    const message = rawText ? rawText.slice(0, 1000) : 'No response body';
    const error = new Error(
      `YouTube API request failed (${response.status}): ${message}`,
    );
    error.status = response.status;
    error.url = url;
    logSafeStep(stage, {
      status: response.status,
      ok: false,
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

async function findChannelId(apiKey) {
  const url = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(
    CHANNEL_LOOKUP_QUERY,
  )}&key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await requestJson(url, 'channel');
    const channelId = data.items?.[0]?.id?.channelId;

    logSafeStep('channel', {
      resultCount: data.items?.length ?? 0,
      resolved: Boolean(channelId),
    });

    if (!channelId) {
      throw new Error('Unable to resolve YouTube channel id for SohJorgeMesmo.');
    }

    return channelId;
  } catch (error) {
    error.url = url;
    throw error;
  }
}

async function getChannelData(channelId, apiKey) {
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${encodeURIComponent(
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

async function getLatestVideo(channelId, apiKey) {
  let nextPageToken;
  let pageIndex = 0;
  let latestLongFormVideo = null;

  while (pageIndex < MAX_UPLOAD_PAGES) {
    const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${encodeURIComponent(
      channelId,
    )}&order=date&type=video&maxResults=${MAX_UPLOAD_RESULTS_PER_PAGE}${nextPageToken ? `&pageToken=${encodeURIComponent(nextPageToken)}` : ''}&key=${encodeURIComponent(apiKey)}`;

    pageIndex += 1;

    try {
      const searchData = await requestJson(searchUrl, 'uploads');
      const items = searchData.items ?? [];
      const videoIds = items
        .map((item) => item.id?.videoId)
        .filter(Boolean);

      logSafeStep('uploads', {
        page: pageIndex,
        uploadsFound: items.length,
        ids: videoIds,
        hasNextPage: Boolean(searchData.nextPageToken),
      });

      if (videoIds.length === 0) {
        break;
      }

      const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status,liveStreamingDetails&id=${encodeURIComponent(
        videoIds.join(','),
      )}&key=${encodeURIComponent(apiKey)}`;
      const detailsData = await requestJson(detailsUrl, 'video-details');
      const detailsById = new Map((detailsData.items ?? []).map((item) => [item.id, item]));

      const candidates = items.map((item) => {
        const videoId = item.id?.videoId;
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

      if (!searchData.nextPageToken) {
        break;
      }

      nextPageToken = searchData.nextPageToken;
    } catch (error) {
      error.url = searchUrl;
      throw error;
    }
  }

  if (!latestLongFormVideo) {
    throw new Error('Unable to fetch the latest long-form YouTube video after scanning uploads pages.');
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
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

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
    const channelId = await findChannelId(apiKey);
    const channelData = await getChannelData(channelId, apiKey);
    const latestVideo = await getLatestVideo(channelId, apiKey);

    const payload = {
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      channelName: channelData.channelName,
      subscriberCount: channelData.subscriberCount,
      videoTitle: latestVideo.videoTitle,
      videoPublishedAt: latestVideo.videoPublishedAt,
      videoUrl: latestVideo.videoUrl,
      thumbnailUrl: latestVideo.thumbnailUrl,
    };

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
