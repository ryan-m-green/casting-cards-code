import { Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { ConditionSubject } from '../../../../../core/card-condition.service';
import {
  EncounterCombatant, EncounterService, UpdateEncounterCombatantRequest
} from '../../../../../core/encounter.service';
import { combatantAsCast } from '../../../../../core/encounter-combatant.mapper';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CardCondition } from '../../../../models/condition.model';
import { PlayerCardWithDetails } from '../../../../models/player-card.model';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';
import { CcPlayerCardComponent } from '../../carddeck/cc-player-card/cc-player-card.component';
import { CcDialCounterComponent } from '../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CcRingConditionComponent } from '../cc-ring-condition/cc-ring-condition.component';
import { CcConditionAssignerComponent } from '../cc-condition-assigner/cc-condition-assigner.component';

/** How long a dial has to be still before its value is written to the encounter. */
const WRITE_SETTLE_MS = 400;

/** Hit points run to three dials, so the top of the scale is 999. */
const HP_DIALS = 3;

/** Temporary hit points run to three dials, like the hit points they sit beside. */
const TEMP_DIALS = 3;

/** The two things a cast card's panel offers under the card's face. */
type CastDetailsTab = 'hp' | 'conditions';

/**
 * cc-combatant-details
 *
 * The right drawer's panels for one place on the initiative ring: a click on a card
 * opens it. A place can hold several cards, so the panels are a carousel — the
 * arrows either side walk the place's cards — and each card gets its own panel.
 *
 * A cast card shows its face with its conditions clipped onto it, and a tabset under
 * it for the two things the DM reaches for during the fight: its hit points (the dial
 * is what the fight has left, the label above it is the card's maximum, and the
 * counter beside it is its temporary hit points) and the conditions to give it
 * (`cc-condition-assigner`). The two dials hold each other in step with the fight: while
 * the card is carrying temporary hit points the fight is taking those off first, so the
 * hit points dial is held where it stands until the temporary one is back at zero; and a
 * card at zero hit points has nothing left for a shield to guard, so the temporary dial
 * waits until there are hit points again. A player's card shows the DM's view of the party
 * member, with the same rings on it and the same assigner under it.
 *
 * Hit points are written as they are dialled — one patch per card once the dials
 * have been still for a beat — and the ring reloads with them, so the cards there
 * and the panels here never disagree. The conditions a card carries come from
 * wherever they live (a cast card's from the encounter's own row for it, a party
 * member's from their card) and are kept here as the DM gives and clears them. A
 * card dialled down to its last hit point is marked defeated on its row, which is
 * what puts the bloodied cross on its face (see `cc-cast-card`).
 */
@Component({
  selector: 'cc-combatant-details',
  standalone: true,
  imports: [
    CommonModule, FormsModule, CcCastCardComponent, CcPlayerCardComponent,
    CcDialCounterComponent, CcRingConditionComponent, CcConditionAssignerComponent
  ],
  templateUrl: './cc-combatant-details.component.html',
  styleUrl: './cc-combatant-details.component.scss'
})
export class CcCombatantDetailsComponent implements OnDestroy {
  private http = inject(HttpClient);
  private encounterApi = inject(EncounterService);
  private shellSvc = inject(V2CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly encounterId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');
  /** The place's name on the ring (the drawer's own title is set by the shell). */
  readonly spotName = input<string>('');
  /** The place's cards, in ring order. */
  readonly combatants = input.required<EncounterCombatant[]>();
  /** The card of the place the panels open on. */
  readonly index = input<number>(0);

  /** Hit points dials: three places (hundreds / tens / ones). */
  readonly hpDials = HP_DIALS;

  /** Temporary hit points dials: three places, like the hit points beside them. */
  readonly tempDials = TEMP_DIALS;

  /** Which panel is up: the arrows walk this. */
  readonly panelIndex = signal(0);

  /** Which tab of a cast card's panel is up: its numbers, or its conditions. */
  readonly tab = signal<CastDetailsTab>('hp');

  /**
   * The cards as the panels draw them: seeded from the input each time the drawer
   * opens (a fresh click), then kept in step locally as the DM dials, so the numbers
   * on screen never wait for the ring's reload to catch up.
   */
  private readonly cards = signal<EncounterCombatant[]>([]);

  readonly current = computed(() => this.cards()[this.panelIndex()] ?? this.cards()[0]);

  /** How many panels the carousel holds. */
  readonly panelCount = computed(() => this.cards().length);

  /** Arrows only make sense for a place holding more than one card. */
  readonly hasArrows = computed(() => this.cards().length > 1);

  /** A party member's place in the fight. */
  readonly isPlayer = computed(() => this.current()?.combatantType === 'player');

  /** Current hit points: the encounter keeps what has been lost, not what is left. */
  readonly currentHp = computed(() => {
    const card = this.current();
    return card ? Math.max(0, card.maxHitPoints - card.lostHitPoints) : 0;
  });

  /**
   * Whether the card on screen is carrying temporary hit points: the fight takes those off before the
   * card's own, so its hit points dial is not the number in play while there are any, and the panel
   * holds it where it stands (see the template). The temporary dial beside it is the one to turn
   * meanwhile — what the fight deals comes off there first — and back at zero there is nothing left
   * in front of the card's own hit points, so the hit points dial is live again.
   */
  readonly hpDialHeld = computed(() => (this.current()?.tempHitPoints ?? 0) > 0);

  /**
   * Whether the card on screen is at zero hit points. A shield has nothing to stand in front of
   * there — the fight has already taken the card down — so its temporary dial waits (see the
   * template) until the card has hit points for it to guard again.
   *
   * A card that is somehow carrying temporary hit points *and* at zero keeps that dial: it is the
   * only one of the two left live, and the shield has to be clearable. (It takes a write from
   * outside this panel to get there — the hit points dial is held while the shield is up.)
   */
  readonly tempDialHeld = computed(() => this.currentHp() === 0 && !this.hpDialHeld());

  /**
   * The card on screen is out of the fight: the encounter says its row was defeated,
   * or the dial is sitting on the card's last hit point and the write recording it is
   * still queued behind the dials. The card paints its bloodied cross for it.
   */
  readonly isDefeated = computed(() => {
    const card = this.current();
    if (!card) return false;

    return card.isDefeated || (card.maxHitPoints > 0 && this.currentHp() === 0);
  });

  readonly error = signal('');

  /** Writes queued per combatant, so a spun dial sends one patch when it settles. */
  private readonly pending = new Map<string, UpdateEncounterCombatantRequest>();
  private flushTimer = 0;

  /** The party's cards, for a player's place: their conditions ride along with them. */
  private readonly playerCards = signal<PlayerCardWithDetails[]>([]);
  private loadingPlayerCards = false;

  readonly playerMember = computed(() => {
    const cardId = this.current()?.playerCardId;
    return cardId ? this.playerCards().find(card => card.id === cardId) ?? null : null;
  });

  /**
   * What each card of the place carries, by the card's own row. A cast card's
   * conditions are read from the encounter when its panel comes up (the encounter
   * keeps its own row per card); a party member's come with their player card.
   * Giving and clearing a condition keeps the new list here, so the panel draws it
   * without waiting for a read.
   */
  private readonly conditionsByCard = signal<Map<string, CardCondition[]>>(new Map());

  /** The conditions the card on screen carries: what its rings draw and its assigner offers. */
  readonly currentConditions = computed<CardCondition[]>(() => {
    const card = this.current();
    if (!card) return [];

    const read = this.conditionsByCard().get(card.id);
    if (read) return read;

    return this.isPlayer() ? this.playerMember()?.conditions ?? [] : [];
  });

  /** Where the party member's conditions live: on their own card. */
  readonly playerSubject = computed<ConditionSubject | null>(() => {
    const memberId = this.playerMember()?.id;
    return memberId ? { kind: 'player', playerCardId: memberId } : null;
  });

  /** Where a cast card's conditions live: the encounter's own row for that card. */
  readonly castSubject = computed<ConditionSubject>(() => ({
    kind: 'combatant',
    encounterId: this.encounterId(),
    combatantId: this.current()?.id ?? '',
  }));

  constructor() {
    // A click on the ring hands the drawer a fresh place: the panels start on the
    // card that was pressed.
    effect(() => this.cards.set(this.combatants()));
    effect(() => this.panelIndex.set(this.index()));
    effect(() => { if (this.isPlayer()) this.loadPlayerCards(); });
    // A cast card's conditions come with its row, so they are read when its panel
    // comes up — once per card, leaving what the DM then gives and clears in place.
    effect(() => {
      const card = this.current();
      if (!card || this.isPlayer() || this.conditionsByCard().has(card.id)) return;
      this.loadCastConditions(card.id);
    });
  }

  ngOnDestroy(): void {
    // Whatever the dials were left on goes out, even as the drawer closes.
    window.clearTimeout(this.flushTimer);
    this.flush();
  }

  /** Walks the place's cards: the arrows either side of the panel. */
  step(direction: -1 | 1): void {
    const next = this.panelIndex() + direction;
    if (next < 0 || next >= this.cards().length) return;

    // The card being left behind keeps whatever was dialled on it.
    this.flush();
    this.panelIndex.set(next);
  }

  /** A combatant as the full cast card wants it (the campaign instance names the face). */
  asCast(card: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(card, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

  /**
   * The DM dialled the card's current hit points: what is lost is what the fight
   * keeps. The bottom of the dial is also the card going down, and any hit point back
   * brings it round again — the encounter keeps that on the card's row, which is what
   * the party's trophies are told from — so the flag only goes out when it changes.
   *
   * A card that goes down sheds what it was carrying: the conditions come off the card
   * here as the dial lands on zero, and the encounter clears the same ones off its row
   * as the write records the fall.
   */
  setCurrentHp(current: number): void {
    const card = this.current();
    if (!card) return;

    const lost = Math.max(0, card.maxHitPoints - current);
    const defeated = card.maxHitPoints > 0 && lost >= card.maxHitPoints;

    if (defeated && !card.isDefeated) {
      this.conditionsByCard.update(read => new Map(read).set(card.id, []));
    }

    this.queue(defeated === card.isDefeated
      ? { lostHitPoints: lost }
      : { lostHitPoints: lost, isDefeated: defeated });
  }

  /** The DM dialled the card's temporary hit points. */
  setTempHp(temp: number): void {
    this.queue({ tempHitPoints: Math.max(0, temp) });
  }

  /** Walks a cast card's panel between the card's numbers and its conditions. */
  setTab(tab: CastDetailsTab): void {
    this.tab.set(tab);
  }

  /** The DM gave or cleared a condition: the card on screen keeps the new list. */
  onConditionsChanged(conditions: CardCondition[]): void {
    const card = this.current();
    if (!card) return;

    this.conditionsByCard.update(read => new Map(read).set(card.id, conditions));
  }

  /** Queues a write for the card on screen: the patch goes out once the dials are still. */
  private queue(patch: UpdateEncounterCombatantRequest): void {
    const card = this.current();
    if (!card) return;

    this.pending.set(card.id, { ...this.pending.get(card.id), ...patch });
    window.clearTimeout(this.flushTimer);
    this.flushTimer = window.setTimeout(() => this.flush(), WRITE_SETTLE_MS);
  }

  /** Writes everything queued, then has the ring reload with the new numbers. */
  private flush(): void {
    const writes = [...this.pending.entries()];
    this.pending.clear();
    if (!writes.length) return;

    forkJoin(writes.map(([combatantId, patch]) =>
      this.encounterApi.updateCombatant(this.campaignId(), this.encounterId(), combatantId, patch)
    )).subscribe({
      next: rows => {
        const written = new Map(rows.map(row => [row.id, row]));
        this.cards.update(list => list.map(card => written.get(card.id) ?? card));
        this.shellSvc.publishEncounterChanged(this.encounterId());
      },
      error: () => this.error.set('Could not save the hit points.'),
    });
  }

  /**
   * Reads what a cast card is carrying: the conditions the second tab of its panel
   * draws and edits. They hang off the encounter's own row for the card, so this is
   * that one card's read (see EncounterService.getCombatantConditions).
   */
  private loadCastConditions(combatantId: string): void {
    this.encounterApi.getCombatantConditions(this.campaignId(), this.encounterId(), combatantId).subscribe({
      next: conditions => this.conditionsByCard.update(read => new Map(read).set(combatantId, conditions)),
      error: () => this.error.set('Could not load the conditions.'),
    });
  }

  /** The party's cards, for the member this place holds. */
  private loadPlayerCards(): void {
    if (this.playerCards().length || this.loadingPlayerCards) return;
    this.loadingPlayerCards = true;

    this.http.get<PlayerCardWithDetails[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards`)
      .subscribe({
        next: cards => {
          this.loadingPlayerCards = false;
          this.playerCards.set(cards);
        },
        error: () => {
          this.loadingPlayerCards = false;
          this.error.set('Could not load the player card.');
        },
      });
  }
}
