import { Component, HostBinding, Input } from '@angular/core';

type CatName = 'nico' | 'liz' | 'ollie';

const CAT_ASSETS: Record<CatName, { width: number; height: number }> = {
  nico: { width: 631, height: 814 },
  liz: { width: 560, height: 869 },
  ollie: { width: 1131, height: 443 },
};

@Component({
  selector: 'app-cat-easter-egg',
  standalone: true,
  template: `
    <img
      [src]="'/cats/' + cat + '.png'"
      alt=""
      [attr.width]="asset.width"
      [attr.height]="asset.height"
      loading="lazy"
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

  get asset(): { width: number; height: number } {
    return CAT_ASSETS[this.cat];
  }
}
