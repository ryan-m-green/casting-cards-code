import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerCardWithDetails } from '../../../../models/player-card.model';
import { CcPlayerIconComponent } from '../../Shared/cc-player-icon/cc-player-icon.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

/**
 * cc-player-card
 *
 * The campaign's own player card: a copy of the shared `app-casting-card-player`
 * (see shared/components/casting-card-player) that the campaign deck draws instead, so
 * the deck's card can move on without dragging the v1 pages along. The card itself is
 * the same card — same markup, same styles, same inputs and outputs — and only the
 * selector differs; the v1 party pages stay on `app-casting-card-player`.
 */
@Component({
  selector: 'cc-player-card',
  standalone: true,
  imports: [CommonModule, CcPlayerIconComponent],
  /** OnPush: the card is a leaf of plain inputs, so it is drawn again only when one of them changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-player-card.component.html',
  styleUrl: './cc-player-card.component.scss',
})
export class CcPlayerCardComponent {
  private shellSvc = inject(CampaignShellService);
  private el = inject(ElementRef);

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

  private inSwiper(): boolean {
    return !!this.el.nativeElement?.closest('.swiper-slide');
  }

  onPointerDown(e: PointerEvent): void {
    this._ptrStartX = e.clientX;
    this._ptrStartY = e.clientY;
    this._dragging  = false;
    if (this.inSwiper()) return;
  }

  onPointerMove(e: PointerEvent): void {
    if (this.inSwiper()) return;
    if (Math.abs(e.clientX - this._ptrStartX) > 5 ||
        Math.abs(e.clientY - this._ptrStartY) > 5) {
      this._dragging = true;
    }
  }

  toggleFlip(e?: MouseEvent): void {
    if (this.inSwiper()) {
      if (!e ||
          Math.abs(e.clientX - this._ptrStartX) > 5 ||
          Math.abs(e.clientY - this._ptrStartY) > 5) {
        return;
      }
    } else if (this._dragging) {
      this._dragging = false;
      return;
    }
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
