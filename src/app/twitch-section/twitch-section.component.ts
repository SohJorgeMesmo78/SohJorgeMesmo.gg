import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContentService } from '../services/content.service';

@Component({
  selector: 'app-twitch-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './twitch-section.component.html',
  styleUrls: ['./twitch-section.component.scss'],
})
export class TwitchSectionComponent {
  private readonly contentService = inject(ContentService);
  readonly twitch$ = this.contentService.getTwitchInfo();
}
