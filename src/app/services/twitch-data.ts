import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface TwitchApiPayload {
  available?: boolean;
  externalUrl: string;
  schedule: string;
  title: string;
  status: string;
  note: string;
  isLive: boolean;
  liveTitle?: string;
  gameName?: string;
  viewerCount?: number | null;
}

interface TwitchTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface TwitchStreamEntry {
  title?: string;
  game_name?: string;
  viewer_count?: number;
  user_name?: string;
  type?: string;
}

interface TwitchStreamPayload {
  data?: TwitchStreamEntry[];
}

const TWITCH_CHANNEL_LOGIN = 'sohjorgemesmo';
const TOKENS_BY_KEY = new Map<string, { accessToken: string; expiresAt: number }>();
const isDevelopment = process.env['NODE_ENV'] === 'development' || process.env['VERCEL_ENV'] === 'development' || (!process.env['VERCEL_ENV'] && !process.env['NODE_ENV']);

const fallbackPayload: TwitchApiPayload = {
  available: false,
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

function loadEnvFileValue(key: string): string | undefined {
  const envPath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envPath)) {
    return undefined;
  }

  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
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

function getTwitchClientId(): string | undefined {
  return process.env['TWITCH_CLIENT_ID']?.trim() || loadEnvFileValue('TWITCH_CLIENT_ID');
}

function getTwitchClientSecret(): string | undefined {
  return process.env['TWITCH_CLIENT_SECRET']?.trim() || loadEnvFileValue('TWITCH_CLIENT_SECRET');
}

function getCachedAccessToken(): string | undefined {
  const cacheKey = `${process.cwd()}::twitch`;
  const cached = TOKENS_BY_KEY.get(cacheKey);
  if (!cached) {
    return undefined;
  }

  if (cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  TOKENS_BY_KEY.delete(cacheKey);
  return undefined;
}

function setCachedAccessToken(accessToken: string, expiresInSeconds: number): void {
  const cacheKey = `${process.cwd()}::twitch`;
  TOKENS_BY_KEY.set(cacheKey, {
    accessToken,
    expiresAt: Date.now() + Math.max(expiresInSeconds - 60, 60) * 1000,
  });
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);

  if (!response.ok) {
    const message = await response.text();
    throw Object.assign(new Error(`Twitch API request failed (${response.status}): ${message}`), {
      status: response.status,
      url,
    });
  }

  return (await response.json()) as T;
}

async function getAppAccessToken(): Promise<string> {
  const clientId = getTwitchClientId();
  const clientSecret = getTwitchClientSecret();

  if (!clientId || !clientSecret) {
    throw Object.assign(new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required.'), {
      status: 500,
      keyConfigured: false,
    });
  }

  const cached = getCachedAccessToken();
  if (cached) {
    return cached;
  }

  const tokenResponse = await requestJson<TwitchTokenResponse>('https://id.twitch.tv/oauth2/token', {
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
    throw Object.assign(new Error('Twitch token response did not include an access token.'), {
      status: 500,
      keyConfigured: true,
    });
  }

  setCachedAccessToken(tokenResponse.access_token, Number(tokenResponse.expires_in || 3600));
  return tokenResponse.access_token;
}

async function getCurrentStream(): Promise<TwitchStreamEntry | undefined> {
  const clientId = getTwitchClientId();
  const accessToken = await getAppAccessToken();

  if (!clientId) {
    return undefined;
  }

  const streamUrl = `https://api.twitch.tv/helix/streams?user_login=${encodeURIComponent(TWITCH_CHANNEL_LOGIN)}`;
  const streamData = await requestJson<TwitchStreamPayload>(streamUrl, {
    headers: {
      'Client-ID': clientId,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return streamData.data?.[0];
}

export async function fetchTwitchData(): Promise<TwitchApiPayload> {
  try {
    const clientId = getTwitchClientId();
    const clientSecret = getTwitchClientSecret();

    if (!clientId || !clientSecret) {
      throw Object.assign(new Error('TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are required.'), {
        status: 500,
        keyConfigured: false,
      });
    }

    const stream = await getCurrentStream();
    const isLive = Boolean(stream);

    if (!isLive) {
      return {
        ...fallbackPayload,
        available: true,
        title: 'Twitch',
        status: 'Offline agora',
        note: 'Live às 19h',
      };
    }

    return {
      available: true,
      externalUrl: 'https://www.twitch.tv/sohjorgemesmo',
      schedule: 'Live às 19h',
      title: 'Twitch',
      status: '🔴 AO VIVO AGORA',
      note: 'Entrar na live →',
      isLive: true,
      liveTitle: stream?.title || 'Live em andamento',
      gameName: stream?.game_name || undefined,
      viewerCount: stream?.viewer_count ?? null,
    };
  } catch (error) {
    const typedError = error as { status?: number; message?: string; url?: string; keyConfigured?: boolean };
    const details = {
      keyConfigured: Boolean(getTwitchClientId() && getTwitchClientSecret()),
      status: typedError.status || 500,
      message: typedError.message || 'Unknown Twitch API error.',
      url: typedError.url,
    };

    console.error('[Twitch API] fetchTwitchData failed:', details);

    if (isDevelopment) {
      throw Object.assign(new Error(details.message), {
        status: details.status,
        url: details.url,
      });
    }

    return fallbackPayload;
  }
}
