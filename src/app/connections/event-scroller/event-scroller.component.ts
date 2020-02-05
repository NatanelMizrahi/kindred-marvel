import { Component, Input } from '@angular/core';
import { Event } from '../../api/event';
@Component({
  selector: 'app-event-viewer',
  templateUrl: './event-scroller.component.html',
  styleUrls: ['./event-scroller.component.css']
})
export class EventScrollerComponent {
  @Input() events: Event[];
  constructor() { }

}
