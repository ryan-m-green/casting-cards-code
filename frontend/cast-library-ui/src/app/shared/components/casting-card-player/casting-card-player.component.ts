import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerCardWithDetails } from '../../models/player-card.model';
import { CampaignShellService } from '../../../core/campaign-shell.service';

@Component({
  selector: 'app-casting-card-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './casting-card-player.component.html',
  styleUrl: './casting-card-player.component.scss',
})
export class CastingCardPlayerComponent {
  private shellSvc = inject(CampaignShellService);

  @Input({ required: true }) member!: PlayerCardWithDetails;
  @Input() mode: 'player' | 'dm' = 'player';
  @Input() tilt = 0;
  @Input() flippable = true;

  get tiltTransform(): string {
    if (this.flipped) return '';
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  @Output() cardActions = new EventEmitter<PlayerCardWithDetails>();

  flipped = false;

  private _ptrStartX = 0;
  private _ptrStartY = 0;
  private _dragging  = false;

  private _backScrollStartY   = 0;
  private _backScrollStartTop = 0;
  private _backScrollActive   = false;

  onPointerDown(e: PointerEvent): void {
    this._ptrStartX = e.clientX;
    this._ptrStartY = e.clientY;
    this._dragging  = false;
  }

  onPointerMove(e: PointerEvent): void {
    if (Math.abs(e.clientX - this._ptrStartX) > 5 ||
        Math.abs(e.clientY - this._ptrStartY) > 5) {
      this._dragging = true;
    }
  }

  toggleFlip(): void {
    if (this._dragging) { this._dragging = false; return; }
    this.flipped = !this.flipped;
  }

  onBackWheel(e: WheelEvent, el: HTMLElement): void {
    el.scrollTop += e.deltaY;
    e.stopPropagation();
  }

  onBackScrollStart(e: PointerEvent, el: HTMLElement): void {
    this._backScrollStartY   = e.clientY;
    this._backScrollStartTop = el.scrollTop;
    this._backScrollActive   = true;
  }

  onBackScrollMove(e: PointerEvent, el: HTMLElement): void {
    if (!this._backScrollActive) return;
    el.scrollTop = this._backScrollStartTop + (this._backScrollStartY - e.clientY);
  }

  onBackScrollEnd(): void {
    this._backScrollActive = false;
  }

  initial(name: string): string { return name.charAt(0).toUpperCase(); }

  conditionNames(): string {
    return this.member.conditions.map(c => c.conditionName).join(', ');
  }

  onNameClick(e: Event): void {
    e.stopPropagation();
    this.shellSvc.openChronicleDrawerWithSearch(this.member.name);
  }
}
