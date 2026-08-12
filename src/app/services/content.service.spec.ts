import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, skip } from 'rxjs';
import { ContentService } from './content.service';
import type { YoutubeApiPayload } from './youtube-api-payload';

const validYoutubePayload: YoutubeApiPayload = {
  available: true,
  videoAvailable: true,
  isLive: false,
  channelUrl: 'https://www.youtube.com/channel/UCbmWTrqndKH7NilwHkv4oMg',
  channelName: 'SohJorgeMesmo',
  subscriberCount: '115',
  videoTitle: 'Vídeo real',
  videoPublishedAt: '2026-08-10T15:00:00Z',
  videoUrl: 'https://www.youtube.com/watch?v=video-id',
  thumbnailUrl: 'https://i.ytimg.com/vi/video-id/maxresdefault.jpg',
};

const twitchOffline = {
  externalUrl: 'https://www.twitch.tv/sohjorgemesmo',
  schedule: 'Live às 19h',
  title: 'Twitch',
  status: 'Offline agora',
  note: 'Live às 19h',
  isLive: false,
};

describe('ContentService YouTube states', () => {
  let service: ContentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uses real YouTube status and exposes a valid video', async () => {
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());
    const videoPromise = firstValueFrom(service.getLatestVideo().pipe(skip(1)));

    http.expectOne('/api/youtube').flush({ ...validYoutubePayload, isLive: true });
    http.expectOne('/api/twitch').flush(twitchOffline);

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: true,
      statusSource: 'youtube',
    }));
    expect(await videoPromise).toEqual(jasmine.objectContaining({ title: 'Vídeo real' }));
  });

  it('uses Twitch online as fallback and hides the video when YouTube fails', async () => {
    spyOn(console, 'error');
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());
    const videoPromise = firstValueFrom(service.getLatestVideo().pipe(skip(1)));

    http.expectOne('/api/youtube').flush('unavailable', { status: 503, statusText: 'Unavailable' });
    http.expectOne('/api/twitch').flush({ ...twitchOffline, isLive: true });

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: true,
      statusSource: 'twitch-fallback',
      externalUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
    }));
    expect(await videoPromise).toBeNull();
  });

  it('uses Twitch offline as fallback when YouTube is unavailable', async () => {
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());

    http.expectOne('/api/youtube').flush({
      ...validYoutubePayload,
      available: false,
      videoAvailable: false,
    });
    http.expectOne('/api/twitch').flush(twitchOffline);

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: false,
      statusSource: 'twitch-fallback',
    }));
  });

  it('keeps real YouTube status but hides an invalid video', async () => {
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());
    const videoPromise = firstValueFrom(service.getLatestVideo().pipe(skip(1)));

    http.expectOne('/api/youtube').flush({
      ...validYoutubePayload,
      videoAvailable: false,
      videoTitle: null,
      videoPublishedAt: null,
      videoUrl: null,
      thumbnailUrl: '',
    });
    http.expectOne('/api/twitch').flush(twitchOffline);

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: false,
      statusSource: 'youtube',
    }));
    expect(await videoPromise).toBeNull();
  });
});
