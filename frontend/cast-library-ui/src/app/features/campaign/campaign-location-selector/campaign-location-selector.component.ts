import { Component, OnInit, OnDestroy, signal, inject, computed, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { forkJoin, catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { KeywordInputComponent } from '../../../shared/components/keyword-input/keyword-input.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

interface ShopItem {
  id: string;
  name: string;
  price: string;
}

interface CampaignShopItem {
  name: string;
  price: string;
  priceAmount: number | null;
  priceCurrency: string;
}

interface LocationCard {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  shopItems: ShopItem[];
}

interface AddedLocation {
  loc:         LocationCard;
  instanceId:  string;
  keywords:    string[];
  customItems: CampaignShopItem[];
}

@Component({
  selector: 'app-campaign-location-selector',
  standalone: true,
  imports: [CommonModule, CardFlipComponent, KeywordInputComponent, DmNavComponent],
  templateUrl: './campaign-location-selector.component.html',
  styleUrl: './campaign-location-selector.component.scss'
})
export class CampaignLocationSelectorComponent implements OnInit, OnDestroy {
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private http   = inject(HttpClient);

  @ViewChild('mainCard')        mainCardRef!:       ElementRef<HTMLElement>;
  @ViewChild('mainCardWrapper') mainCardWrapperRef!: ElementRef<HTMLElement>;
  @ViewChild('selectedStack')   selectedStackRef!:  ElementRef<HTMLElement>;
  @ViewChild('deckStack')       deckStackRef!:      ElementRef<HTMLElement>;

  campaignId     = '';
  cityInstanceId = '';

  allLocations           = signal<LocationCard[]>([]);
  addedLocations         = signal<AddedLocation[]>([]);
  allCampaignLocationIds = signal<Set<string>>(new Set());
  allDmKeywords          = signal<string[]>([]);
  campaignCasts          = signal<any[]>([]);
  deckIdx                = signal(0);
  expandedIdx            = signal(0);
  loading                = signal(true);
  isSwapping             = false;
  locationSearch         = signal('');

  readonly currencies    = ['cp', 'sp', 'ep', 'gp', 'pp'];
  openDropdownId         = signal<string | null>(null);

  private readonly SEL_PEEK = 46;
  private readonly SEL_FULL = 220;
  private keywordSaveTimer?:    ReturnType<typeof setTimeout>;
  private customItemSaveTimer?: ReturnType<typeof setTimeout>;

  deckLocations = computed(() => {
    const addedIds = new Set(this.addedLocations().map(a => a.loc.id));
    const usedIds  = this.allCampaignLocationIds();
    return this.allLocations().filter(l => !addedIds.has(l.id) && !usedIds.has(l.id));
  });

  filteredDeckLocations = computed(() => {
    const term = this.locationSearch().trim().toLowerCase();
    const deck = this.deckLocations();
    if (!term) return deck;
    return deck.filter(l =>
      [l.name, l.description].some(f => f?.toLowerCase().includes(term))
    );
  });

  currentCard = computed(() => {
    const deck = this.filteredDeckLocations();
    if (!deck.length) return null;
    return deck[this.deckIdx() % deck.length];
  });

  selTopsList = computed(() => {
    const n      = this.addedLocations().length;
    const expIdx = this.expandedIdx();
    return Array.from({ length: n }, (_, j) =>
      j * this.SEL_PEEK + (expIdx !== -1 && j > expIdx ? this.SEL_FULL - this.SEL_PEEK : 0)
    );
  });

  selContainerHeight = computed(() => {
    const tops = this.selTopsList();
    const n    = tops.length;
    if (!n) return 0;
    return tops[n - 1] + this.SEL_FULL;
  });

  expandedLocation = computed(() => this.addedLocations()[this.expandedIdx()] ?? null);

  castsForExpandedLocation = computed(() => {
    const loc = this.expandedLocation();
    if (!loc) return [];
    return this.campaignCasts().filter((c: any) => c.locationInstanceId === loc.instanceId);
  });

  ngOnInit() {
    this.campaignId     = this.route.snapshot.paramMap.get('id')       ?? '';
    this.cityInstanceId = this.route.snapshot.paramMap.get('cityId')   ?? '';

    this.http.get<{ keywords: string[] }>(`${environment.apiUrl}/api/users/keywords`)
      .subscribe(r => this.allDmKeywords.set(r.keywords));

    forkJoin({
      locs:     this.http.get<any[]>(`${environment.apiUrl}/api/locations`)
                    .pipe(catchError(() => of([]))),
      campaign: this.http.get<any>(`${environment.apiUrl}/api/campaigns/${this.campaignId}`)
                    .pipe(catchError(() => of(null))),
    }).subscribe(({ locs, campaign }) => {
      const locations: LocationCard[] = locs.map(l => ({
        id:          l.id,
        name:        l.name,
        description: l.description ?? '',
        imageUrl:    l.imageUrl ?? undefined,
        shopItems:   (l.shopItems ?? []).map((s: any) => ({ id: s.id, name: s.name, price: s.price ?? '' })),
      }));
      this.allLocations.set(locations);

      if (campaign) {
        const campaignLocs: any[] = campaign.locations ?? [];

        // Locations already settled for this city → populate selected stack
        const added: AddedLocation[] = campaignLocs
          .filter((l: any) => l.cityInstanceId === this.cityInstanceId)
          .map((l: any) => {
            const libLoc = locations.find(loc => loc.id === l.sourceLocationId);
            if (!libLoc) return null;
            return {
              loc:        libLoc,
              instanceId: l.instanceId,
              keywords:   l.keywords ?? [],
              customItems: (l.customItems ?? []).map((i: any) => {
                const parsed = this._parsePrice(i.price ?? '');
                return { name: i.name, price: i.price ?? '', priceAmount: parsed.amount, priceCurrency: parsed.currency };
              }),
            };
          })
          .filter(Boolean) as AddedLocation[];
        this.addedLocations.set(added);

        // Exclusion set: locations claimed by OTHER cities
        const usedIds = new Set<string>(
          campaignLocs
            .filter((l: any) => l.cityInstanceId !== this.cityInstanceId)
            .map((l: any) => l.sourceLocationId)
            .filter(Boolean)
        );
        this.allCampaignLocationIds.set(usedIds);
        this.campaignCasts.set(campaign.casts ?? []);
      }

      this.loading.set(false);
    });
  }

  ngOnDestroy() {
    clearTimeout(this.keywordSaveTimer);
    clearTimeout(this.customItemSaveTimer);
  }

  setLocationSearch(term: string) {
    this.locationSearch.set(term);
    this.deckIdx.set(0);
  }

  swapCard() {
    if (this.isSwapping) return;
    const deck = this.filteredDeckLocations();
    if (deck.length <= 1) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    card.style.transition = 'transform 0.27s cubic-bezier(0.4,0,1,1), opacity 0.22s ease-in';
    card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
    card.style.opacity    = '0';

    setTimeout(() => {
      this.deckIdx.update(i => (i + 1) % deck.length);
      card.style.transition = 'none';
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      card.style.opacity    = '0';
      void card.offsetWidth;
      card.style.transition = 'transform 0.30s cubic-bezier(0,0,0.2,1), opacity 0.25s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
      setTimeout(() => { this.isSwapping = false; }, 300);
    }, 270);
  }

  selectLocation() {
    if (this.isSwapping) return;
    const loc = this.currentCard();
    if (!loc) return;
    this.isSwapping = true;
    const card = this.mainCardRef?.nativeElement;
    if (!card) { this.isSwapping = false; return; }

    const currentCount = this.addedLocations().length;
    this._ghostSlideAdd(card, currentCount, () => { this.isSwapping = false; });

    card.style.opacity    = '0';
    card.style.transition = 'none';

    const newDeckLen = this.deckLocations().length - 1;
    if (newDeckLen > 0) {
      this.deckIdx.update(i => i % newDeckLen);
      void card.offsetWidth;
      card.style.transform  = 'translateX(-224px) scale(0.82) rotate(-6deg)';
      void card.offsetWidth;
      card.style.transition = 'transform 0.34s cubic-bezier(0,0,0.2,1), opacity 0.28s ease-out';
      card.style.transform  = 'translateX(0) scale(1) rotate(0deg)';
      card.style.opacity    = '1';
    }

    this.http.post<{ instanceId: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/locations`,
      { locationId: loc.id, cityInstanceId: this.cityInstanceId }
    ).subscribe({ next: resp => {
      const newEntry: AddedLocation = { loc, instanceId: resp.instanceId, keywords: [], customItems: [] };
      this.addedLocations.update(list => [...list, newEntry]);
      this.expandedIdx.set(this.addedLocations().length - 1);
    }});
  }

  removeLocation(index: number) {
    const added  = this.addedLocations()[index];
    const card   = this._getSelCardEl(index);
    const deckIsEmpty = this.deckLocations().length === 0;
    const target = deckIsEmpty ? this.mainCardWrapperRef?.nativeElement
                               : this.deckStackRef?.nativeElement;
    if (card) {
      this._ghostSlideRemove(card, target ?? null, () => this._doRemove(index, added));
    } else {
      this._doRemove(index, added);
    }
  }

  toggleExpanded(index: number) {
    this.expandedIdx.update(i => i === index ? -1 : index);
  }

  goToCast(locationInstanceId: string) {
    this.router.navigate([
      '/dm/campaigns', this.campaignId,
      'cities', this.cityInstanceId,
      'locations', locationInstanceId, 'cast',
    ]);
  }

  goBack() {
    this.router.navigate(['/dm/campaigns', this.campaignId]);
  }

  updateLocationKeywords(keywords: string[]) {
    const added = this.expandedLocation();
    if (!added) return;
    this.addedLocations.update(list =>
      list.map(a => a.instanceId === added.instanceId ? { ...a, keywords } : a)
    );
    this.allDmKeywords.update(pool => Array.from(new Set([...pool, ...keywords])));
    this._scheduleKeywordSave(added.instanceId);
  }

  addCustomItem() {
    const added = this.expandedLocation();
    if (!added) return;
    this.addedLocations.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, customItems: [...a.customItems, { name: '', price: '', priceAmount: null, priceCurrency: 'gp' }] }
        : a)
    );
    this._scheduleCustomItemSave(added.instanceId);
  }

  removeCustomItem(index: number) {
    const added = this.expandedLocation();
    if (!added) return;
    this.addedLocations.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, customItems: a.customItems.filter((_, i) => i !== index) }
        : a)
    );
    this._scheduleCustomItemSave(added.instanceId);
  }

  updateCustomItemField(index: number, field: 'name' | 'price', value: string) {
    const added = this.expandedLocation();
    if (!added) return;
    this.addedLocations.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? { ...a, customItems: a.customItems.map((item, i) => i === index ? { ...item, [field]: value } : item) }
        : a)
    );
    this._scheduleCustomItemSave(added.instanceId);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.notes-dropdown')) {
      this.openDropdownId.set(null);
    }
  }

  toggleDropdown(id: string, e: MouseEvent) {
    e.stopPropagation();
    this.openDropdownId.update(current => current === id ? null : id);
  }

  isDropdownOpen(id: string): boolean { return this.openDropdownId() === id; }

  setCurrencyForItem(index: number, value: string) {
    this.updateCustomItemPriceField(index, 'currency', value);
    this.openDropdownId.set(null);
  }

  updateCustomItemPriceField(index: number, field: 'amount' | 'currency', value: string) {
    const added = this.expandedLocation();
    if (!added) return;
    this.addedLocations.update(list =>
      list.map(a => a.instanceId === added.instanceId
        ? {
            ...a,
            customItems: a.customItems.map((item, i) => {
              if (i !== index) return item;
              const newAmount   = field === 'amount'   ? (value === '' ? null : Number(value)) : item.priceAmount;
              const newCurrency = field === 'currency' ? value : item.priceCurrency;
              const price = newAmount != null ? `${newAmount} ${newCurrency}` : '';
              return { ...item, priceAmount: newAmount, priceCurrency: newCurrency, price };
            })
          }
        : a)
    );
    this._scheduleCustomItemSave(added.instanceId);
  }

  private _parsePrice(price: string): { amount: number | null; currency: string } {
    const parts = price.trim().split(' ');
    const amount = parts[0] ? Number(parts[0]) : null;
    const currency = parts[1] ?? 'gp';
    return { amount: isNaN(amount as number) ? null : amount, currency };
  }

  private _doRemove(index: number, added: AddedLocation) {
    this.addedLocations.update(list => list.filter((_, i) => i !== index));
    const newLen = this.addedLocations().length;
    this.expandedIdx.update(i => Math.min(i, newLen - 1));
    const idx = this.deckLocations().findIndex(l => l.id === added.loc.id);
    if (idx !== -1) this.deckIdx.set(idx);

    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/locations/${added.instanceId}`
    ).subscribe();
  }

  private _scheduleKeywordSave(instanceId: string) {
    clearTimeout(this.keywordSaveTimer);
    this.keywordSaveTimer = setTimeout(() => {
      const current = this.addedLocations().find(a => a.instanceId === instanceId);
      if (!current) return;
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId}/locations/${instanceId}/keywords`,
        { keywords: current.keywords }
      ).subscribe();
    }, 600);
  }

  private _scheduleCustomItemSave(instanceId: string) {
    clearTimeout(this.customItemSaveTimer);
    this.customItemSaveTimer = setTimeout(() => {
      const current = this.addedLocations().find(a => a.instanceId === instanceId);
      if (!current) return;
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId}/locations/${instanceId}/custom-items`,
        { items: current.customItems }
      ).subscribe();
    }, 600);
  }

  private _getSelCardEl(index: number): HTMLElement | null {
    const stack = this.selectedStackRef?.nativeElement;
    if (!stack) return null;
    return stack.querySelector(`[data-sel-idx="${index}"]`) as HTMLElement | null;
  }

  private _ghostSlideAdd(card: HTMLElement, currentCount: number, onDone: () => void) {
    const r     = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none',
    });
    document.body.appendChild(ghost);

    const stackEl  = this.selectedStackRef?.nativeElement;
    const stackR   = stackEl?.getBoundingClientRect();
    const destTop  = stackR ? stackR.top  + currentCount * this.SEL_PEEK : r.top  + 400;
    const destLeft = stackR ? stackR.left : r.left;
    const dx = destLeft - r.left;
    const dy = destTop  - r.top;

    void ghost.offsetWidth;
    ghost.style.transition = 'transform 0.52s cubic-bezier(0.4,0,0.55,1), opacity 0.15s ease 0.4s';
    ghost.style.transform  = `translate(${dx}px,${dy}px)`;
    ghost.style.opacity    = '0';
    setTimeout(() => { ghost.remove(); onDone(); }, 580);
  }

  private _ghostSlideRemove(card: HTMLElement, targetEl: HTMLElement | null, onDone: () => void) {
    const r     = card.getBoundingClientRect();
    const ghost = card.cloneNode(true) as HTMLElement;
    Object.assign(ghost.style, {
      position: 'fixed', top: r.top + 'px', left: r.left + 'px',
      width: r.width + 'px', height: r.height + 'px',
      margin: '0', zIndex: '1000', pointerEvents: 'none', transition: 'none',
    });
    document.body.appendChild(ghost);

    card.style.transition    = 'none';
    card.style.opacity       = '0';
    card.style.pointerEvents = 'none';

    const targetR  = targetEl?.getBoundingClientRect();
    const destTop  = targetR ? targetR.top  + targetR.height * 0.1 : r.top  - 300;
    const destLeft = targetR ? targetR.left + targetR.width  * 0.05 : r.left - 300;
    const dx = destLeft - r.left;
    const dy = destTop  - r.top;

    void ghost.offsetWidth;
    ghost.style.transition = 'transform 0.46s cubic-bezier(0.4,0,0.55,1), opacity 0.15s ease 0.33s';
    ghost.style.transform  = `translate(${dx}px,${dy}px) scale(0.76)`;
    ghost.style.opacity    = '0';
    setTimeout(() => { ghost.remove(); onDone(); }, 520);
  }
}
