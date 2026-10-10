import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, ViewChild } from '@angular/core';

import { Sublocation, CampaignSublocationInstance } from '../../../../models/sublocation.model';

import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';
import { CcSublocationIconComponent } from '../../Shared/cc-sublocation-icon/cc-sublocation-icon.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../../core/drawer.service';



/**
 * cc-sublocation-card
 *
 * The campaign's own sublocation card: a copy of the shared `app-sublocation-card`
 * (see shared/components/sublocation-card) that the campaign deck draws instead, so
 * the deck's card can move on without dragging the v1 pages along. The card itself is
 * the same card — same markup, same styles, same inputs and outputs — and only the
 * selector differs; the v1 library and detail pages stay on `app-sublocation-card`.
 */
@Component({

  selector: 'cc-sublocation-card',

  standalone: true,

  imports: [CcLockButtonComponent, CcSublocationIconComponent, CcDeleteButtonComponent],

  /** OnPush: the card is a leaf of plain inputs, so it is drawn again only when one of them changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,

  templateUrl: './cc-sublocation-card.component.html',

  styleUrl: './cc-sublocation-card.component.scss'

})

export class CcSublocationCardComponent {

  private shellSvc = inject(CampaignShellService);
  private drawerService = inject(DrawerService);



  @Input({ required: true }) sublocation!: Sublocation | CampaignSublocationInstance;

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
   * card's ✦ Details to everyone else and, with it, the row of casts under the card (see
   * cc-card-navigation). A viewer without the role is handed the card without the padlock, and
   * with the ✦ Details only while the card's own lock is open — a locked card is a sealed one.
   */
  @Input() isDm            = false;

  @Input() isPrimary        = false;

  @Input() canSetPrimary    = false;

  @Input() primaryLocked    = false;

  @Input() secretContent: string | null = null;

  @Input() symbolPath: string | null = null;

  @Input() cardSecrets: any[] = [];



  @Output() editClick      = new EventEmitter<void>();
  @Output() deleteClick    = new EventEmitter<void>();
  @Output() fileSelected   = new EventEmitter<File>();
  @Output() secretsClick   = new EventEmitter<void>();
  @Output() cardClick      = new EventEmitter<void>();
  @Output() primaryToggled = new EventEmitter<void>();
  @Output() detailsClick   = new EventEmitter<void>();

  @Input() campaignId: string | null = null;
  @Input() sublocationInstanceId: string | null = null;

  /**
   * Draws the compact delete control in the back face's top-right corner — the counterpart of the
   * library row's full-width ✦ Delete, which the campaign row does not draw (its cards are not
   * edited there, see `editable`). The control asks before it deletes (see `cc-delete-button`) and
   * emits `deleteClick`, as that button does.
   *
   * Only ever drawn in campaign mode (see the template), and only when the caller says the card may
   * go: the campaign's own row passes the GM's answer for a sublocation holding no cast card, since
   * a sublocation with casts in it has to be emptied before it can leave the campaign.
   */
  @Input() deletable  = false;
  /** A delete of this card is in flight, so the control is held while the write lands. */
  @Input() deleting   = false;



  flipped = false;

  get tiltTransform(): string {

    return this.tilt ? `rotate(${this.tilt}deg)` : '';

  }



  get shopItemCount(): number {

    return this.sublocation.shopItems?.length ?? 0;

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



  onFileInputChange(e: Event): void {

    const file = (e.target as HTMLInputElement).files?.[0];

    if (file) this.fileSelected.emit(file);

  }



  onDetailsClick(e: Event): void {
    e.stopPropagation();
    this.drawerService.openSublocationDetail({
      sublocation: this.sublocation,
      secrets: this.cardSecrets,
      campaignId: this.campaignId,
      sublocationInstanceId: this.sublocationInstanceId
    });
  }

  onNameClick(e: Event): void {

    e.stopPropagation();

    this.drawerService.openChronicle({
      initialSearchQuery: this.sublocation.name
    });

  }

}

