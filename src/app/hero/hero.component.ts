import { afterNextRender, Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { heroData } from '../hub.config';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
})
export class HeroComponent {
  readonly hero = heroData;

  private readonly destroyRef = inject(DestroyRef);

  readonly items = [
    { name: 'youtube', label: 'SohJorgeMesmo', url: 'https://www.youtube.com/@SohJorgeMesmo-gg' },
    { name: 'twitch', label: 'SohJorgeMesmo', url: 'https://www.twitch.tv/sohjorgemesmo' },
    { name: 'instagram', label: 'SohJorgeMesmo.gg', url: 'https://www.instagram.com/sohjorgemesmo.gg' },
    { name: 'tiktok', label: 'SohJorgeMesmo.gg', url: 'https://www.tiktok.com/@sohjorgemesmo.gg' },
    { name: 'x', label: 'SohJorgeMesmo78', url: 'https://x.com/sohjorgemesmo78' },
  ];

  readonly currentIndex = signal(0);
  readonly isChanging = signal(false);

  constructor() {
    afterNextRender(() => {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let transitionTimer: number | undefined;

      const timer = window.setInterval(() => {
        if (reducedMotion.matches) {
          this.currentIndex.update((index) => (index + 1) % this.items.length);
          return;
        }

        this.isChanging.set(true);
        transitionTimer = window.setTimeout(() => {
          this.currentIndex.update((index) => (index + 1) % this.items.length);
          this.isChanging.set(false);
          transitionTimer = undefined;
        }, 180);
      }, 3000);

      this.destroyRef.onDestroy(() => {
        window.clearInterval(timer);
        if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
      });
    });
  }

  onClick(): void {
    const el = document.getElementById('guild');
    if (el) {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      el.scrollIntoView({ behavior, block: 'start' });
    }
  }
}
