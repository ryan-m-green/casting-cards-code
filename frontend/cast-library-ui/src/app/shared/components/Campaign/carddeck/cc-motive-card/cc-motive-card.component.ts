import { Component, ChangeDetectionStrategy, ElementRef, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { PlayerTrait } from '../../../../models/player-card.model';

const MOTIVE_MARKS: Record<PlayerTrait['traitType'], string> = {
  GOAL: '/dart_hitting_target_bullseye.svg',
  FLAW: '/broken_shield_sword.svg',
  FEAR: '/person_falling_from_cliff.svg',
};

@Component({
  selector: 'cc-motive-card',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-motive-card.component.html',
  styleUrl: './cc-motive-card.component.scss',
})
export class CcMotiveCardComponent {
  trait = input.required<PlayerTrait>();

  typeLabel = input<string>('');

  selected = input(false);

  readonly mark = computed(() => MOTIVE_MARKS[this.trait().traitType]);

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
