import { afterNextRender, Component, DestroyRef, inject, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterComponent } from './footer/footer.component';
import { HeroComponent } from './hero/hero.component';
import { LatestVideoComponent } from './latest-video/latest-video.component';
import { SocialLinksComponent } from './social-links/social-links.component';
import { TwitchSectionComponent } from './twitch-section/twitch-section.component';
import { YoutubeSectionComponent } from './youtube-section/youtube-section.component';
import { RevealDirective } from './shared/reveal.directive';
import { CatEasterEggComponent } from './shared/cat-easter-egg/cat-easter-egg.component';
import { ArsenalComponent } from './arsenal/arsenal.component';
import { DevControlsComponent } from './dev-controls/dev-controls.component';
import { EventsComponent } from './events/events.component';

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
    RevealDirective,
    CatEasterEggComponent,
    ArsenalComponent,
    DevControlsComponent,
    EventsComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly devControlsEnabled = isDevMode();
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => {
      let frame = 0;
      const updateProgress = () => {
        frame = 0;
        const root = document.documentElement;
        const available = root.scrollHeight - root.clientHeight;
        root.style.setProperty('--scroll-progress', String(available > 0 ? Math.min(window.scrollY / available, 1) : 0));
      };
      const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateProgress); };
      updateProgress();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        if (frame) window.cancelAnimationFrame(frame);
      });
    });
  }
}
