import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialLink, socialLinks } from '../hub.config';
import { IconComponent } from '../shared/icon.component';

@Component({
  selector: 'app-social-links',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './social-links.component.html',
  styleUrls: ['./social-links.component.scss'],
})
export class SocialLinksComponent {
  readonly socialLinks: SocialLink[] = socialLinks;

  trackById(index: number, item: SocialLink): string {
    return item.id;
  }
}
