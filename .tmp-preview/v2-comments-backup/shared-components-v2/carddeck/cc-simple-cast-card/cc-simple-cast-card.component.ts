import { Component, ChangeDetectionStrategy, ElementRef, EventEmitter, Output, inject, input } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../../../models/cast.model';
import { CcCastIconComponent } from '../../Shared/cc-cast-icon/cc-cast-icon.component';
import { CcBloodiedCrossComponent } from '../../Shared/cc-bloodied-cross/cc-bloodied-cross.component';

/**
 * cc-simple-cast-card
 *
 * The deck's back-less cast card — the one the pickers, the rows and the initiative
 * circle draw wherever there is no room for the full card. It lives with the
 * campaign's card deck (see cc-cast-card) rather than with the shared cards.
 */
@Component({
  selector: 'cc-simple-cast-card',
  standalone: true,
  imports: [CcCastIconComponent, CcBloodiedCrossComponent],
  /** OnPush: nothing but its signal inputs draw this card, so it is redrawn only when they change. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-simple-cast-card.component.html',
  styleUrl: './cc-simple-cast-card.component.scss'
})
export class CcSimpleCastCardComponent {
  cast = input.required<Cast | CampaignCastInstance>();

  /**
   * The card is out of the fight: a bloodied cross is painted over it (see
   * cc-bloodied-cross). The encounter's own rows are what say a card is down, so the
   * ring, the builder and the rolls all draw it the same way.
   */
  isDefeated = input(false);

  @Output() cardClick = new EventEmitter<void>();

  private el = inject(ElementRef);
  private _ptrStartX = 0;
  private _ptrStartY = 0;

  private inSwiper(): boolean {
    return !!this.el.nativeElement?.closest('.swiper-slide');
  }

  onPointerDown(e: PointerEvent): void {
    this._ptrStartX = e.clientX;
    this._ptrStartY = e.clientY;
  }

  onCardClick(e: MouseEvent): void {
    if (this.inSwiper() &&
        (Math.abs(e.clientX - this._ptrStartX) > 5 ||
         Math.abs(e.clientY - this._ptrStartY) > 5)) {
      return;
    }
    this.cardClick.emit();
  }
}