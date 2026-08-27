import { Component, HostBinding, Input } from '@angular/core';

type CatName = 'nico' | 'liz' | 'ollie';

const CAT_ASSETS: Record<CatName, { path: string; width: number; height: number }> = {
  nico: { path: 'cat-tabby.png', width: 650, height: 810 },
  liz: { path: 'cat-siamese.png', width: 604, height: 850 },
  ollie: { path: 'cat-black.png', width: 1184, height: 494 },
};

@Component({
  selector: 'app-cat-easter-egg',
  standalone: true,
  template: `
    <img
      [src]="'/assets/brand/png/' + asset.path"
      alt=""
      [attr.width]="asset.width"
      [attr.height]="asset.height"
      [attr.loading]="cat === 'nico' ? 'eager' : 'lazy'"
      decoding="async"
    />
  `,
  styleUrls: ['./cat-easter-egg.component.scss'],
})
export class CatEasterEggComponent {
  @Input({ required: true }) cat: CatName = 'nico';
  @Input({ required: true }) label = '';

  @HostBinding('class') get hostClass(): string {
    return `cat-easter-egg cat-easter-egg--${this.cat}`;
  }

  @HostBinding('attr.aria-hidden') readonly ariaHidden = 'true';
  @HostBinding('attr.data-label') get tooltipLabel(): string {
    return this.label;
  }

  get asset(): { path: string; width: number; height: number } {
    return CAT_ASSETS[this.cat];
  }
}
