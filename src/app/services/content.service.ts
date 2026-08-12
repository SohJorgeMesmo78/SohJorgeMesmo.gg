import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';
import {
  heroData,
  socialLinks,
  twitchInfoPlaceholder,
  latestVideoPlaceholder,
  youtubeChannelPlaceholder,
  HeroData,
  SocialLink,
  TwitchInfo,
  LatestVideoInfo,
  YouTubeChannelInfo,
} from '../hub.config';
import type { YoutubeApiPayload } from './youtube-data';

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  private readonly youtube$: Observable<YoutubeApiPayload>;

  constructor(private readonly http: HttpClient) {
    this.youtube$ = this.http.get<YoutubeApiPayload>('/api/youtube').pipe(
      shareReplay(1),
      catchError(() => of({
        channelUrl: youtubeChannelPlaceholder.externalUrl,
        channelName: youtubeChannelPlaceholder.name,
        subscriberCount: youtubeChannelPlaceholder.subscriberCount,
        videoTitle: latestVideoPlaceholder.title,
        videoPublishedAt: latestVideoPlaceholder.date,
        videoUrl: latestVideoPlaceholder.externalUrl,
        thumbnailUrl: latestVideoPlaceholder.thumbnailUrl,
      })),
    );
  }

  getHeroData(): Observable<HeroData> {
    return of(heroData);
  }

  getSocialLinks(): Observable<SocialLink[]> {
    return of(socialLinks);
  }

  getYoutubeChannel(): Observable<YouTubeChannelInfo> {
    return this.youtube$.pipe(
      map((result) => ({
        externalUrl: result.channelUrl,
        name: result.channelName,
        description: 'Dados carregados diretamente da YouTube Data API.',
        channelLabel: 'Canal no YouTube',
        statusNote: `${result.subscriberCount} inscritos`,
        subscriberCount: result.subscriberCount,
      })),
    );
  }

  getLatestVideo(): Observable<LatestVideoInfo> {
    return this.youtube$.pipe(
      map((result) => ({
        externalUrl: result.videoUrl,
        title: result.videoTitle,
        date: result.videoPublishedAt,
        thumbnailUrl: result.thumbnailUrl,
        note: 'Dados carregados diretamente da YouTube Data API.',
      })),
    );
  }

  getTwitchInfo(): Observable<TwitchInfo> {
    return of(twitchInfoPlaceholder);
  }
}
