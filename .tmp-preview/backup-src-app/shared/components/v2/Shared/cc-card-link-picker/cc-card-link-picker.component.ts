import { Component, ElementRef, Injector, OnInit, OnDestroy, ViewChild, afterNextRender, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CardLink, CardLinkTarget } from '../../../../models/card-link.model';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcSimpleCastCardComponent } from '../../carddeck/cc-simple-cast-card/cc-simple-cast-card.component';
import { CcSimpleFactionCardComponent } from '../../carddeck/cc-simple-faction-card/cc-simple-faction-card.component';

type CardType = 'location' | 'sublocation' | 'cast' | 'faction';

interface CardShape {
  name: string;
  isVisibleToPlayers?: boolean;
}

interface PickerCard {
  entityType: CardType;
  id: string;
  name: string;
  card: CardShape;
}

interface CardGroup {
  key: CardType;
  label: string;
  cards: PickerCard[];
}

@Component({
  selector: 'cc-card-link-picker',
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
  templateUrl: './cc-card-link-picker.component.html',
  styleUrl: './cc-card-link-picker.component.scss'
})
export class CcCardLinkPickerComponent implements OnInit, OnDestroy {
  private shellSvc = inject(CampaignShellService);
  private injector = inject(Injector);

  @ViewChild('pickedRow', { static: false }) pickedRowRef?: ElementRef<HTMLElement>;
  private pickedSwiper: Swiper | null = null;

  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();

  readonly target = computed<CardLinkTarget | null>(() => this.shellSvc.cardLinkTarget());

  readonly cardTypes: { key: CardType; label: string }[] = [
    { key: 'location', label: 'Locations' },
    { key: 'sublocation', label: 'Sublocations' },
    { key: 'cast', label: 'Cast' },
    { key: 'faction', label: 'Factions' },
  ];

  search = signal('');
  activeType = signal<CardType | null>(null);

  links = signal<CardLink[]>([]);

  saving = signal(false);
  error = signal('');

  private pendingSave: CardLink[] | null = null;

  private seededFor = '';

  private readonly allCampaignCards = computed<PickerCard[]>(() => {
    const campaign = this.shellSvc.campaign();
    if (!campaign) return [];

    return [
      ...(campaign.locations ?? []).map(card => this.asCard('location', card.instanceId, card)),
      ...(campaign.sublocations ?? []).map(card => this.asCard('sublocation', card.instanceId, card)),
      ...(campaign.casts ?? []).map(card => this.asCard('cast', card.instanceId, card)),
      ...(campaign.factions ?? []).map(card => this.asCard('faction', card.factionInstanceId, card)),
    ];
  });

  private readonly campaignCards = computed<PickerCard[]>(() => {
    const isDm = this.shellSvc.isDm();
    const offeredToViewer = (card: { isVisibleToPlayers?: boolean }) => isDm || !!card.isVisibleToPlayers;
    return this.allCampaignCards().filter(card => offeredToViewer(card.card));
  });

  readonly pickedCards = computed<PickerCard[]>(() => {
    const byKey = new Map<string, PickerCard>();
    for (const card of this.allCampaignCards()) {
      byKey.set(`${card.entityType}:${card.id}`, card);
    }
    return this.links()
      .map(link => byKey.get(`${link.entityType}:${link.entityId}`))
      .filter((card): card is PickerCard => !!card);
  });

  private readonly matchingCards = computed<PickerCard[]>(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.campaignCards();

    return this.campaignCards().filter(card =>
      card.name.toLowerCase().includes(term) || card.entityType.includes(term));
  });

  private readonly selectableCards = computed<PickerCard[]>(() => {
    const picked = new Set(this.links().map(link => `${link.entityType}:${link.entityId}`));
    return this.matchingCards().filter(card => !picked.has(`${card.entityType}:${card.id}`));
  });

  readonly groups = computed<CardGroup[]>(() => {
    const active = this.activeType();
    if (!active && !this.search().trim()) return [];

    const matching = this.selectableCards();

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
    effect(() => {
      const target = this.target();
      if (!target || this.seededFor === target.subjectId) return;
      this.seededFor = target.subjectId;
      this.links.set([...target.linkedCards]);
    });

    effect(() => {
      const count = this.pickedCards().length;
      if (count === 0) {
        this.destroyPickedSwiper();
        return;
      }
      if (this.pickedSwiper && this.pickedSwiper.slides.length === count) {
        this.pickedSwiper.update();
        return;
      }
      afterNextRender(() => this.initPickedSwiper(), { injector: this.injector });
    });
  }

  ngOnInit(): void {
    const target = this.target();
    if (!target) return;
    this.seededFor = target.subjectId;
    this.links.set([...target.linkedCards]);
  }

  readonly emptyMessage = computed(() => {
    const term = this.search().trim();
    if (term) return `No cards here match "${term}".`;
    if (this.activeType()) return 'This campaign holds no cards of that type.';
    return "Pick a card type to see this campaign's cards.";
  });

  countFor(type: CardType): number {
    return this.selectableCards().filter(card => card.entityType === type).length;
  }

  toggleType(type: CardType): void {
    this.activeType.update(current => current === type ? null : type);
  }

  isPicked(card: PickerCard): boolean {
    return this.links().some(link => link.entityId === card.id && link.entityType === card.entityType);
  }

  togglePick(card: PickerCard): void {
    const withoutThis = this.links().filter(link =>
      !(link.entityId === card.id && link.entityType === card.entityType));

    this.persist(this.isPicked(card) ? withoutThis : [...withoutThis, {
      entityType: card.entityType,
      entityId: card.id,
      entityName: card.name,
    }]);
  }

  removePicked(card: PickerCard): void {
    this.persist(this.links().filter(current =>
      !(current.entityId === card.id && current.entityType === card.entityType)));
  }

  done(): void {
    this.closeDrawer.emit();
  }

  ngOnDestroy(): void {
    this.destroyPickedSwiper();
  }

  private static readonly PICKED_ROW_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 10,
    freeMode: {
      enabled: true,
      momentum: true,
      momentumRatio: 1,
      momentumBounceRatio: 1,
      sticky: false,
    },
    mousewheel: {
      enabled: true,
      forceToAxis: true,
      sensitivity: 1,
      releaseOnEdges: false,
    },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  private initPickedSwiper(): void {
    if (!this.pickedRowRef?.nativeElement) return;
    this.destroyPickedSwiper();
    this.pickedSwiper = new Swiper(this.pickedRowRef.nativeElement, CcCardLinkPickerComponent.PICKED_ROW_OPTIONS);
  }

  private destroyPickedSwiper(): void {
    if (this.pickedSwiper) {
      this.pickedSwiper.destroy(true, true);
      this.pickedSwiper = null;
    }
  }

  private asCard(entityType: CardType, id: string, card: CardShape): PickerCard {
    return { entityType, id, name: card.name, card };
  }

  private persist(links: CardLink[]): void {
    this.links.set(links);

    const target = this.target();
    if (!target) return;

    if (this.saving()) {
      this.pendingSave = links;
      return;
    }

    this.write(target, links);
  }

  private write(target: CardLinkTarget, links: CardLink[]): void {
    this.saving.set(true);
    this.error.set('');

    target.save(links, { campaignId: target.campaignId, subjectId: target.subjectId }).subscribe({
      next: saved => {
        this.saving.set(false);

        const pending = this.pendingSave;
        this.pendingSave = null;

        const settled = [...(saved ?? links)];
        this.links.set(settled);

        const dropped = links.filter(link => !settled.some(kept =>
          kept.entityType === link.entityType && kept.entityId === link.entityId));

        if (dropped.length) {
          this.error.set(`These cards were not kept: ${dropped.map(link => link.entityName).join(', ')}.`);
        }

        this.shellSvc.publishCardLinksChanged({
          subjectId: target.subjectId,
          linkedCards: settled,
        });

        if (pending) this.write(target, pending);
      },
      error: () => {
        this.saving.set(false);
        this.pendingSave = null;
        this.error.set('Could not link that card.');

        this.links.set([...(this.target()?.linkedCards ?? [])]);
      },
    });
  }
}

