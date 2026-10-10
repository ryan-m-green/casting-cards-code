import { Component, ChangeDetectionStrategy, inject, input, Output, EventEmitter, computed, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Faction, CampaignFactionInstance } from '../../../../models/faction.model';
import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';
import { CcFactionIconComponent } from '../../Shared/cc-faction-icon/cc-faction-icon.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../../core/drawer.service';
import { AuthService } from '../../../../../core/auth/auth.service';

export type FactionAlignment = 'good' | 'neutral' | 'evil';

/**
 * cc-faction-card
 *
 * The campaign's own faction card: a copy of the shared `app-faction-card` (see
 * shared/components/faction-card) that the campaign deck draws instead, so the deck's
 * card can move on without dragging the v1 pages along. The card itself is the same
 * card — same markup, same styles, same inputs and outputs — and only the selector
 * differs; the v1 library and detail pages stay on `app-faction-card`.
 */
@Component({
  selector: 'cc-faction-card',
  standalone: true,
  imports: [CommonModule, CcLockButtonComponent, CcFactionIconComponent, CcDeleteButtonComponent],
  /** OnPush: the card is a leaf of a signal input and its own flip, so only its own moves redraw it. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-faction-card.component.html',
  styleUrl: './cc-faction-card.component.scss'
})
export class CcFactionCardComponent {
  private shellSvc = inject(CampaignShellService);
  private drawerService = inject(DrawerService);
  private auth = inject(AuthService);

  faction = input.required<Faction | CampaignFactionInstance>();
  tilt = input(0);
  flippable = input(true);
  editable = input(true);
  /**
   * Draws a delete button in the back face's top-right corner — the compact counterpart of
   * the full-width Delete in `.fac-back-actions`, for callers that want the card removable
   * without the whole Edit/Delete row. It asks before it deletes (see `pendingDelete`) and
   * emits `deleteClick`, same as that button.
   */
  deletable = input(false);
  /** A delete of this card is in flight, so its buttons are held while the write lands. */
  deleting = input(false);
  imageUpload = input(false);
  campaignMode = input(false);
  details = input(false);
  secrets = input(false);
  secretsRevealed = input(false);
  relationshipType = input<string | null>(null);
  relationshipStrength = input<number | null>(null);

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();

  flipped = false;

  get alignment(): FactionAlignment {
    const p = this.faction().perception ?? 0;
    if (p > 0) return 'good';
    if (p < 0) return 'evil';
    return 'neutral';
  }

  get isGood(): boolean    { return this.alignment === 'good'; }
  get isNeutral(): boolean { return this.alignment === 'neutral'; }
  get isEvil(): boolean    { return this.alignment === 'evil'; }

  get alignLabel(): string {
    if (this.isGood)    return 'Friendly Faction';
    if (this.isNeutral) return 'Unknown Alignment';
    return 'Hostile Faction';
  }

  get alignStat(): string {
    if (this.isGood)    return 'Friendly';
    if (this.isNeutral) return 'Unknown';
    return 'Hostile';
  }

  get portraitHint(): string {
    if (this.isGood)    return 'Banner of the Alliance';
    if (this.isNeutral) return 'Allegiance Unrevealed';
    return 'Mark of the Dark Order';
  }

  get imageUrl(): string | undefined {
    const f = this.faction();
    return 'imageUrl' in f ? f.imageUrl : undefined;
  }

  goodColor = computed(() => {
    const customColor = this.faction().colors?.goodColor;
    if (customColor && customColor !== '#000000') return customColor;
    return '#ff99bb';
  });

  evilColor = computed(() => {
    const customColor = this.faction().colors?.evilColor;
    if (customColor && customColor !== '#000000') return customColor;
    return '#004d1a';
  });

  get tiltTransform(): string {
    return this.tilt() ? `rotate(${this.tilt()}deg)` : '';
  }

  /**
   * The faction's political influence, 0–10, as the pips across the portrait's own top-left corner
   * read it (see the template). It is the faction's own where the campaign's row is the one drawn
   * — and the party's own reading where the party's row is, since that is the influence the read
   * hands the card (see cc-card-faction-navigation).
   */
  readonly influence = computed(() => {
    const value = this.faction().influence ?? 0;
    return Math.min(10, Math.max(0, Math.round(value)));
  });

  get stats(): { k: string; v: string }[] {
    return [
      { k: 'Type',      v: this.faction().type },
      { k: 'Influence', v: this.faction().influence ? String(this.faction().influence) : '' },
    ];
  }

  /** The delete control's own "are you sure" lives in `cc-delete-button`; this is how the
   *  card puts it back to its dagger when the card is flipped back to its front. */
  @ViewChild(CcDeleteButtonComponent) deleteButton?: CcDeleteButtonComponent;

  toggleFlip(e: Event): void {
    if (this.campaignMode()) { this.cardClick.emit(); return; }
    if (this.flippable()) {
      this.flipped = !this.flipped;
      // An armed delete does not stay armed behind the card.
      if (!this.flipped) this.deleteButton?.reset();
    } else {
      this.cardClick.emit();
    }
  }

  /** The DM confirmed the delete of the back face's control; the caller writes it. */
  onConfirmDelete(): void {
    this.deleteClick.emit();
  }

  onSecretsClick(e: Event): void {
    e.stopPropagation();
    this.secretsClick.emit();
  }

  onDetailsClick(e: Event): void {
    e.stopPropagation();
    const f = this.faction();
    // Only campaign faction instances can open the details drawer
    if (!('factionInstanceId' in f)) return;
    // The panel is drawn for the role that opened it: a player is handed it to read, with no
    // editor on it and the GM's own notes left off (see FactionDetailContentComponent).
    this.drawerService.openFactionDetail({
      faction: f,
      campaignId: f.campaignId,
      isDm: this.auth.isDm()
    });
  }

  onEditClick(e: Event): void {
    e.stopPropagation();
    this.editClick.emit();
  }

  onDeleteClick(e: Event): void {
    e.stopPropagation();
    this.deleteClick.emit();
  }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  onNameClick(e: Event): void {
    e.stopPropagation();
    this.shellSvc.openChronicleDrawerWithSearch(this.faction().name);
  }
}
