import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, ViewChild } from '@angular/core';
import { Location } from '../../../../models/location.model';
import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';
import { CcLocationIconComponent } from '../../Shared/cc-location-icon/cc-location-icon.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../../core/drawer.service';

/**
 * cc-location-card
 *
 * The campaign's own location card: a copy of the shared `app-location-card` (see
 * shared/components/location-card) that the campaign deck draws instead, so the deck's
 * card can move on without dragging the v1 pages along. The card itself is the same
 * card — same markup, same styles, same inputs and outputs — and only the selector
 * differs; the v1 library and detail pages stay on `app-location-card`.
 */
@Component({
  selector: 'cc-location-card',
  standalone: true,
  imports: [CcLockButtonComponent, CcLocationIconComponent, CcDeleteButtonComponent],
  /** OnPush: the card is a leaf of plain inputs, so it is drawn again only when one of them changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-location-card.component.html',
  styleUrl: './cc-location-card.component.scss'
})
export class CcLocationCardComponent {
  private shellSvc = inject(CampaignShellService);
  private drawerService = inject(DrawerService);

  @Input({ required: true }) location!: Location;
  @Input() editable        = true;
  @Input() flippable       = true;
  @Input() queueable       = false;
  @Input() tilt            = 0;
  @Input() imageUpload     = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;
  @Input() campaignMode    = false;
  /**
   * Whether the viewer is a GM/Admin. The lock is the GM's alone: it is the hand that opens a
   * card's ✦ Details to everyone else and, with it, the row of children under the card (see
   * cc-card-navigation). A viewer without the role is handed the card without the padlock, and
   * with the ✦ Details only while the card's own lock is open — a locked card is a sealed one.
   */
  @Input() isDm            = false;
  @Input() secretContent: string | null = null;
  @Input() cardSecrets: any[] = [];
  @Input() campaignId: string = '';

  /**
   * Draws the compact delete control in the back face's top-right corner — the counterpart of the
   * library row's full-width ✦ Delete, which the campaign row does not draw (its cards are not
   * edited there, see `editable`). The control asks before it deletes (see `cc-delete-button`) and
   * emits `deleteClick`, as that button does.
   *
   * Only ever drawn in campaign mode (see the template), and only when the caller says the card may
   * go: the campaign's own row passes the GM's answer for a location holding no sublocation, since
   * a location with sublocations under it has to be emptied before it can leave the campaign.
   */
  @Input() deletable  = false;
  /** A delete of this card is in flight, so the control is held while the write lands. */
  @Input() deleting   = false;

  @Output() editClick    = new EventEmitter<void>();
  @Output() deleteClick  = new EventEmitter<void>();
  @Output() fileSelected = new EventEmitter<File>();
  @Output() secretsClick = new EventEmitter<void>();
  @Output() cardClick    = new EventEmitter<void>();
  @Output() detailsClick  = new EventEmitter<void>();

  flipped = false;

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  get terrainType(): 'city' | 'mountain' | 'forest' | 'dungeon' {
    const cls = (this.location.classification || '').toLowerCase();
    if (cls.includes('city') || cls.includes('town') || cls.includes('village')) return 'city';
    if (cls.includes('mountain') || cls.includes('hill'))                        return 'mountain';
    if (cls.includes('forest') || cls.includes('wood') || cls.includes('jungle')) return 'forest';
    return 'dungeon';
  }

  get stats(): { k: string; v: string }[] {
    const l = this.location;
    return [
      { k: 'Type',         v: l.classification || '—' },
      { k: 'Size',         v: l.size           || '—' },
      { k: 'Condition',    v: l.condition       || '—' },
      { k: 'Geography',    v: l.geography       || '—' },
      { k: 'Architecture', v: l.architecture    || '—' },
      { k: 'Climate',      v: l.climate         || '—' },
      { k: 'Religion',     v: l.religion        || '—' },
      { k: 'Vibe',         v: l.vibe            || '—' },
    ];
  }

  toggleFlip(e: Event): void {
    if (this.flippable) this.flipped = !this.flipped;
    // An armed delete does not stay armed behind the card.
    if (!this.flipped) this.deleteButton?.reset();
  }

  /** The delete control's own "are you sure" lives in `cc-delete-button`; this is how the card
   *  puts it back to its dagger when the card is flipped back to its front. */
  @ViewChild(CcDeleteButtonComponent) deleteButton?: CcDeleteButtonComponent;

  /** The GM confirmed the delete of the back face's control; the caller writes it. */
  onConfirmDelete(): void {
    this.deleteClick.emit();
  }

  onSecretsClick(e: Event): void {
    e.stopPropagation();
    // Working the lock is the GM's own call: the button is not drawn for anyone else, and the
    // write behind it is not theirs to make.
    if (!this.isDm) return;
    this.secretsClick.emit();
  }

  onEditClick(e: Event): void {
    e.stopPropagation();
    if (this.editable) this.editClick.emit();
  }

  onDeleteClick(e: Event): void {
    e.stopPropagation();
    this.deleteClick.emit();
  }

  onFileInputChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.fileSelected.emit(file);
  }

  onDetailsClick(e: Event): void {
    e.stopPropagation();
    this.drawerService.openLocationDetail({
      location: this.location,
      secrets: this.cardSecrets,
      campaignId: this.campaignId
    });
  }

  onNameClick(e: Event): void {
    e.stopPropagation();
    this.drawerService.openChronicle({
      initialSearchQuery: this.location.name
    });
  }
}
