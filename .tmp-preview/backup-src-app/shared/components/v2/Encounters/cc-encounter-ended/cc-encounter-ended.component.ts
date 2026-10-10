import {
  Component, ChangeDetectionStrategy, ElementRef, Injector, OnDestroy,
  afterNextRender, computed, effect, inject, input, output, viewChild
} from '@angular/core';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { CampaignEncounter, EncounterCombatant } from '../../../../../core/encounter.service';
import {
  DistinctCastCard, castCardsOf, castSpotsOf, combatantAsCast, distinctCastCards
} from '../../../../../core/encounter-combatant.mapper';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcCastCardComponent } from '../../carddeck/cc-cast-card/cc-cast-card.component';

const CARD_GUTTER = 24;

/**
 * How long after the row is mounted its swiper is measured again. The row is
 * free-mode, so it reads its slides' widths when it starts; a beat later the host
 * has its final size and the one update settles them.
 */
const MEASURE_MS = 50;

/**
 * The wrap-up of a fight that has ended: the encounter's name, when it ended, and
 * one card per distinct cast card the fight held, with how many copies of it stood
 * in the fight and how many of them went down.
 *
 * The DM's builder ends a fight on this screen, and it is the same screen a player
 * gets when they open a finished fight from their own row of encounters — so a
 * fight reads the same to everyone once it is over. Nothing here is editable: the
 * screen is the record of the fight.
 */
@Component({
  selector: 'cc-encounter-ended',
  standalone: true,
  imports: [CcCastCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-encounter-ended.component.html',
  styleUrl: './cc-encounter-ended.component.scss'
})
export class CcEncounterEndedComponent implements OnDestroy {
  private shellSvc = inject(CampaignShellService);
  private injector = inject(Injector);

  readonly encounter = input.required<CampaignEncounter>();
  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  /** Raised by the back button, so each host returns to its own row of encounters. */
  readonly backRequested = output<void>();

  private readonly castSpots = computed(() => castSpotsOf(this.encounter().spots ?? []));

  /** The fight's cast cards, one per distinct card, in the encounter's own order. */
  readonly endedFoes = computed(() =>
    distinctCastCards(this.castSpots().flatMap(spot => castCardsOf(spot))));

  readonly endedFoeCount = computed(() =>
    this.endedFoes().reduce((total, card) => total + card.count, 0));

  readonly foesDown = computed(() =>
    this.endedFoes().reduce((total, card) => total + card.downCount, 0));

  readonly endedTitle = computed(() =>
    this.encounter().name || `Encounter ${this.encounter().sequenceNumber}`);

  readonly endedAtLabel = computed(() => {
    const endedAt = this.encounter().endedAt;
    if (!endedAt) return '';

    const ended = new Date(endedAt);
    return Number.isNaN(ended.getTime())
      ? ''
      : ended.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  });

  endedCountTitle(card: DistinctCastCard): string {
    const copies = card.count === 1 ? '1 copy of this card' : `${card.count} copies of this card`;
    if (!card.downCount) return `${copies} in this fight`;

    const down = card.downCount === card.count ? 'all of them down' : `${card.downCount} of them down`;
    return `${copies} in this fight, ${down}`;
  }

  asCast(combatant: EncounterCombatant): CampaignCastInstance {
    return combatantAsCast(combatant, this.campaignId(), this.shellSvc.campaign()?.casts ?? []);
  }

  private readonly foesRowRef = viewChild<ElementRef<HTMLElement>>('foesRow');
  private swiper: Swiper | null = null;
  private measureTimer: number | null = null;

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: CARD_GUTTER,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: false,
    watchSlidesProgress: true,
  };

  constructor() {
    effect(() => {
      const row = this.foesRowRef()?.nativeElement;

      this.endedFoes().length;

      afterNextRender(() => {
        if (!row) {
          this.destroySwiper();
          return;
        }

        this.mountSwiper(row);

        if (this.measureTimer !== null) window.clearTimeout(this.measureTimer);
        this.measureTimer = window.setTimeout(() => {
          this.measureTimer = null;
          this.swiper?.update();
        }, MEASURE_MS);
      }, { injector: this.injector });
    });
  }

  ngOnDestroy(): void {
    if (this.measureTimer !== null) {
      window.clearTimeout(this.measureTimer);
      this.measureTimer = null;
    }

    this.destroySwiper();
  }

  private mountSwiper(element: HTMLElement): void {
    if (this.swiper) {
      if (this.swiper.el === element) {
        this.swiper.update();
        return;
      }
      this.destroySwiper();
    }

    this.swiper = new Swiper(element, CcEncounterEndedComponent.SWIPER_OPTIONS);
  }

  private destroySwiper(): void {
    if (!this.swiper) return;

    this.swiper.destroy(true, true);
    this.swiper = null;
  }
}
