import { Component, ElementRef, EventEmitter, Output, inject, input } from '@angular/core';
import { PlayerCard } from '../../models/player-card.model';
import { CcPlayerIconComponent } from '../v2/cc-player-icon/cc-player-icon.component';

@Component({
  selector: 'app-simple-player-card',
  standalone: true,
  imports: [CcPlayerIconComponent],
  templateUrl: './simple-player-card.component.html',
  styleUrl: './simple-player-card.component.scss'
})
export class SimplePlayerCardComponent {
  player = input.required<PlayerCard>();

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
