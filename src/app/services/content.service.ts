import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { catchError, combineLatest, map, Observable, of, shareReplay, switchMap, timer } from 'rxjs';
import { heroData, socialLinks, twitchInfoPlaceholder, HeroData, SocialLink, TwitchInfo, LatestVideoInfo, YouTubeChannelInfo, YouTubeLiveStatus } from '../hub.config';
import { DevOverridesService } from '../dev-controls/dev-overrides.service';
import type { YoutubeApiPayload } from './youtube-api-payload';
import type { YoutubeLiveApiPayload } from './youtube-live-status';

type YoutubeState = { status: 'success'; data: YoutubeApiPayload } | { status: 'unavailable' };
const LIVE_REFRESH_MS = 45_000;
const LIVE_TRUST_MS = 90_000;
const YOUTUBE_URL = 'https://www.youtube.com/@SohJorgeMesmo-gg';
const youtubeFixture: YoutubeApiPayload = {
  available: true, videoAvailable: true, channelUrl: YOUTUBE_URL,
  channelName: 'SohJorgeMesmo-gg', subscriberCount: '115', videoTitle: 'Uma nova missão na Guilda',
  videoPublishedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(), videoUrl: YOUTUBE_URL,
  thumbnailUrl: '/foto.png',
};

function hasValidVideo(data: YoutubeApiPayload): boolean {
  return Boolean(data.available && data.videoAvailable && data.videoTitle?.trim() && data.videoUrl?.trim() &&
    data.thumbnailUrl?.trim() && data.videoPublishedAt && !Number.isNaN(Date.parse(data.videoPublishedAt)));
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly overrides = inject(DevOverridesService);
  private readonly refresh$ = (isPlatformBrowser(this.platformId) ? timer(0, LIVE_REFRESH_MS) : of(0)).pipe(
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private readonly youtubeReal$ = this.http.get<YoutubeApiPayload>('/api/youtube').pipe(
    map((data): YoutubeState => data.available === false ? { status: 'unavailable' } : { status: 'success', data }),
    catchError(() => of<YoutubeState>({ status: 'unavailable' })),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly youtubeState$ = combineLatest([this.youtubeReal$, this.overrides.youtubeContentMode$]).pipe(
    map(([state, mode]): YoutubeState => !this.overrides.enabled || mode === 'real' ? state :
      mode === 'force-error' ? { status: 'unavailable' } : { status: 'success', data: youtubeFixture }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly twitchReal$ = this.refresh$.pipe(
    switchMap(() => this.http.get<TwitchInfo>('/api/twitch').pipe(
      catchError(() => of({ ...twitchInfoPlaceholder, available: false, isLive: false })))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly twitch$ = combineLatest([this.twitchReal$, this.overrides.twitchMode$]).pipe(
    map(([value, mode]) => {
      if (!this.overrides.enabled || mode === 'real') return value;
      const isLive = mode === 'force-live';
      return { ...value, available: true, isLive, status: isLive ? '🔴 AO VIVO AGORA' : 'Offline agora',
        liveTitle: isLive ? (value.liveTitle || 'Live simulada pelos Dev Controls') : undefined,
        viewerCount: isLive ? (value.viewerCount ?? 42) : null };
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  private readonly youtubeLiveReal$ = this.refresh$.pipe(
    switchMap(() => this.http.get<YoutubeLiveApiPayload>('/api/youtube-live').pipe(
      catchError(() => of<YoutubeLiveApiPayload>({ available: false, isLive: false, checkedAt: new Date(0).toISOString() })))),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  getHeroData(): Observable<HeroData> { return of(heroData); }
  getSocialLinks(): Observable<SocialLink[]> { return of(socialLinks); }
  getYoutubeChannel(): Observable<YouTubeChannelInfo | null> {
    return this.youtubeState$.pipe(map((state) => state.status === 'success' ? ({
      externalUrl: state.data.channelUrl, name: state.data.channelName,
      description: 'Dados carregados diretamente da YouTube Data API.', channelLabel: 'Canal no YouTube',
      statusNote: `${state.data.subscriberCount} inscritos`, subscriberCount: state.data.subscriberCount,
    }) : null));
  }
  getYoutubeLiveStatus(): Observable<YouTubeLiveStatus> {
    return combineLatest([this.youtubeLiveReal$, this.twitch$, this.overrides.youtubeMode$]).pipe(
      map(([youtube, twitch, override]) => {
        if (this.overrides.enabled && (override === 'force-live' || override === 'force-offline')) {
          return this.youtubeStatus(override === 'force-live', 'youtube');
        }
        const checkedAt = Date.parse(youtube.checkedAt);
        const fresh = youtube.available && Number.isFinite(checkedAt) && Date.now() - checkedAt <= LIVE_TRUST_MS;
        if (fresh && override !== 'force-unavailable') return this.youtubeStatus(youtube.isLive, 'youtube');
        if (twitch.available !== false) return this.youtubeStatus(Boolean(twitch.isLive), 'twitch-fallback');
        return this.youtubeStatus(false, 'unknown');
      }), shareReplay({ bufferSize: 1, refCount: true }));
  }
  getLatestVideo(): Observable<LatestVideoInfo | null> {
    return combineLatest([this.youtubeState$, this.overrides.videoMode$]).pipe(map(([state, mode]) => {
      if (state.status !== 'success' || !hasValidVideo(state.data)) return null;
      const date = this.overrides.enabled && mode !== 'real'
        ? new Date(Date.now() - (mode === 'force-new' ? 60 * 60 * 1000 : 72 * 60 * 60 * 1000)).toISOString()
        : state.data.videoPublishedAt!;
      return { externalUrl: state.data.videoUrl!, title: state.data.videoTitle!, date,
        thumbnailUrl: state.data.thumbnailUrl, note: 'Dados carregados diretamente da YouTube Data API.' };
    }));
  }
  getTwitchInfo(): Observable<TwitchInfo> { return this.twitch$; }
  private youtubeStatus(isLive: boolean, statusSource: YouTubeLiveStatus['statusSource']): YouTubeLiveStatus {
    return { externalUrl: YOUTUBE_URL, isLive, status: isLive ? '🔴 AO VIVO AGORA' : 'Offline agora',
      note: isLive ? 'Entrar na live →' : 'Live às 19h', statusSource };
  }
}
