import { afterNextRender, Component, DestroyRef, inject, isDevMode } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
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
    RouterOutlet,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  readonly devControlsEnabled = isDevMode();
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

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
      this.scrollToRoute(this.router.url, 'auto');
      const routeSubscription = this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe((event) => this.scrollToRoute(event.urlAfterRedirects, 'smooth'));
      this.destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
        routeSubscription.unsubscribe();
        if (frame) window.cancelAnimationFrame(frame);
      });
    });
  }

  private scrollToRoute(url: string, preferredBehavior: ScrollBehavior): void {
    const path = url.split(/[?#]/, 1)[0];
    const sectionIds: Record<string, string> = {
      '/inicio': 'home-start',
      '/ao-vivo': 'live-status',
      '/guilda': 'guild',
      '/eventos': 'events',
      '/o-que-ta-rolando': 'latest-content',
      '/arsenal': 'arsenal',
      '/rodape': 'site-footer',
    };
    const sectionId = sectionIds[path];
    if (!sectionId) return;

    window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      if (!section) return;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      section.scrollIntoView({ behavior: reducedMotion ? 'auto' : preferredBehavior, block: 'start' });
    });
  }
}
