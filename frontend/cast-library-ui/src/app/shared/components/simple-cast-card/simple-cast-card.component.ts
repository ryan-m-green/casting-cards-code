import { Component, ElementRef, EventEmitter, Output, inject, input } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../models/cast.model';
import { CcCastIconComponent } from '../v2/cc-cast-icon/cc-cast-icon.component';

@Component({
  selector: 'app-simple-cast-card',
  standalone: true,
  imports: [CcCastIconComponent],
  templateUrl: './simple-cast-card.component.html',
  styleUrl: './simple-cast-card.component.scss'
})
export class SimpleCastCardComponent {
  cast = input.required<Cast | CampaignCastInstance>();

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