import { Component, ChangeDetectionStrategy, effect, inject, input, output, signal, computed, OnInit, OnDestroy, ElementRef, ViewChild, Injector, afterNextRender, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { buildStorylineChronicleRequest } from '../../../../../core/storyline-chronicle.mapper';
import { CcViewBtnComponent } from '../../Shared/cc-view-btn/cc-view-btn.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CcCardLinkerComponent } from '../../Shared/cc-card-linker/cc-card-linker.component';
import { CardLink, CardLinkSubject, CardLinkWriter } from '../../../../models/card-link.model';

type StorylineLinkedEntity = CardLink & {
  todPositionPercent?: number | null;
  originalEntityType?: string;
  visibleToPlayers?: boolean;
  cardMovement?: Record<string, unknown>;
};

interface StorylineListItem {
  id: string;
  title: string;
  body: string;
  sceneType: string;
  imageUrl?: string;
  markedForArchive: boolean;
  linkedEntities: StorylineLinkedEntity[];
  visibleToPlayers: boolean;
  soundtrackIds: string[];
}

@Component({
  selector: 'app-cc-storyline',
  standalone: true,
  imports: [CcViewBtnComponent, CcDeleteButtonComponent, CcEditButtonComponent, CcCardLinkerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-storyline.component.html',
  styleUrl: './cc-storyline.component.scss',
})
export class CcStorylineComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private injector = inject(Injector);
  private gridLoad = inject(CampaignGridLoadService);
  private hubSubscriptions: Subscription[] = [];

  private readonly mark = publishGridAreaMark('bottom-middle', 'content', {
    title: () => ['Storyline'],
    icon: { path: '/storyline.svg', width: 32, height: 32 },
  });

  @ViewChild('storylineSwiper', { static: false }) storylineSwiperRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  campaignId = input.required<string>();
  portalColor = input<string>('#6e28d0');
  refreshTick = input<number>(0);

  requestCreate = output<void>();

  requestEdit = output<StorylineListItem>();

  requestView = output<StorylineListItem>();

  items = signal<StorylineListItem[]>([]);
  loading = signal(true);
  openMenuId = signal<string | null>(null);
  workingId = signal<string | null>(null);
  errorMessage = signal('');

  readyCount = computed(() => this.items().length);

  readonly saveLinkedCards: CardLinkWriter = (cards, subject) => {
    const item = this.items().find(current => current.id === subject.subjectId);
    if (!item) return throwError(() => new Error('That storyline item is no longer here.'));

    const linkedEntities = cards as StorylineLinkedEntity[];
    const castTravel = linkedEntities.find(link => link.entityType === 'cast-traveled');

    return this.http.patch<void>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/events/${item.id}/details`,
      {
        title: item.title,
        body: item.body,
        sceneType: item.sceneType,
        linkedEntities,
        todPositionPercent: null,
        visibleToPlayers: castTravel?.visibleToPlayers ?? item.visibleToPlayers,
        soundtrackIds: item.soundtrackIds,
      }
    ).pipe(map(() => linkedEntities));
  };

  private loadedOnce = false;

  constructor() {
    effect(() => {
      const count = this.items().length + 1;

      if (this.swiper && this.swiper.slides.length === count) {
        this.swiper.update();
        return;
      }

      afterNextRender(() => this.initSwiper(), { injector: this.injector });
    });

    effect(() => {
      const id = this.campaignId();
      const tick = this.refreshTick();
      if (id && (tick > 0 || !this.loadedOnce)) {
        this.loadedOnce = true;
        this.loadItems(id);
      }
    });
  }

  ngOnInit(): void {
    this.hubSubscriptions.push(
      this.hub.on('StorylineEventUpdated', 'cc-storyline', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.loadItems(this.campaignId(), true);
      })
    );
  }

  ngOnDestroy() {
    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
    }
  }

  private initSwiper() {
    if (!this.storylineSwiperRef?.nativeElement) return;

    if (this.swiper) {
      this.swiper.destroy(true, true);
      this.swiper = null;
    }

    this.swiper = new Swiper(this.storylineSwiperRef.nativeElement, {
      modules: [FreeMode, Mousewheel],
      slidesPerView: 'auto',
      spaceBetween: 14,
      // The row is held still: the first scene sits in the middle of the room with
      // the rest trailing off to its right, as the deck's and the fights' rows do.
      centeredSlides: true,
      observeParents: true,
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
    });
  }

  loadItems(campaignId: string, silent = false) {
    if (!silent) this.loading.set(true);
    this.errorMessage.set('');
    this.http.get<StorylineListItem[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/events`)
      .subscribe({
        next: (all) => {
          const ready = (all ?? []).filter(ev =>
            !ev.markedForArchive &&
            (ev.sceneType === 'campaign-event' || ev.sceneType === 'campaign-handout')
          );
          this.items.set(ready.map(item => this.asListItem(item)));
          this.loading.set(false);
          this.gridLoad.report('bottom-middle', 'content');
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load storyline items.');
          this.gridLoad.report('bottom-middle', 'content');
        },
      });
  }

  confirmDelete(item: StorylineListItem) {
    if (this.workingId()) return;
    this.workingId.set(item.id);
    this.errorMessage.set('');

    this.http.delete(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/events/${item.id}`)
      .subscribe({
        next: () => {
          this.items.update(list => list.filter(i => i.id !== item.id));
          this.workingId.set(null);
        },
        error: () => {
          this.workingId.set(null);
          this.errorMessage.set('Failed to delete item.');
        },
      });
  }

  openMenu(item: StorylineListItem) {
    this.openMenuId.set(this.openMenuId() === item.id ? null : item.id);
  }

  closeMenu() {
    this.openMenuId.set(null);
  }

  sendToChronicle(item: StorylineListItem, isGmOnly: boolean) {
    if (this.workingId()) return;
    this.workingId.set(item.id);
    this.openMenuId.set(null);
    this.errorMessage.set('');

    const body = buildStorylineChronicleRequest(item, isGmOnly);

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/chronicles`,
      body
    ).subscribe({
      next: () => {
        this.workingId.set(null);
        this.loadItems(this.campaignId());
      },
      error: () => {
        this.workingId.set(null);
        this.errorMessage.set('Failed to send item to the chronicles.');
      },
    });
  }

  onLinkedCardsChange(itemId: string, cards: CardLink[]): void {
    this.items.update(list => list.map(current =>
      current.id === itemId ? { ...current, linkedEntities: cards as StorylineLinkedEntity[] } : current));
  }

  private asListItem(item: StorylineListItem): StorylineListItem {
    return {
      ...item,
      body: item.body ?? '',
      linkedEntities: item.linkedEntities ?? [],
      visibleToPlayers: item.visibleToPlayers ?? false,
      soundtrackIds: item.soundtrackIds ?? [],
    };
  }
}
