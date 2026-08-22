import { ChangeDetectionStrategy, Component } from '@angular/core';
import { weeklyEvents } from './events.config';

@Component({
  selector: 'app-events',
  standalone: true,
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsComponent {
  readonly events = weeklyEvents;
}
