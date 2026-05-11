import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
})
export class EventCardComponent {
  @Input() eventTitle: string | null = null;
  @Input() portalColor: string = '#6e28d0';
  @Output() dismissed = new EventEmitter<void>();

  dismiss() { this.dismissed.emit(); }
}
