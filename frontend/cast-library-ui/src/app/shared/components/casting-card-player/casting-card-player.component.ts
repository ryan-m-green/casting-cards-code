import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerCardWithDetails } from '../../models/player-card.model';

@Component({
  selector: 'app-casting-card-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './casting-card-player.component.html',
  styleUrl: './casting-card-player.component.scss',
})
export class CastingCardPlayerComponent {
  @Input({ required: true }) member!: PlayerCardWithDetails;
  @Input() mode: 'player' | 'dm' = 'player';
  @Input() tilt = 0;

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  @Output() viewSecrets      = new EventEmitter<PlayerCardWithDetails>();
  @Output() awardGold        = new EventEmitter<PlayerCardWithDetails>();
  @Output() manageConditions = new EventEmitter<PlayerCardWithDetails>();
  @Output() deliverSecret    = new EventEmitter<PlayerCardWithDetails>();
  @Output() viewAllSecrets   = new EventEmitter<PlayerCardWithDetails>();

  flipped = false;

  initial(name: string): string { return name.charAt(0).toUpperCase(); }

  conditionNames(): string {
    return this.member.conditions.map(c => c.conditionName).join(', ');
  }
}
