import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { heroData } from '../hub.config';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
})
export class HeroComponent {
  readonly hero = heroData;
}
