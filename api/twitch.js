const TWITCH_CHANNEL_LOGIN = 'sohjorgemesmo';
const fallbackPayload = {
  externalUrl: 'https://www.twitch.tv/sohjorgemesmo',
  schedule: 'Live às 19h',
  title: 'Twitch',
  status: 'Offline agora',
  note: 'Live às 19h',
  isLive: false,
  liveTitle: undefined,
  gameName: undefined,
  viewerCount: null,
};

const tokenCache = new Map();
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'development' || (!process.env.VERCEL_ENV && !process.env.NODE_ENV);

function getEnvValue(key) {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function getCacheKey() {
  return `${process.cwd()}::twitch-token`;
}

function getCachedAccessToken() {
  const key = getCacheKey();
  const cached = tokenCache.get(key);

  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  tokenCache.delete(key);
  return undefined;
}

function setCachedAccessToken(accessToken, expiresInSeconds) {
  const key = getCacheKey();
  tokenCache.set(key, {
    accessToken,
    expiresAt: Date.now() + Math.max(expiresInSeconds - 60, 60) * 1000,
  });
}

function redactToken(value) {
  if (!value) {
    return undefined;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

async function requestJson(url, init) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`Twitch API request failed (${response.status}): ${message}`);
    error.status = response.status;
    error.url = url;
    throw error;
  }

  return response.json();
}

async function getAppAccessToken() {
  const clientId = getEnvValue('TWITCH_CLIENT_ID');
  const clientSecret = getEnvValue('TWITCH_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    const error = new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required.');
    error.status = 500;
    error.keyConfigured = false;
    throw error;
  }

  const cached = getCachedAccessToken();
  if (cached) {
    return cached;
  }

  const tokenResponse = await requestJson('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }).toString(),
  });

  if (!tokenResponse.access_token) {
    const error = new Error('Twitch token response did not include an access token.');
    error.status = 500;
    error.keyConfigured = true;
    throw error;
  }

  setCachedAccessToken(tokenResponse.access_token, Number(tokenResponse.expires_in || 3600));
  return tokenResponse.access_token;
}

async function getCurrentStream() {
  const clientId = getEnvValue('TWITCH_CLIENT_ID');
  const accessToken = await getAppAccessToken();

  const streamUrl = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(TWITCH_CHANNEL_LOGIN)}`;
  const streamData = await requestJson(streamUrl, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return streamData.data?.[0];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed.' });
  }

  try {
    const clientId = getEnvValue('TWITCH_CLIENT_ID');
    const clientSecret = getEnvValue('TWITCH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw Object.assign(new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required.'), {
        status: 500,
        keyConfigured: false,
      });
    }

    const stream = await getCurrentStream();

    if (!stream) {
      return res.status(200).json({
        ...fallbackPayload,
        title: 'Twitch',
        status: 'Offline agora',
        note: 'Live às 19h',
      });
    }

    return res.status(200).json({
      externalUrl: 'https://www.twitch.tv/sohjorgemesmo',
      schedule: 'Live às 19h',
      title: 'Twitch',
      status: '🔴 AO VIVO AGORA',
      note: 'Entrar na live →',
      isLive: true,
      liveTitle: stream.title || 'Live em andamento',
      gameName: stream.game_name || undefined,
      viewerCount: stream.viewer_count ?? null,
    });
  } catch (error) {
    const details = {
      keyConfigured: Boolean(getEnvValue('TWITCH_CLIENT_ID') && getEnvValue('TWITCH_CLIENT_SECRET')),
      status: error.status || 500,
      message: error.message || 'Unknown Twitch API error.',
      tokenPreview: error.tokenPreview || undefined,
      url: error.url ? redactToken(error.url) : undefined,
    };

    console.error('[Twitch API] Function failed.', details);

    if (isDevelopment) {
      return res.status(details.status).json({ error: details });
    }

    return res.status(200).json(fallbackPayload);
  }
};
