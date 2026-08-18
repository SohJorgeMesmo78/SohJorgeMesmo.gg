import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ArsenalIcon, arsenalItems } from './arsenal.config';

const ICONS: Record<ArsenalIcon, string> = {
  keyboard: '⌨',
  mouse: '◉',
  monitor: '▣',
  microphone: '♬',
  headphones: '🎧',
};

@Component({
  selector: 'app-arsenal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arsenal.component.html',
  styleUrls: ['./arsenal.component.scss'],
})
export class ArsenalComponent {
  readonly items = arsenalItems;
  readonly icons = ICONS;
}
