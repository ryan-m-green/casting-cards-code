import { Component, ChangeDetectionStrategy, ElementRef, EventEmitter, Output, computed, inject, input } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../../../models/cast.model';
import { CcCastIconComponent } from '../../Shared/cc-cast-icon/cc-cast-icon.component';
import { CcBloodiedCrossComponent } from '../../Shared/cc-bloodied-cross/cc-bloodied-cross.component';
import { CcEscapedWingsComponent } from '../../Shared/cc-escaped-wings/cc-escaped-wings.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-simple-cast-card',
  standalone: true,
  imports: [CcCastIconComponent, CcBloodiedCrossComponent, CcEscapedWingsComponent],
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

  /**
   * The faction symbols the mini-card wears: the campaign's own, for every faction the cast is a
   * member of (see the shell's `factionSymbolsForCast`) — the same tie the full card wears, so a
   * card drawn small in a stack, a row or a picker still shows the faction it belongs to.
   */
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

  /**
   * The line under the name. A card that reached here without a role or a race — a link that carries
   * only a name — shows none rather than a bare separator.
   */
  readonly subtitle = computed(() =>
    [this.cast().role, this.cast().race].filter(part => !!part).join(' · '));

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