import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
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

@Injectable({
  providedIn: 'root',
})
export class ContentService {
  getHeroData(): Observable<HeroData> {
    return of(heroData);
  }

  getSocialLinks(): Observable<SocialLink[]> {
    return of(socialLinks);
  }

  getYoutubeChannel(): Observable<YouTubeChannelInfo> {
    return of(youtubeChannelPlaceholder);
  }

  getLatestVideo(): Observable<LatestVideoInfo> {
    return of(latestVideoPlaceholder);
  }

  getTwitchInfo(): Observable<TwitchInfo> {
    return of(twitchInfoPlaceholder);
  }
}
