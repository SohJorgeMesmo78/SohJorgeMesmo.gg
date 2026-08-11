import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './footer/footer.component';
import { HeroComponent } from './hero/hero.component';
import { LatestVideoComponent } from './latest-video/latest-video.component';
import { SocialLinksComponent } from './social-links/social-links.component';
import { TwitchSectionComponent } from './twitch-section/twitch-section.component';
import { YoutubeSectionComponent } from './youtube-section/youtube-section.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HeroComponent,
    SocialLinksComponent,
    YoutubeSectionComponent,
    LatestVideoComponent,
    TwitchSectionComponent,
    FooterComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {}
