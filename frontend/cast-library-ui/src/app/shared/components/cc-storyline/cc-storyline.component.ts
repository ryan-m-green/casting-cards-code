import { Component, effect, inject, input, output, signal, computed, OnDestroy, ElementRef, ViewChild, Injector, afterNextRender, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../environments/environment';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { CcViewBtnComponent } from '../cc-view-btn/cc-view-btn.component';

export interface StorylineListItem {
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
  imports: [CcViewBtnComponent],
  templateUrl: './cc-storyline.component.html',
  styleUrl: './cc-storyline.component.scss',
})
export class CcStorylineComponent implements OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private injector = inject(Injector);
  private hubSubscriptions: Subscription[] = [];

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
  pendingDeleteId = signal<string | null>(null);
  openMenuId = signal<string | null>(null);
  workingId = signal<string | null>(null);
  errorMessage = signal('');

  readyCount = computed(() => this.items().length);

  private loadedOnce = false;

  constructor() {
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
    this.storylineSwiperEffect.destroy();
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

  private storylineSwiperEffect = effect(() => {
    const count = this.items().length;

    if (count === 0) {
      if (this.swiper) {
        this.swiper.destroy(true, true);
        this.swiper = null;
      }
      return;
    }

    if (this.swiper && this.swiper.slides.length === count) {
      this.swiper.update();
      return;
    }

    afterNextRender(() => this.initSwiper(), { injector: this.injector });
  });

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
        },
        error: () => {
          this.loading.set(false);
          this.errorMessage.set('Failed to load storyline items.');
        },
      });
  }

  requestDelete(item: StorylineListItem) {
    this.openMenuId.set(null);
    this.pendingDeleteId.set(item.id);
  }

  cancelDelete() {
    this.pendingDeleteId.set(null);
  }

  confirmDelete(item: StorylineListItem) {
    if (this.workingId()) return;
    this.workingId.set(item.id);
    this.pendingDeleteId.set(null);
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
