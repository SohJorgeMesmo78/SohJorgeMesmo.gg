import { afterNextRender, Component, DestroyRef, inject } from '@angular/core';
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
    { name: 'instagram', label: 'SohJorgeMesmo.gg', url: 'https://www.instagram.com/sohjorgemesmo.gg' },
    { name: 'x', label: 'SohJorgeMesmo78', url: 'https://x.com/sohjorgemesmo78' },
    { name: 'twitch', label: 'SohJorgeMesmo', url: 'https://www.twitch.tv/sohjorgemesmo' },
    { name: 'youtube', label: 'SohJorgeMesmo', url: 'https://www.youtube.com/@SohJorgeMesmo-gg' },
    { name: 'tiktok', label: 'SohJorgeMesmo.gg', url: 'https://www.tiktok.com/@sohjorgemesmo.gg' },
  ];

  currentIndex = 0;
  isChanging = false;

  constructor() {
    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const timer = window.setInterval(() => {
        this.isChanging = true;
        window.setTimeout(() => {
          this.currentIndex = (this.currentIndex + 1) % this.items.length;
          this.isChanging = false;
        }, 180);
      }, 3500);
      this.destroyRef.onDestroy(() => window.clearInterval(timer));
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
