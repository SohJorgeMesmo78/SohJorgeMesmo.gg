import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ContentService } from './content.service';
import type { YoutubeApiPayload } from './youtube-api-payload';
import { DevOverridesService } from '../dev-controls/dev-overrides.service';

const validYoutubePayload: YoutubeApiPayload = {
  available: true,
  videoAvailable: true,
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
  let overrides: DevOverridesService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ContentService);
    http = TestBed.inject(HttpTestingController);
    overrides = TestBed.inject(DevOverridesService);
  });

  afterEach(() => http.verify());

  const waitForInitialPoll = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  it('uses real YouTube status and exposes a valid video', async () => {
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());
    const videoPromise = firstValueFrom(service.getLatestVideo());

    await waitForInitialPoll();

    http.expectOne('/api/youtube').flush(validYoutubePayload);
    http.expectOne('/api/youtube-live').flush({ available: true, isLive: true, checkedAt: new Date().toISOString() });
    http.expectOne('/api/twitch').flush(twitchOffline);

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: true,
      statusSource: 'youtube',
    }));
    expect(await videoPromise).toEqual(jasmine.objectContaining({ title: 'Vídeo real' }));
  });

  it('uses Twitch online as fallback when YouTube live status fails', async () => {
    spyOn(console, 'error');
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());
    await waitForInitialPoll();
    http.expectOne('/api/youtube-live').flush('unavailable', { status: 503, statusText: 'Unavailable' });
    http.expectOne('/api/twitch').flush({ ...twitchOffline, isLive: true });

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: true,
      statusSource: 'twitch-fallback',
      externalUrl: 'https://www.youtube.com/@SohJorgeMesmo-gg',
    }));
  });

  it('uses Twitch offline as fallback when YouTube is unavailable', async () => {
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());

    await waitForInitialPoll();

    http.expectOne('/api/youtube-live').flush({ available: false, isLive: false, checkedAt: new Date().toISOString() });
    http.expectOne('/api/twitch').flush(twitchOffline);

    expect(await statusPromise).toEqual(jasmine.objectContaining({
      isLive: false,
      statusSource: 'twitch-fallback',
    }));
  });

  it('keeps real YouTube status but hides an invalid video', async () => {
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());
    const videoPromise = firstValueFrom(service.getLatestVideo());

    await waitForInitialPoll();

    http.expectOne('/api/youtube-live').flush({ available: true, isLive: false, checkedAt: new Date().toISOString() });
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

  it('applies development overrides without changing API responses', async () => {
    overrides.setTwitch('force-live');
    overrides.setYoutube('force-live');
    const twitchPromise = firstValueFrom(service.getTwitchInfo());
    const youtubePromise = firstValueFrom(service.getYoutubeLiveStatus());

    await waitForInitialPoll();

    http.expectOne('/api/twitch').flush(twitchOffline);
    http.expectOne('/api/youtube-live').flush({ available: true, isLive: false, checkedAt: new Date().toISOString() });

    expect((await twitchPromise).isLive).toBeTrue();
    expect(await youtubePromise).toEqual(jasmine.objectContaining({ isLive: true, statusSource: 'youtube' }));
  });

  it('uses Twitch when Dev Controls marks YouTube live status unavailable', async () => {
    overrides.setYoutube('force-unavailable');
    overrides.setTwitch('force-live');
    const statusPromise = firstValueFrom(service.getYoutubeLiveStatus());

    await waitForInitialPoll();
    http.expectOne('/api/youtube-live').flush({ available: true, isLive: false, checkedAt: new Date().toISOString() });
    http.expectOne('/api/twitch').flush(twitchOffline);

    expect(await statusPromise).toEqual(jasmine.objectContaining({ isLive: true, statusSource: 'twitch-fallback' }));
  });
});
