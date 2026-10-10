import { Component, ChangeDetectionStrategy, effect, inject, input, output, signal, computed, OnDestroy, ElementRef, ViewChild, Injector, afterNextRender, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { CcViewBtnComponent } from '../../Shared/cc-view-btn/cc-view-btn.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';

interface StorylineListItem {
  id: string;
  title: string;
  body: string;
  sceneType: string; // 'campaign-event' | 'campaign-handout'
  imageUrl?: string;
  markedForArchive: boolean;
}

@Component({
  selector: 'app-cc-storyline',
  standalone: true,
  imports: [CcViewBtnComponent, CcDeleteButtonComponent, CcEditButtonComponent],
  /** OnPush: the panel is redrawn when its own signals move, not when a ticket is rung for the page. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-storyline.component.html',
  styleUrl: './cc-storyline.component.scss',
})
export class CcStorylineComponent implements OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private injector = inject(Injector);
  private gridLoad = inject(V2GridLoadService);
  private hubSubscriptions: Subscription[] = [];

  /**
   * What the bottom-middle area is known by — the heading over the storyline, and the mark it wears
   * on the radial navigator — published for as long as this panel stands in the area. The panel is
   * the DM's own: a player is handed the area's placeholder instead, which publishes a mark with no
   * icon on it, so for them the heading and the button both come up bare — there is nothing standing
   * behind them to be named or pointed at (see V2GridAreaMarkService).
   */
  private readonly mark = publishGridAreaMark('bottom-middle', 'content', {
    title: () => ['Storyline'],
    icon: { path: '/storyline.svg', width: 32, height: 32 },
  });

  @ViewChild('storylineSwiper', { static: false }) storylineSwiperRef!: ElementRef<HTMLElement>;

  private swiper: Swiper | null = null;

  campaignId = input.required<string>();
  portalColor = input<string>('#6e28d0');
  refreshTick = input<number>(0);

  /** Asks the host to open the right drawer with the cc-storyline-content create form. */
  requestCreate = output<void>();

  /** Asks the host to open the right drawer with the edit form for the item. */
  requestEdit = output<StorylineListItem>();

  /** Asks the host to open the right drawer showing the item read-only. */
  requestView = output<StorylineListItem>();

  items = signal<StorylineListItem[]>([]);
  loading = signal(true);
  openMenuId = signal<string | null>(null);
  workingId = signal<string | null>(null);
  errorMessage = signal('');

  readyCount = computed(() => this.items().length);

  private loadedOnce = false;

  constructor() {
    effect(() => {
      // The row always holds one slide more than the scenes in it: the tile that adds content stands
      // at its end (see the row's markup), so its own slide count is the scenes plus that tile.
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

    // Saves made elsewhere (e.g. the edit drawer) broadcast this hub event - reload the list.
    this.hubSubscriptions.push(
      this.hub.storylineEventUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.loadItems(this.campaignId());
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

  /**
   * Swallow horizontal wheel/trackpad gestures so the browser does not treat them as
   * back/forward history navigation (which shows the left-edge arrow and reloads the page).
   */
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

  loadItems(campaignId: string) {
    this.loading.set(true);
    this.errorMessage.set('');
    this.http.get<StorylineListItem[]>(`${environment.apiUrl}/api/campaigns/${campaignId}/events`)
      .subscribe({
        next: (all) => {
          // Not-yet-chronicled storyline scenes/handouts only.
          const ready = (all ?? []).filter(ev =>
            !ev.markedForArchive &&
            (ev.sceneType === 'campaign-event' || ev.sceneType === 'campaign-handout')
          );
          this.items.set(ready);
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

    const contentType = item.sceneType === 'campaign-handout' ? 'handout' : 'scene';
    const body = { contentType, sourceId: item.id, isGmOnly };

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
}
