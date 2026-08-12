const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CHANNEL_LOOKUP_QUERY = 'SohJorgeMesmo-gg';
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' || (!process.env.VERCEL_ENV && !process.env.NODE_ENV);

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

async function requestJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(
      `YouTube API request failed (${response.status}): ${message}`,
    );
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return response.json();
}

async function findChannelId(apiKey) {
  const url = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&maxResults=1&q=${encodeURIComponent(
    CHANNEL_LOOKUP_QUERY,
  )}&key=${encodeURIComponent(apiKey)}`;

  try {
    const data = await requestJson(url);
    const channelId = data.items?.[0]?.id?.channelId;

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
    const data = await requestJson(url);
    const result = data.items?.[0];

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
  const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${encodeURIComponent(
    channelId,
  )}&order=date&type=video&maxResults=20&key=${encodeURIComponent(apiKey)}`;

  try {
    const searchData = await requestJson(searchUrl);
    const videoIds = (searchData.items ?? [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      throw new Error('Unable to fetch YouTube uploads for channel selection.');
    }

    const detailsUrl = `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails,status,liveStreamingDetails&id=${encodeURIComponent(
      videoIds.join(','),
    )}&key=${encodeURIComponent(apiKey)}`;
    const detailsData = await requestJson(detailsUrl);
    const detailsById = new Map((detailsData.items ?? []).map((item) => [item.id, item]));

    const validVideo = (searchData.items ?? []).find((item) => {
      const videoId = item.id?.videoId;
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

    const selectedVideo = validVideo ?? (searchData.items ?? [])[0];

    if (!selectedVideo) {
      throw new Error('Unable to fetch the latest long-form YouTube video.');
    }

    const selectedVideoId = selectedVideo.id?.videoId;
    const selectedDetails = selectedVideoId ? detailsById.get(selectedVideoId) : undefined;
    const thumbnailUrl =
      selectedDetails?.snippet?.thumbnails?.high?.url ||
      selectedVideo.snippet?.thumbnails?.high?.url ||
      selectedVideo.snippet?.thumbnails?.medium?.url ||
      selectedVideo.snippet?.thumbnails?.default?.url ||
      fallbackPayload.thumbnailUrl;

    return {
      videoTitle: selectedDetails?.snippet?.title ?? selectedVideo.snippet?.title ?? fallbackPayload.videoTitle,
      videoPublishedAt:
        selectedDetails?.snippet?.publishedAt ?? selectedVideo.snippet?.publishedAt ?? fallbackPayload.videoPublishedAt,
      videoUrl: selectedVideoId
        ? `https://www.youtube.com/watch?v=${selectedVideoId}`
        : fallbackPayload.videoUrl,
      thumbnailUrl,
    };
  } catch (error) {
    error.url = searchUrl;
    throw error;
  }
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
