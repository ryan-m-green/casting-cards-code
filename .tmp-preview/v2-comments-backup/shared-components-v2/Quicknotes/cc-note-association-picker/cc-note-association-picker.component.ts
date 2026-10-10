import { Component, OnInit, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import {
  QuicknoteAssociationTarget,
  QuicknoteLinkedEntity,
  QuicknoteQueueItem,
} from '../../../../models/quicknote-queue.model';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcSimpleFactionCardComponent } from '../../carddeck/cc-simple-faction-card/cc-simple-faction-card.component';

/** The card types a note may be linked to, in the order the drawer's own buttons stand. */
type CardType = 'location' | 'sublocation' | 'cast' | 'faction';

/** As much of a campaign card as the drawer needs: what every type names itself with. */
interface CardShape {
  name: string;
}

/** One card on offer, whichever type it is. */
interface AssocCard {
  entityType: CardType;
  /** The campaign instance's own id: what the note is linked to. */
  id: string;
  name: string;
  card: CardShape;
}

/** The cards of one type, as the drawer draws them. */
interface CardGroup {
  key: CardType;
  label: string;
  cards: AssocCard[];
}

/**
 * cc-note-association-picker
 *
 * Drawer content for one queued quicknote's link button (see `cc-quicknotes`): the campaign's own
 * cards, to hang off the note as the hashtags it wears.
 *
 * The drawer is laid out the way the note's button asked for it: a search bar at the top, then a
 * button per card type, and under it that type's cards as the simple cards the campaign's own rows
 * are made of. A term typed with no type chosen gathers matches from every type at once, so the
 * search stands on its own; picking a type narrows it to that type.
 *
 * Picks are written as they are made, not as the drawer shuts: closing it by the ✕, by Escape or by
 * the backdrop is a way out of the drawer, and none of those should cost a pick. Each write is the
 * note's whole line — its words, its links and its visibility — because that is what the queue's
 * update takes, and the note's own line in the area behind the drawer re-reads itself off the write
 * (see `publishQuicknotesChanged`).
 */
@Component({
  selector: 'cc-note-association-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CcTextboxComponent,
    CcSimpleLocationCardComponent,
    CcSimpleSublocationCardComponent,
    CcSimpleCastCardComponent,
    CcSimpleFactionCardComponent,
  ],
  templateUrl: './cc-note-association-picker.component.html',
  styleUrl: './cc-note-association-picker.component.scss'
})
export class CcNoteAssociationPickerComponent implements OnInit {
  private http = inject(HttpClient);
  shellSvc = inject(V2CampaignShellService);

  /** Kept for the shell's own bindings, as the other drawer panels carry them. */
  readonly campaignId = input<string>('');
  readonly portalColor = input<string>('#6e28d0');

  /** Raised by the Done button: the shell shuts the drawer. */
  readonly closeDrawer = output<void>();

  /** The note being linked, while this drawer stands. */
  readonly target = computed<QuicknoteAssociationTarget | null>(() => this.shellSvc.quicknoteAssociationTarget());

  readonly cardTypes: { key: CardType; label: string }[] = [
    { key: 'location', label: 'Locations' },
    { key: 'sublocation', label: 'Sublocations' },
    { key: 'cast', label: 'Cast' },
    { key: 'faction', label: 'Factions' },
  ];

  search = signal('');
  activeType = signal<CardType | null>(null);

  /** The note's links as they stand: seeded from the queue line, then written as they are picked. */
  links = signal<QuicknoteLinkedEntity[]>([]);

  saving = signal(false);
  error = signal('');

  /** A pick made while a write was in flight, to be written as soon as that one lands. */
  private pendingSave: QuicknoteLinkedEntity[] | null = null;

  /** The note this drawer has already taken its links from, so a seed never runs twice. */
  private seededFor = '';

  /** Every card of the campaign, of every type, as the note may be linked to them. */
  private readonly campaignCards = computed<AssocCard[]>(() => {
    const campaign = this.shellSvc.campaign();
    if (!campaign) return [];

    // A player is offered the cards they can see; the DM is offered the campaign's own.
    const isDm = this.shellSvc.isDm();
    const offeredToViewer = (card: { isVisibleToPlayers?: boolean }) => isDm || !!card.isVisibleToPlayers;

    return [
      ...(campaign.locations ?? []).filter(offeredToViewer)
        .map(card => this.asCard('location', card.instanceId, card)),
      ...(campaign.sublocations ?? []).filter(offeredToViewer)
        .map(card => this.asCard('sublocation', card.instanceId, card)),
      ...(campaign.casts ?? []).filter(offeredToViewer)
        .map(card => this.asCard('cast', card.instanceId, card)),
      ...(campaign.factions ?? []).filter(offeredToViewer)
        .map(card => this.asCard('faction', card.factionInstanceId, card)),
    ];
  });

  /** The cards the search lets through: by name, or by the type they are. */
  private readonly matchingCards = computed<AssocCard[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.campaignCards();

    return this.campaignCards().filter(card =>
      card.name.toLowerCase().includes(term) || card.entityType.includes(term));
  });

  /**
   * The groups under the type buttons: the chosen type alone, or — with only a search to go on —
   * every type the term matched. Nothing chosen and nothing typed means nothing to draw.
   */
  readonly groups = computed<CardGroup[]>(() => {
    const active = this.activeType();
    if (!active && !this.search().trim()) return [];

    const matching = this.matchingCards();

    return this.cardTypes
      .filter(type => !active || type.key === active)
      .map(type => ({
        key: type.key,
        label: type.label,
        cards: matching.filter(card => card.entityType === type.key),
      }))
      .filter(group => group.cards.length > 0);
  });

  constructor() {
    // The drawer is a fresh panel each time it is opened, but the note it is linking can change
    // under a panel already standing: take its links over whenever it does.
    effect(() => {
      const target = this.target();
      if (!target || this.seededFor === target.itemId) return;
      this.seededFor = target.itemId;
      this.links.set([...target.linkedEntities]);
    });
  }

  ngOnInit(): void {
    // Nothing has to be read: the campaign's cards are the ones already in hand.
    const target = this.target();
    if (!target) return;
    this.seededFor = target.itemId;
    this.links.set([...target.linkedEntities]);
  }

  /** What the drawer says when it has nothing to draw. */
  readonly emptyMessage = computed(() => {
    const term = this.search().trim();
    if (term) return `No cards here match "${term}".`;
    if (this.activeType()) return 'This campaign holds no cards of that type.';
    return "Pick a card type to see this campaign's cards.";
  });

  /** How many of a type's cards the search lets through, for that type's own button. */
  countFor(type: CardType): number {
    return this.matchingCards().filter(card => card.entityType === type).length;
  }

  /** Picking a type narrows the cards to it; picking it again takes the narrowing back off. */
  toggleType(type: CardType): void {
    this.activeType.update(current => current === type ? null : type);
  }

  isPicked(card: AssocCard): boolean {
    return this.links().some(link => link.entityId === card.id && link.entityType === card.entityType);
  }

  /** Picking a card links it to the note; picking it again takes the link back off. */
  togglePick(card: AssocCard): void {
    const withoutThis = this.links().filter(link =>
      !(link.entityId === card.id && link.entityType === card.entityType));

    this.persist(this.isPicked(card) ? withoutThis : [...withoutThis, {
      entityType: card.entityType,
      entityId: card.id,
      entityName: card.name,
    }]);
  }

  /** The hashtag's own ✕: the card comes off the note. */
  unpick(link: QuicknoteLinkedEntity): void {
    this.persist(this.links().filter(current =>
      !(current.entityId === link.entityId && current.entityType === link.entityType)));
  }

  done(): void {
    this.closeDrawer.emit();
  }

  private asCard(entityType: CardType, id: string, card: CardShape): AssocCard {
    return { entityType, id, name: card.name, card };
  }

  /**
   * A pick, or a hashtag taken back off: the note wears it at once — the line behind the drawer
   * shows the hashtag straight away — and the queue is written with the note's whole line.
   */
  private persist(links: QuicknoteLinkedEntity[]): void {
    this.links.set(links);

    const target = this.target();
    if (!target) return;

    // A write already in the air: this list follows it, so the last thing picked is what stands.
    if (this.saving()) {
      this.pendingSave = links;
      return;
    }

    this.write(target, links);
  }

  private write(target: QuicknoteAssociationTarget, links: QuicknoteLinkedEntity[]): void {
    this.saving.set(true);
    this.error.set('');

    this.http.put<QuicknoteQueueItem>(
      `${environment.apiUrl}/api/campaigns/${target.campaignId}/quicknote-queue/${target.itemId}`,
      { content: target.content, linkedEntities: links, visibleToPlayers: target.visibleToPlayers }
    ).subscribe({
      next: saved => {
        this.saving.set(false);

        // The queue is the word on what the note wears now, but a write landing after a later pick
        // must not undo it: the pending list is the one that goes next.
        const pending = this.pendingSave;
        this.pendingSave = null;

        const settled = [...(saved.linkedEntities ?? links)];
        this.links.set(settled);

        // An answer that has dropped what was just written — a queue that would not take the link, a
        // server that answers without it, a column that is not there yet — would otherwise leave the
        // drawer looking as though the card had never been clicked at all. Say so, and say it where
        // the picks are read, so a pick that did not stick is never a silence.
        const dropped = links.filter(link => !settled.some(kept =>
          kept.entityType === link.entityType && kept.entityId === link.entityId));

        if (dropped.length) {
          this.error.set(`The note did not keep ${dropped.map(link => link.entityName).join(', ')}.`);
        }

        this.shellSvc.publishQuicknotesChanged(target.campaignId);

        if (pending) this.write(target, pending);
      },
      error: () => {
        this.saving.set(false);
        this.pendingSave = null;
        this.error.set('Could not link that card to the note.');

        // Show the note as the queue has it, rather than the pick that never landed.
        this.links.set([...(this.target()?.linkedEntities ?? [])]);
      },
    });
  }
}
