import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, inject, ViewChild } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../../../models/cast.model';
import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';
import { CcCastIconComponent } from '../../Shared/cc-cast-icon/cc-cast-icon.component';
import { CcBloodiedCrossComponent } from '../../Shared/cc-bloodied-cross/cc-bloodied-cross.component';
import { CcEscapedWingsComponent } from '../../Shared/cc-escaped-wings/cc-escaped-wings.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcCastTravelComponent } from '../../Shared/cc-cast-travel/cc-cast-travel.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../../core/drawer.service';

@Component({
  selector: 'cc-cast-card',
  standalone: true,
  imports: [CcLockButtonComponent, CcCastIconComponent, CcBloodiedCrossComponent, CcEscapedWingsComponent, CcDeleteButtonComponent, CcCastTravelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-cast-card.component.html',
  styleUrl: './cc-cast-card.component.scss'
})
export class CcCastCardComponent {
  @Input({ required: true }) cast!: Cast;
  @Input() campaignId: string = '';
  private shellSvc = inject(CampaignShellService);
  private drawerService = inject(DrawerService);

  @Input() editable        = true;
  @Input() flippable       = true;
  @Input() deletable       = false;
  @Input() ownMembership   = false;
  @Input() deleting        = false;
  @Input() deleteLabel     = '';
  @Input() deleteConfirmLabel = '';
  @Input() isDefeated      = false;
  @Input() isCaptured      = false;
  @Input() isEscaped       = false;
  @Input() titleSearch     = true;
  @Input() queueable       = false;
  @Input() tilt            = 0;
  @Input() showStars       = false;
  @Input() imageUpload     = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;

  @Input() secretsDisabled = false;
  @Input() campaignMode    = false;
  @Input() isDm            = false;
  @Input() rating          = 0;
  @Input() readonlyStars   = false;
  @Input() setStars: number | null = null;
  @Input() secretContent: string | null = null;
  @Input() dmMode          = false;
  @Input() isPrimary        = false;
  @Input() canSetPrimary    = false;
  @Input() primaryLocked    = false;
  @Input() factionSymbols: { factionInstanceId: string; symbolPath: string }[] = [];
  @Input() isTraveling: boolean | null = null;

  @Input() travelable      = true;

  @Input() cardSecrets: any[] = [];

  @Output() editClick      = new EventEmitter<void>();
  @Output() deleteClick    = new EventEmitter<void>();
  @Output() fileSelected   = new EventEmitter<File>();
  @Output() secretsClick   = new EventEmitter<void>();
  @Output() cardClick      = new EventEmitter<void>();
  @Output() primaryToggled = new EventEmitter<void>();
  @Output() detailsClick   = new EventEmitter<void>();

  flipped   = false;
  stars     = signal(0);
  starHover = signal<number | null>(null);

  private get campaignInstance(): CampaignCastInstance | null {
    const cast = this.cast as CampaignCastInstance;
    return cast && cast.instanceId ? cast : null;
  }

  get castInstanceId(): string {
    return this.campaignInstance?.instanceId ?? '';
  }

  get sublocationInstanceId(): string {
    return this.campaignInstance?.sublocationInstanceId ?? '';
  }

  get lockOpen(): boolean {
    return this.secretsRevealed || this.campaignInstance?.isVisibleToPlayers === true;
  }

  readonly starNums = [1, 2, 3];

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  @ViewChild(CcDeleteButtonComponent) deleteButton?: CcDeleteButtonComponent;

  toggleFlip(e: Event): void {
    if (!this.flippable) return;
    this.flipped = !this.flipped;
    if (!this.flipped) this.deleteButton?.reset();
  }

  onConfirmDelete(): void {
    this.deleteClick.emit();
  }

  onSecretsClick(e: Event): void {
    e.stopPropagation();
    if (!this.isDm) return;
    this.secretsClick.emit();
  }

  onCrownClick(e: Event): void {
    e.stopPropagation();
    if (!this.canSetPrimary || this.primaryLocked) return;
    this.primaryToggled.emit();
  }

  onEditClick(e: Event): void {
    e.stopPropagation();
    if (this.editable) this.editClick.emit();
  }

  onDeleteClick(e: Event): void {
    e.stopPropagation();
    this.deleteClick.emit();
  }

  onStarClick(e: Event, n: number): void {
    e.stopPropagation();
    if (this.readonlyStars || this.setStars !== null) return;
    this.stars.set(this.stars() === n ? 0 : n);
  }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  starFilled(n: number): boolean {
    if (this.setStars !== null) return n <= this.setStars;
    if (this.readonlyStars) return n <= this.rating;
    return n <= (this.starHover() ?? this.stars());
  }

  readonly symbolCorners = [
    { top: '15%',  left: '80%', translateX: '-50%', translateY: '-50%' },
    { top: '85%',  left: '20%', translateX: '-50%', translateY: '-50%' },
    { top: '15%',  left: '20%', translateX: '-50%', translateY: '-50%' },
    { top: '85%',  left: '80%', translateX: '-50%', translateY: '-50%' },
  ];

  /**
   * The symbols the card wears. Anything handed in at the call site wins; otherwise they are the
   * campaign's own — the symbols of every faction this cast is a member of (see the shell's
   * `factionSymbolsForCast`). Nothing has to be wired at the call sites, so every card the v2
   * campaign draws wears the tie alike, wherever it stands.
   */
  get resolvedFactionSymbols(): { factionInstanceId: string; symbolPath: string }[] {
    if (this.factionSymbols.length) return this.factionSymbols;
    return this.castInstanceId ? this.shellSvc.factionSymbolsForCast(this.castInstanceId) : [];
  }

  symbolStyle(index: number): Record<string, string> {
    const c = this.symbolCorners[index];
    return {
      top: c.top,
      left: c.left,
      transform: `translate(${c.translateX}, ${c.translateY})`,
    };
  }

  onDetailsClick(e: Event): void {
    e.stopPropagation();
    const castInstance = this.campaignMode ? (this.cast as any) : null;
    this.drawerService.openCastDetail({
      cast: this.cast,
      secrets: this.cardSecrets,
      campaignId: this.campaignId,
      castInstanceId: castInstance?.instanceId
    });
  }

  onNameClick(e: Event): void {
    e.stopPropagation();
    if (!this.titleSearch) return;
    this.shellSvc.openChronicleDrawerWithSearch(this.cast.name);
  }
}
