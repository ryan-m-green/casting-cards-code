import {
  Component, ChangeDetectionStrategy, ElementRef, Injector, OnDestroy, OnInit,
  afterNextRender, computed, effect, inject, input, signal, viewChild
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { InventoryItem } from '../../../../models/inventory-item.model';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { CcViewBtnComponent } from '../../Shared/cc-view-btn/cc-view-btn.component';
import { CcCoinStripComponent } from '../../Shared/cc-coin-strip/cc-coin-strip.component';
import { CcRolodexFrameComponent } from '../../Shared/cc-rolodex-frame/cc-rolodex-frame.component';

@Component({
  selector: 'cc-player-inventory',
  standalone: true,
  imports: [CcViewBtnComponent, CcCoinStripComponent, CcRolodexFrameComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-player-inventory.component.html',
  styleUrl: './cc-player-inventory.component.scss'
})
export class CcPlayerInventoryComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private shellSvc = inject(CampaignShellService);
  private gridLoad = inject(CampaignGridLoadService);
  private injector = inject(Injector);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  private readonly mark = publishGridAreaMark('bottom-right', 'content', {
    title: () => ['My Inventory'],
    icon: { path: '/treasure_chest_gold_coins.svg', width: 32, height: 30 },
  });

  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly usingId = signal('');

  readonly purse = signal<{ currency: string; amount: number }[]>([]);

  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.count, 0));

  private readonly rowRef = viewChild<ElementRef<HTMLElement>>('inventoryRow');
  private readonly swipers = new Map<string, Swiper>();
  private readonly subs = new Subscription();

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 14,
    freeMode: { enabled: true, momentum: true, momentumRatio: 1, momentumBounceRatio: 1, sticky: false },
    mousewheel: { enabled: true, forceToAxis: true, sensitivity: 1, releaseOnEdges: false },
    grabCursor: true,
    resistance: true,
    resistanceRatio: 0.85,
    speed: 300,
    observer: true,
    watchOverflow: true,
    watchSlidesProgress: true,
  };

  private static readonly CENTRED_SWIPER_OPTIONS = {
    ...CcPlayerInventoryComponent.SWIPER_OPTIONS,
    centeredSlides: true,
    observeParents: true,
  };

  constructor() {
    effect(() => {
      const row = this.rowRef()?.nativeElement;

      this.items().length;

      afterNextRender(() => {
        if (row) this.mountSwiper('items', row);
        else this.destroySwiper('items');
      }, { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.reload();
    this.loadPurse();

    this.subs.add(this.hub.on('InventoryItemUsed', 'cc-player-inventory', event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      this.reload();
    }));

    this.subs.add(this.hub.on('InventoryItemPurchased', 'cc-player-inventory', event => {
      if (!event || event.campaignId !== this.campaignId()) return;
      if (event.currencyBalances?.length) this.purse.set(event.currencyBalances);
      this.reload();
    }));

    this.subs.add(this.hub.on('GoldAwarded', 'cc-player-inventory', events => {
      if (!events?.some(event => event.campaignId === this.campaignId())) return;
      this.loadPurse();
    }));

    this.subs.add(this.shellSvc.inventoryChanged.subscribe(() => this.reload()));
  }

  ngOnDestroy(): void {
    this.destroySwipers();
    this.subs.unsubscribe();
  }

  reload(): void {
    if (!this.campaignId()) return;

    this.loading.set(true);
    this.error.set('');

    this.http.get<InventoryItem[]>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/inventory/mine`
    ).subscribe({
      next: items => {
        this.items.set(items ?? []);
        this.loading.set(false);
        this.gridLoad.report('bottom-right', 'content');
      },
      error: () => {
        this.error.set('Could not load your bag.');
        this.loading.set(false);
        this.gridLoad.report('bottom-right', 'content');
      },
    });
  }

  loadPurse(): void {
    if (!this.campaignId()) return;

    this.http.get<{ currencyBalances?: { currency: string; amount: number }[] }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/mine`
    ).subscribe({
      next: card => this.purse.set(card?.currencyBalances ?? []),
      error: () => this.purse.set([]),
    });
  }

  openItem(item: InventoryItem): void {
    this.shellSvc.openPlayerInventoryDrawer(this.campaignId(), this.portalColor(), item);
  }

  useItem(item: InventoryItem): void {
    if (this.usingId()) return;

    this.usingId.set(item.id);

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/inventory/use`,
      { InventoryItemId: item.id }
    ).subscribe({
      next: () => {
        this.usingId.set('');
        this.shellSvc.publishInventoryChanged();
        this.reload();
      },
      error: () => {
        this.usingId.set('');
        this.error.set('Could not use that item.');
      },
    });
  }

  private mountSwiper(key: string, element: HTMLElement): void {
    const existing = this.swipers.get(key);
    if (existing) {
      if (existing.el === element) {
        existing.update();
        return;
      }
      this.destroySwiper(key);
    }

    this.swipers.set(key, new Swiper(element, CcPlayerInventoryComponent.CENTRED_SWIPER_OPTIONS));
  }

  private destroySwiper(key: string): void {
    const swiper = this.swipers.get(key);
    if (!swiper) return;

    swiper.destroy(true, true);
    this.swipers.delete(key);
  }

  private destroySwipers(): void {
    for (const key of [...this.swipers.keys()]) this.destroySwiper(key);
  }
}
