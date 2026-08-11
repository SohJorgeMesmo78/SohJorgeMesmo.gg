import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocialLink, socialLinks } from '../hub.config';

@Component({
  selector: 'app-social-links',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social-links.component.html',
  styleUrls: ['./social-links.component.scss'],
})
export class SocialLinksComponent {
  readonly socialLinks: SocialLink[] = socialLinks;

  get primaryLinks(): SocialLink[] {
    return this.socialLinks.filter((item) => item.priority === 'primary');
  }

  get secondaryLinks(): SocialLink[] {
    return this.socialLinks.filter((item) => item.priority === 'secondary');
  }

  trackById(index: number, item: SocialLink): string {
    return item.id;
  }
}
