import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type LiveOverride = 'real' | 'force-offline' | 'force-live';
export type YoutubeLiveOverride = LiveOverride | 'force-unavailable';
export type VideoOverride = 'real' | 'force-normal' | 'force-new';
export type YoutubeContentOverride = 'real' | 'force-success' | 'force-error';

@Injectable({ providedIn: 'root' })
export class DevOverridesService {
  readonly enabled = isDevMode();
  readonly twitchMode$ = new BehaviorSubject<LiveOverride>('real');
  readonly youtubeMode$ = new BehaviorSubject<YoutubeLiveOverride>('real');
  readonly videoMode$ = new BehaviorSubject<VideoOverride>('real');
  readonly youtubeContentMode$ = new BehaviorSubject<YoutubeContentOverride>('real');

  setTwitch(mode: LiveOverride): void { if (this.enabled) this.twitchMode$.next(mode); }
  setYoutube(mode: YoutubeLiveOverride): void { if (this.enabled) this.youtubeMode$.next(mode); }
  setVideo(mode: VideoOverride): void { if (this.enabled) this.videoMode$.next(mode); }
  setYoutubeContent(mode: YoutubeContentOverride): void { if (this.enabled) this.youtubeContentMode$.next(mode); }

  reset(): void {
    if (!this.enabled) return;
    this.twitchMode$.next('real');
    this.youtubeMode$.next('real');
    this.videoMode$.next('real');
    this.youtubeContentMode$.next('real');
  }
}
