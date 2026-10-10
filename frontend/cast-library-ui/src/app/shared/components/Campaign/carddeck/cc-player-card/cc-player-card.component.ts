import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlayerCardWithDetails } from '../../../../models/player-card.model';
import { CcPlayerIconComponent } from '../../Shared/cc-player-icon/cc-player-icon.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';

@Component({
  selector: 'cc-player-card',
  standalone: true,
  imports: [CommonModule, CcPlayerIconComponent],
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
  @Input() actions = true;

  get tiltTransform(): string {
    if (this.flipped) return '';
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  @Output() cardActions = new EventEmitter<PlayerCardWithDetails>();

  flipped = false;

  private _ptrStartX = 0;
  private _ptrStartY = 0;
  private _dragging  = false;

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

  initial(name: string): string { return name.charAt(0).toUpperCase(); }

  onNameClick(e: Event): void {
    e.stopPropagation();
    this.shellSvc.openChronicleDrawerWithSearch(this.member.name);
  }
}
