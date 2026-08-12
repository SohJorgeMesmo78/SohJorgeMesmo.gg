import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../services/content.service';

@Component({
  selector: 'app-latest-video',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './latest-video.component.html',
  styleUrls: ['./latest-video.component.scss'],
})
export class LatestVideoComponent {
  private readonly contentService = inject(ContentService);
  readonly video$ = this.contentService.getLatestVideo();
  readonly channel$ = this.contentService.getYoutubeChannel();

  isNewVideo(date: string): boolean {
    const publishedAt = new Date(date).getTime();
    if (Number.isNaN(publishedAt)) {
      return false;
    }

    const threshold = 36 * 60 * 60 * 1000;
    return Date.now() - publishedAt <= threshold;
  }
}
