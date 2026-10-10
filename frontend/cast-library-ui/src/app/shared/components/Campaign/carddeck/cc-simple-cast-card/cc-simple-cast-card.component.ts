import { Component, ChangeDetectionStrategy, ElementRef, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../../../models/cast.model';
import { CcCastIconComponent } from '../../../Shared/cc-cast-icon/cc-cast-icon.component';
import { CcBloodiedCrossComponent } from '../../../Shared/cc-bloodied-cross/cc-bloodied-cross.component';
import { CcEscapedBadgeComponent } from '../../../Shared/cc-escaped-badge/cc-escaped-badge.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-simple-cast-card',
  standalone: true,
  imports: [CcCastIconComponent, CcBloodiedCrossComponent, CcEscapedBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-simple-cast-card.component.html',
  styleUrl: './cc-simple-cast-card.component.scss'
})
export class CcSimpleCastCardComponent {
  cast = input.required<Cast | CampaignCastInstance>();

  private shellSvc = inject(CampaignShellService);

  isDefeated = input(false);

  isCaptured = input(false);

  isEscaped = input(false);

  readonly factionSymbols = computed(() => {
    const instanceId = (this.cast() as CampaignCastInstance)?.instanceId;
    return instanceId ? this.shellSvc.factionSymbolsForCast(instanceId) : [];
  });

  private readonly symbolCorners = [
    { top: '22%', left: '78%' },
    { top: '78%', left: '22%' },
    { top: '22%', left: '22%' },
    { top: '78%', left: '78%' },
  ];

  symbolStyle(index: number): Record<string, string> {
    const c = this.symbolCorners[index];
    return { top: c.top, left: c.left, transform: 'translate(-50%, -50%)' };
  }

  readonly subtitle = computed(() =>
    [this.cast().role, this.cast().race].filter(part => !!part).join(' · '));

  readonly starNums = [1, 2, 3];

  /**
   * The importance the campaign gave this card, or 0 when it holds none: a cast picked straight
   * from the library, or one the campaign has not rated yet, wears no stars.
   */
  readonly wornStars = computed(() => (this.cast() as CampaignCastInstance)?.starsCount ?? 0);

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