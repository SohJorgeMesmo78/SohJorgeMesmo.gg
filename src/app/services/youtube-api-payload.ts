export interface YoutubeApiPayload {
  available: boolean;
  videoAvailable: boolean;
  isLive: boolean;
  channelUrl: string;
  channelName: string;
  subscriberCount: string;
  videoTitle: string | null;
  videoPublishedAt: string | null;
  videoUrl: string | null;
  thumbnailUrl: string;
}
