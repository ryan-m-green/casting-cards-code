import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PlayerEventItem {
  id: string;
  title: string;
  body: string;
  linkedEntityType: string | null;
  sortOrder: number;
  createdAt: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-player-event-card-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-event-card-item.component.html',
  styleUrl: './player-event-card-item.component.scss',
})
export class PlayerEventCardItemComponent {
  @Input() event!: PlayerEventItem;
  @Input() expanded: boolean = false;
  @Output() toggle = new EventEmitter<void>();
}
