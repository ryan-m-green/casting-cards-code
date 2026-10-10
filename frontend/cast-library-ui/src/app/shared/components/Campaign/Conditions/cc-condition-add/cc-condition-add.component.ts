import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector, OnDestroy, OnInit,
  afterNextRender, computed, effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { ConditionEntry } from '../../../../models/condition-entry.model';
import { ConditionLibraryService } from '../../../../../core/condition-library.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { CcConditionFormComponent } from '../cc-condition-form/cc-condition-form.component';
import { CcConditionCardComponent } from '../cc-condition-card/cc-condition-card.component';

type AddTab = 'library' | 'new';

interface EntryKeywordChip {
  keyword: string;
  count: number;
  all: boolean;
}

@Component({
  selector: 'cc-condition-add',
  standalone: true,
  imports: [FormsModule, CcTextboxComponent, CcConditionFormComponent, CcConditionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-condition-add.component.html',
  styleUrl: './cc-condition-add.component.scss',
})
export class CcConditionAddComponent implements OnInit, OnDestroy {
  private readonly library = inject(ConditionLibraryService);
  private readonly hub = inject(CampaignHubService);
  private readonly injector = inject(Injector);

  private readonly hubSubscriptions: Subscription[] = [];

  private readonly conditionRowRef = viewChild<ElementRef<HTMLElement>>('conditionRow');

  private swiper: Swiper | null = null;

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: 12,
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

  readonly campaignId = input.required<string>();

  readonly portalColor = input<string>('#6e28d0');

  readonly saved = output<ConditionEntry>();

  readonly added = output<number>();

  readonly cancel = output<void>();

  readonly activeTab = signal<AddTab>('library');

  readonly picked = signal<readonly string[]>([]);

  readonly search = signal('');

  readonly linking = signal(false);

  readonly error = signal('');

  readonly available = computed(() => this.library.available(this.campaignId()));

  /** The conditions this campaign already holds — never offered again in the picker. */
  readonly linked = computed(() => this.library.conditions(this.campaignId()));

  readonly loading = computed(() =>
    this.library.isLoadingAvailable(this.campaignId()) || this.library.isLoading(this.campaignId()));

  readonly failed = computed(() => this.library.hasFailed(this.campaignId()));

  /** The GM has written no condition at all yet. */
  readonly libraryEmpty = computed(() => this.available().length === 0 && this.linked().length === 0);

  /** Every condition the GM has is already on this campaign. */
  readonly allAdded = computed(() => this.available().length === 0 && this.linked().length > 0);

  readonly candidates = computed<readonly ConditionEntry[]>(() => {
    const term = this.search().trim().toLowerCase();

    if (!term) return this.available();

    return this.available().filter(entry => this.matches(entry, term));
  });

  readonly keywordChips = computed<EntryKeywordChip[]>(() => {
    const chips = new Map<string, { keyword: string; ids: string[] }>();

    for (const entry of this.available()) {
      for (const keyword of entry.keywords) {
        const key = keyword.trim();

        if (key === '') continue;

        const chip = chips.get(key.toLowerCase()) ?? { keyword: key, ids: [] };
        chip.ids.push(entry.id);
        chips.set(key.toLowerCase(), chip);
      }
    }

    return [...chips.values()]
      .map(chip => ({
        keyword: chip.keyword,
        count: chip.ids.length,
        all: chip.ids.every(id => this.picked().includes(id)),
      }))
      .sort((left, right) => left.keyword.localeCompare(right.keyword));
  });

  readonly pickedCount = computed(() => this.picked().length);

  readonly canAdd = computed(() => this.pickedCount() > 0 && !this.linking());

  constructor() {
    effect(() => {
      const campaignId = this.campaignId();
      untracked(() => {
        this.picked.set([]);
        this.error.set('');
        this.library.load(campaignId).subscribe();
        this.library.refreshAvailable(campaignId).subscribe();
      });
    });

    effect(() => {
      const count = this.candidates().length;
      this.conditionRowRef();

      afterNextRender(() => this.syncSwiper(count), { injector: this.injector });
    });
  }

  ngOnInit(): void {
    this.hubSubscriptions.push(
      this.hub.on('CampaignConditionsChanged', 'cc-condition-add', event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.refresh();
      })
    );
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.forEach(subscription => subscription.unsubscribe());
    this.destroySwiper();
  }

  @HostListener('wheel', ['$event'])
  onHorizontalWheel(event: WheelEvent) {
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
      event.preventDefault();
    }
  }

  setTab(tab: AddTab): void {
    if (tab === this.activeTab()) return;

    this.activeTab.set(tab);
    this.error.set('');

    // The pool is only shown on the library tab, so read it again whenever the DM looks at it.
    if (tab === 'library') this.library.refreshAvailable(this.campaignId()).subscribe();
  }

  isPicked(conditionId: string): boolean {
    return this.picked().includes(conditionId);
  }

  isLinked(conditionId: string): boolean {
    return this.linked().some(entry => entry.id === conditionId);
  }

  toggleEntry(entry: ConditionEntry): void {
    if (this.isLinked(entry.id)) return;

    this.picked.update(ids =>
      ids.includes(entry.id) ? ids.filter(id => id !== entry.id) : [...ids, entry.id]
    );
  }

  toggleKeyword(keyword: string): void {
    const ids = this.available()
      .filter(entry => entry.keywords.some(carried => carried.toLowerCase() === keyword.toLowerCase()))
      .map(entry => entry.id);

    if (ids.length === 0) return;

    const all = ids.every(id => this.isPicked(id));

    this.picked.update(picked =>
      all ? picked.filter(id => !ids.includes(id)) : [...new Set([...picked, ...ids])]
    );
  }

  onSearchChange(term: string): void {
    this.search.set(term);
  }

  clearPicked(): void {
    this.picked.set([]);
  }

  addPicked(): void {
    if (!this.canAdd()) return;

    this.linking.set(true);
    this.error.set('');

    this.library.link(this.campaignId(), this.picked()).subscribe({
      next: lifted => {
        this.linking.set(false);
        this.picked.set([]);
        this.added.emit(lifted.length);
      },
      error: () => {
        this.linking.set(false);
        this.error.set('Could not add those conditions. Try again.');
      },
    });
  }

  onSaved(entry: ConditionEntry): void {
    this.activeTab.set('library');
    this.saved.emit(entry);
  }

  /** Reloads both shelves the drawer reads: what the campaign holds, and what it can still add. */
  private refresh(): void {
    const campaignId = this.campaignId();

    this.library.reload(campaignId).subscribe();
    this.library.refreshAvailable(campaignId).subscribe(() => {
      this.picked.update(ids => ids.filter(id => this.available().some(entry => entry.id === id)));
    });
  }

  private syncSwiper(count: number): void {
    const host = this.conditionRowRef()?.nativeElement ?? null;

    if (!host) {
      this.destroySwiper();
      return;
    }

    if (this.swiper && this.swiper.slides.length === count) {
      this.swiper.update();
      return;
    }

    this.destroySwiper();
    this.swiper = new Swiper(host, CcConditionAddComponent.SWIPER_OPTIONS);
  }

  private destroySwiper(): void {
    if (!this.swiper) return;

    this.swiper.destroy(true, true);
    this.swiper = null;
  }

  private matches(entry: ConditionEntry, term: string): boolean {
    return (
      entry.name.toLowerCase().includes(term) ||
      entry.consequence.toLowerCase().includes(term) ||
      entry.keywords.some(keyword => keyword.toLowerCase().includes(term))
    );
  }
}
