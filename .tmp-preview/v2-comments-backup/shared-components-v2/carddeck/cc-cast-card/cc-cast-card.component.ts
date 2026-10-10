import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, inject, ViewChild } from '@angular/core';
import { Cast, CampaignCastInstance } from '../../../../models/cast.model';
import { CcLockButtonComponent } from '../../Shared/cc-lock-button/cc-lock-button.component';
import { CcCastIconComponent } from '../../Shared/cc-cast-icon/cc-cast-icon.component';
import { CcBloodiedCrossComponent } from '../../Shared/cc-bloodied-cross/cc-bloodied-cross.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcCastTravelComponent } from '../../Shared/cc-cast-travel/cc-cast-travel.component';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { DrawerService } from '../../../../../core/drawer.service';

/**
 * cc-cast-card
 *
 * The campaign's own cast card: a copy of the shared `app-cast-card` (see
 * shared/components/cast-card) that the campaign deck draws instead, so the deck's
 * card can move on without dragging the v1 pages along. The card itself is the same
 * card — same markup, same styles, same inputs and outputs — and only the selector
 * differs; the v1 library and detail pages stay on `app-cast-card`.
 */
@Component({
  selector: 'cc-cast-card',
  standalone: true,
  imports: [CcLockButtonComponent, CcCastIconComponent, CcBloodiedCrossComponent, CcDeleteButtonComponent, CcCastTravelComponent],
  /**
   * OnPush: the card is a leaf of plain inputs and its own signals, so it is drawn again only when
   * one of them changes — a click of its own (the flip, the hovered star) still redraws it, since a
   * component's own event is reason enough to check it.
   */
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
  /**
   * Draws the delete control in the back face's top-right corner — the compact counterpart
   * of the full-width Edit/Delete row, for callers that want the card removable without that
   * row and with the same "are you sure" the faction card wears (see `cc-delete-button`).
   *
   * The control is only ever drawn in campaign mode (see the template), and only when the
   * caller says the card may go: the campaign card rows pass the answer for the membership
   * the card stands for, so the dagger is the hand that holds it — the GM's own, or the
   * party's where `ownMembership` says the row is theirs.
   */
  @Input() deletable       = false;
  /**
   * Whether the card stands for a membership of the viewer's own — the party's row of a
   * faction's members (see cc-card-faction-navigation) — so the way off it is their hand to
   * work, GM or not. `deletable` still says the card may go; this says whose hand may say so.
   * It opens the dagger alone: the lock, the travel control and ✦ Details stay the GM's own.
   */
  @Input() ownMembership   = false;
  /** A delete of this card is in flight, so the control is held while the write lands. */
  @Input() deleting        = false;
  /** The delete control's tooltip and accessible name; the card's own `Delete <name>` when
   *  the caller does not say otherwise — a faction row names the association it breaks. */
  @Input() deleteLabel     = '';
  /** What the control's confirming button reads, where the caller's action is not a whole
   *  delete; it stays `Delete` when empty. */
  @Input() deleteConfirmLabel = '';
  /**
   * The card is out of the fight: a bloodied cross is painted over it, corner to
   * corner. The encounter says when a combatant is down (see the HP panel of the
   * combatant drawer), and the cross is drawn over both faces so flipping the card
   * does not hide it.
   */
  @Input() isDefeated      = false;
  /** Whether clicking the card's title searches the chronicle for the cast. */
  @Input() titleSearch     = true;
  @Input() queueable       = false;
  @Input() tilt            = 0;
  @Input() showStars       = false;
  @Input() imageUpload     = false;
  @Input() secrets         = false;
  @Input() secretsRevealed = false;
  @Input() campaignMode    = false;
  /**
   * Whether the viewer is a GM/Admin. The GM/Admin is the only role that works the card's lock
   * (see the secrets block in the template) and the only one handed the card's own GM controls:
   * the travel control, the delete control and — with the lock open — the way into the drawer.
   * Anyone else gets the ✦ Details only while the card's own lock is open: a locked card is a
   * sealed card, on the row and with nothing to press.
   */
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

  /**
   * Whether the card carries the travel control in its back action row (see `cc-cast-travel`),
   * standing beside ✦ Details and sharing that row with it — the details button taking the whole
   * row when this is off. Only ever drawn in campaign mode: travelling is a campaign's own
   * business, and a library card has no campaign instance behind it and nowhere to be.
   */
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

  /** The campaign instance behind the card, when the caller handed one over. */
  private get campaignInstance(): CampaignCastInstance | null {
    const cast = this.cast as CampaignCastInstance;
    return cast && cast.instanceId ? cast : null;
  }

  /** The card's own campaign instance id, for the travel control; empty on a library card. */
  get castInstanceId(): string {
    return this.campaignInstance?.instanceId ?? '';
  }

  /** The sublocation the card stands in, for the travel control; empty when it knows of none. */
  get sublocationInstanceId(): string {
    return this.campaignInstance?.sublocationInstanceId ?? '';
  }

  /**
   * Whether the card's own lock is open — the poll the back face's campaign row hangs on (see the
   * template): the GM is handed that row whatever the lock says, and anyone else only while it is
   * open, a locked card being a sealed one.
   *
   * `secretsRevealed` is the caller's word for it. Where a caller hands over a campaign card without
   * one — the party panel's companions, a faction row's casts, which hand the card over and leave
   * the reading to it — the card takes the lock off itself: `isVisibleToPlayers` is the state the
   * lock control writes, on the card's own front and in the ✦ Details drawer alike. A library card
   * has no campaign instance behind it and so nothing to read, and the caller's word stands.
   */
  get lockOpen(): boolean {
    return this.secretsRevealed || this.campaignInstance?.isVisibleToPlayers === true;
  }

  readonly starNums = [1, 2, 3];

  get tiltTransform(): string {
    return this.tilt ? `rotate(${this.tilt}deg)` : '';
  }

  /** The delete control's own "are you sure" lives in `cc-delete-button`; this is how the
   *  card puts it back to its dagger when the card is flipped back to its front. */
  @ViewChild(CcDeleteButtonComponent) deleteButton?: CcDeleteButtonComponent;

  toggleFlip(e: Event): void {
    if (!this.flippable) return;
    this.flipped = !this.flipped;
    // An armed delete does not stay armed behind the card.
    if (!this.flipped) this.deleteButton?.reset();
  }

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
    { top: '15%',  left: '80%', translateX: '-50%', translateY: '-50%' }, // TR
    { top: '85%',  left: '20%', translateX: '-50%', translateY: '-50%' }, // BL
    { top: '15%',  left: '20%', translateX: '-50%', translateY: '-50%' }, // TL
    { top: '85%',  left: '80%', translateX: '-50%', translateY: '-50%' }, // BR
  ];

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
    this.drawerService.openChronicle({
      initialSearchQuery: this.cast.name
    });
  }
}
