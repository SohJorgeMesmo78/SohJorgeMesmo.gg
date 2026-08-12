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

  private readonly publishedAtFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });

  formatPublishedAt(date: string): string {
    const publishedAt = new Date(date);
    if (Number.isNaN(publishedAt.getTime())) return date;

    const parts = this.publishedAtFormatter.formatToParts(publishedAt);
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';

    return `${value('day')}/${value('month')}/${value('year')} - ${value('hour')}:${value('minute')}`;
  }

  isNewVideo(date: string): boolean {
    const publishedAt = new Date(date).getTime();
    if (Number.isNaN(publishedAt)) {
      return false;
    }

    const threshold = 36 * 60 * 60 * 1000;
    return Date.now() - publishedAt <= threshold;
  }
}
