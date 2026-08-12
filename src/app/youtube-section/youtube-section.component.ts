import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../services/content.service';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-youtube-section',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './youtube-section.component.html',
  styleUrls: ['./youtube-section.component.scss'],
})
export class YoutubeSectionComponent {
  private readonly contentService = inject(ContentService);
  readonly status$ = this.contentService.getYoutubeLiveStatus();
}
