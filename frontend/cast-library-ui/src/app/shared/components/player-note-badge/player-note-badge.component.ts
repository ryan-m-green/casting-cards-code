import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-note-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-note-badge.component.html',
  styleUrl: './player-note-badge.component.scss'
})
export class PlayerNoteBadgeComponent {
  @Input() isPlayerNote = false;
}
