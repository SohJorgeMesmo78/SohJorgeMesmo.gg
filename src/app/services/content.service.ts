import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, combineLatest, map, Observable, of, shareReplay, startWith } from 'rxjs';
import {
  heroData,
  socialLinks,
  twitchInfoPlaceholder,
  HeroData,
  SocialLink,
  TwitchInfo,
  LatestVideoInfo,
  YouTubeChannelInfo,
  YouTubeLiveStatus,
} from '../hub.config';
import type { YoutubeApiPayload } from './youtube-api-payload';

type YoutubeState =
  | { status: 'loading' }
  | { status: 'success'; data: YoutubeApiPayload }
  | { status: 'unavailable' };

function hasValidVideo(data: YoutubeApiPayload): boolean {
  return Boolean(
    data.available &&
    data.videoAvailable &&
    data.videoTitle?.trim() &&
    data.videoUrl?.trim() &&
    data.thumbnailUrl?.trim() &&
    data.videoPublishedAt &&
    !Number.isNaN(Date.parse(data.videoPublishedAt))
  );
}

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private readonly youtubeState$: Observable<YoutubeState>;
  private readonly twitch$: Observable<TwitchInfo>;

  constructor(private readonly http: HttpClient) {
    this.youtubeState$ = this.http.get<YoutubeApiPayload>('/api/youtube').pipe(
      map((data): YoutubeState => data.available === false
        ? { status: 'unavailable' }
        : { status: 'success', data }),
      catchError((error) => {
        console.error('[ContentService] YouTube request failed.', error);
        return of<YoutubeState>({ status: 'unavailable' });
      }),
      startWith<YoutubeState>({ status: 'loading' }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    this.twitch$ = this.http.get<TwitchInfo>('/api/twitch').pipe(
      catchError(() => of(twitchInfoPlaceholder)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  getHeroData(): Observable<HeroData> {
    return of(heroData);
  }

  getSocialLinks(): Observable<SocialLink[]> {
    return of(socialLinks);
  }

  getYoutubeChannel(): Observable<YouTubeChannelInfo | null> {
    return this.youtubeState$.pipe(
      map((state) => state.status === 'success' ? ({
        externalUrl: state.data.channelUrl,
        name: state.data.channelName,
        description: 'Dados carregados diretamente da YouTube Data API.',
        channelLabel: 'Canal no YouTube',
        statusNote: `${state.data.subscriberCount} inscritos`,
        subscriberCount: state.data.subscriberCount,
      }) : null),
    );
  }

  getYoutubeLiveStatus(): Observable<YouTubeLiveStatus> {
    return combineLatest([this.youtubeState$, this.twitch$]).pipe(
      map(([youtubeState, twitch]) => {
        if (youtubeState.status === 'success') {
          return {
            externalUrl: youtubeState.data.channelUrl,
            isLive: youtubeState.data.isLive,
            status: youtubeState.data.isLive ? '🔴 AO VIVO AGORA' : 'Offline agora',
            note: youtubeState.data.isLive ? 'Entrar na live →' : 'Live às 19h',
            statusSource: 'youtube' as const,
          };
        }

        return {
          externalUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
          isLive: Boolean(twitch.isLive),
          status: twitch.isLive ? '🔴 AO VIVO AGORA' : 'Offline agora',
          note: twitch.isLive ? 'Entrar na live →' : 'Live às 19h',
          statusSource: 'twitch-fallback' as const,
        };
      }),
    );
  }

  getLatestVideo(): Observable<LatestVideoInfo | null> {
    return this.youtubeState$.pipe(
      map((state) => {
        if (state.status !== 'success' || !hasValidVideo(state.data)) {
          return null;
        }

        return {
          externalUrl: state.data.videoUrl!,
          title: state.data.videoTitle!,
          date: state.data.videoPublishedAt!,
          thumbnailUrl: state.data.thumbnailUrl,
          note: 'Dados carregados diretamente da YouTube Data API.',
        };
      }),
    );
  }

  getTwitchInfo(): Observable<TwitchInfo> {
    return this.twitch$;
  }
}
