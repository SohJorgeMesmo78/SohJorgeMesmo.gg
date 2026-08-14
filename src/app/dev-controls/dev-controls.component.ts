import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevOverridesService, LiveOverride, VideoOverride, YoutubeContentOverride, YoutubeLiveOverride } from './dev-overrides.service';

@Component({
  selector: 'app-dev-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dev-controls.component.html',
  styleUrls: ['./dev-controls.component.scss'],
})
export class DevControlsComponent {
  readonly controls = inject(DevOverridesService);
  open = false;

  setTwitch(value: string): void { this.controls.setTwitch(value as LiveOverride); }
  setYoutube(value: string): void { this.controls.setYoutube(value as YoutubeLiveOverride); }
  setVideo(value: string): void { this.controls.setVideo(value as VideoOverride); }
  setContent(value: string): void { this.controls.setYoutubeContent(value as YoutubeContentOverride); }
}
