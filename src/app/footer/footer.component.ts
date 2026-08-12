import { Component } from '@angular/core';
import { CatEasterEggComponent } from '../shared/cat-easter-egg/cat-easter-egg.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, CatEasterEggComponent],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {}
