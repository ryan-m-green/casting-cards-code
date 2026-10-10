import { Component, ElementRef, Injector, OnDestroy, afterNextRender, computed, effect, inject, input, signal, viewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import Swiper from 'swiper';
import { FreeMode, Mousewheel } from 'swiper/modules';
import { environment } from '../../../../../../environments/environment';
import { CampaignCastInstance } from '../../../../models/cast.model';
import { CampaignDetail } from '../../../../models/campaign.model';
import { CampaignLocationInstance } from '../../../../models/location.model';
import { CampaignSublocationInstance } from '../../../../models/sublocation.model';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CcSimpleLocationCardComponent } from '../../carddeck/cc-simple-location-card/cc-simple-location-card.component';
import { CcSimpleSublocationCardComponent } from '../../carddeck/cc-simple-sublocation-card/cc-simple-sublocation-card.component';
import { CcPlayerIconComponent } from '../cc-player-icon/cc-player-icon.component';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';

interface TravelRow {
  location: CampaignLocationInstance;
  sublocations: CampaignSublocationInstance[];
}

function matchesLocation(location: CampaignLocationInstance, term: string): boolean {
  return location.name.toLowerCase().includes(term)
    || (location.classification ?? '').toLowerCase().includes(term)
    || (location.description ?? '').toLowerCase().includes(term)
    || (location.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
}

function matchesSublocation(sublocation: CampaignSublocationInstance, term: string): boolean {
  return sublocation.name.toLowerCase().includes(term)
    || (sublocation.description ?? '').toLowerCase().includes(term)
    || (sublocation.keywords ?? []).some(keyword => keyword.toLowerCase().includes(term));
}

const ROW_GAP = 12;

const DRAG_TAIL_MS = 200;

const LOCKED_PARTY_NOTE = 'Locked cards cannot join the party — reveal this card to the players first.';

@Component({
  selector: 'cc-cast-travel-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcSimpleLocationCardComponent, CcSimpleSublocationCardComponent, CcPlayerIconComponent, CcTextboxComponent],
  templateUrl: './cc-cast-travel-picker.component.html',
  styleUrl: './cc-cast-travel-picker.component.scss'
})
export class CcCastTravelPickerComponent implements OnDestroy {
  private http = inject(HttpClient);
  private injector = inject(Injector);
  private shell = inject(CampaignShellService);

  readonly campaignId = input.required<string>();
  readonly castInstanceId = input.required<string>();
  readonly castName = input('');

  readonly sublocationInstanceId = input('');

  readonly portalColor = input('#6e28d0');

  readonly search = signal('');

  readonly searching = computed(() => !!this.search().trim());

  readonly traveling = signal(false);

  readonly error = signal<string | null>(null);

  private readonly travelledTo = signal<string | null>(null);

  readonly pending = signal<CampaignSublocationInstance | null>(null);

  private readonly rowTracks = viewChildren<ElementRef<HTMLElement>>('travelRow');

  private readonly swipers = new Map<string, Swiper>();

  private rowMovedAt = 0;

  private readonly rowMoved = () => { this.rowMovedAt = Date.now(); };

  readonly campaign = computed<CampaignDetail | null>(() => this.shell.campaign());

  readonly partyAnchor = computed<CampaignSublocationInstance | null>(() =>
    this.campaign()?.sublocations?.find(s => s.isPartyAnchor) ?? null);

  private readonly movingCast = computed<CampaignCastInstance | null>(() =>
    this.campaign()?.casts?.find(cast => cast.instanceId === this.castInstanceId()) ?? null);

  readonly castLocked = computed(() => this.movingCast()?.isVisibleToPlayers === false);

  partyLockNote(sublocation: CampaignSublocationInstance): string | null {
    if (!sublocation.isPartyAnchor || !this.castLocked()) return null;
    if (sublocation.instanceId === this.currentSublocationId()) return null;

    return LOCKED_PARTY_NOTE;
  }

  isOffered(sublocation: CampaignSublocationInstance): boolean {
    return this.partyLockNote(sublocation) === null;
  }

  private readonly locations = computed<CampaignLocationInstance[]>(() => this.campaign()?.locations ?? []);

  private readonly openedLocationId = computed<string | null>(() => {
    const id = this.sublocationInstanceId();
    if (!id) return null;
    return this.campaign()?.sublocations?.find(s => s.instanceId === id)?.locationInstanceId ?? null;
  });

  private readonly rowLocations = computed<CampaignLocationInstance[]>(() => {
    const all = this.locations();
    const leading: CampaignLocationInstance[] = [];

    for (const id of [this.openedLocationId(), this.partyAnchor()?.locationInstanceId]) {
      if (!id || leading.some(loc => loc.instanceId === id)) continue;
      const location = all.find(loc => loc.instanceId === id);
      if (location) leading.push(location);
    }

    const atHead = new Set(leading.map(loc => loc.instanceId));
    return [...leading, ...all.filter(loc => !atHead.has(loc.instanceId))];
  });

  readonly rows = computed<TravelRow[]>(() => {
    const term = this.search().trim().toLowerCase();

    return this.rowLocations().flatMap(location => {
      const sublocations = this.sublocationsByLocation()[location.instanceId] ?? [];
      if (!term || matchesLocation(location, term)) return [{ location, sublocations }];

      const answering = sublocations.filter(sublocation => matchesSublocation(sublocation, term));
      return answering.length ? [{ location, sublocations: answering }] : [];
    });
  });

  onSearchChange(term: string) {
    this.search.set(term);
  }

  readonly sublocationsByLocation = computed<Record<string, CampaignSublocationInstance[]>>(() => {
    const grouped: Record<string, CampaignSublocationInstance[]> = {};

    for (const sublocation of this.campaign()?.sublocations ?? []) {
      const key = sublocation.locationInstanceId;
      const held = grouped[key] ?? [];
      grouped[key] = sublocation.isPartyAnchor ? [sublocation, ...held] : [...held, sublocation];
    }

    return grouped;
  });

  readonly currentSublocationId = computed(() =>
    this.travelledTo() ?? (this.sublocationInstanceId() || null));

  private readonly currentSublocation = computed<CampaignSublocationInstance | null>(() => {
    const id = this.currentSublocationId();
    if (!id) return null;
    return this.campaign()?.sublocations?.find(s => s.instanceId === id) ?? null;
  });

  readonly currentLocationId = computed(() => this.currentSublocation()?.locationInstanceId ?? null);

  readonly currentLocationName = computed(() => this.nameOfLocation(this.currentLocationId()));

  readonly currentSublocationName = computed(() => this.currentSublocation()?.name ?? '');

  readonly pendingLocationName = computed(() =>
    this.nameOfLocation(this.pending()?.locationInstanceId ?? null));

  readonly pendingSublocationName = computed(() => this.pending()?.name ?? '');

  private nameOfLocation(locationInstanceId: string | null): string {
    if (!locationInstanceId) return '';
    return this.locations().find(loc => loc.instanceId === locationInstanceId)?.name ?? '';
  }

  isCurrentLocation(location: CampaignLocationInstance): boolean {
    return this.currentLocationId() === location.instanceId;
  }

  isCurrent(sublocation: CampaignSublocationInstance): boolean {
    return this.currentSublocationId() === sublocation.instanceId;
  }

  onTileClick(sublocation: CampaignSublocationInstance) {
    if (Date.now() - this.rowMovedAt < DRAG_TAIL_MS) return;
    this.pick(sublocation);
  }

  onPartyClick() {
    const anchor = this.partyAnchor();
    if (anchor) this.pick(anchor);
  }

  pick(sublocation: CampaignSublocationInstance) {
    if (!this.isOffered(sublocation)) return;

    this.pending.update(current =>
      current?.instanceId === sublocation.instanceId ? null : sublocation);
    this.error.set(null);
  }

  isPending(sublocation: CampaignSublocationInstance): boolean {
    return this.pending()?.instanceId === sublocation.instanceId;
  }

  isPendingLocation(location: CampaignLocationInstance): boolean {
    return this.pending()?.locationInstanceId === location.instanceId;
  }

  travel() {
    const sublocation = this.pending();
    if (!sublocation || this.traveling()) return;

    if (!this.isOffered(sublocation)) {
      this.pending.set(null);
      this.error.set(this.partyLockNote(sublocation));
      return;
    }

    const locationInstanceId = sublocation.locationInstanceId;
    const sublocationInstanceId = sublocation.instanceId;

    this.traveling.set(true);
    this.error.set(null);

    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${this.castInstanceId()}/travel`,
      {
        locationInstanceId,
        sublocationInstanceId,
        fromSublocationInstanceId: this.currentSublocationId(),
      }
    ).subscribe({
      next: () => {
        this.traveling.set(false);
        this.travelledTo.set(sublocationInstanceId);
        this.pending.set(null);

        this.settleCampaign(locationInstanceId, sublocationInstanceId);
      },
      error: () => {
        this.traveling.set(false);
        this.error.set(`Could not move ${this.castName() || 'this cast'}. Try again.`);
      },
    });
  }

  private static readonly SWIPER_OPTIONS = {
    modules: [FreeMode, Mousewheel],
    slidesPerView: 'auto' as const,
    spaceBetween: ROW_GAP,
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

  constructor() {
    effect(() => {
      const tracks = this.rowTracks().map(ref => ref.nativeElement);
      this.rows().length;

      afterNextRender(() => this.mountRows(tracks), { injector: this.injector });
    });
  }

  private mountRows(tracks: HTMLElement[]) {
    const drawn = new Set<string>();

    for (const track of tracks) {
      const rowId = track.dataset['rowId'] ?? '';
      if (!rowId) continue;
      drawn.add(rowId);

      const running = this.swipers.get(rowId);

      if (running) {
        if (running.el === track) {
          running.update();
          continue;
        }
        this.unmountRow(rowId);
      }

      this.swipers.set(rowId, this.mountRow(track));
    }

    for (const rowId of [...this.swipers.keys()]) {
      if (!drawn.has(rowId)) this.unmountRow(rowId);
    }
  }

  private mountRow(track: HTMLElement): Swiper {
    const swiper = new Swiper(track, CcCastTravelPickerComponent.SWIPER_OPTIONS);

    swiper.on('touchMove', this.rowMoved);
    swiper.on('sliderMove', this.rowMoved);

    return swiper;
  }

  private unmountRow(rowId: string) {
    const swiper = this.swipers.get(rowId);
    if (!swiper) return;

    swiper.destroy(true, true);
    this.swipers.delete(rowId);
  }

  ngOnDestroy() {
    for (const rowId of [...this.swipers.keys()]) this.unmountRow(rowId);

    const sublocationId = this.travelledTo();
    const locationId = this.currentLocationId();
    if (!sublocationId || !locationId || locationId === this.openedLocationId()) return;

    this.shell.publishCastTraveledFromDrawer({
      campaignId: this.campaignId(),
      locationInstanceId: locationId,
      sublocationInstanceId: sublocationId,
    });
  }

  private settleCampaign(locationInstanceId: string, sublocationInstanceId: string) {
    const id = this.campaignId();
    const castInstanceId = this.castInstanceId();

    const move = (campaign: CampaignDetail | null): CampaignDetail | null =>
      campaign && campaign.id === id
        ? {
            ...campaign,
            casts: (campaign.casts ?? []).map(cast =>
              cast.instanceId === castInstanceId
                ? { ...cast, locationInstanceId, sublocationInstanceId }
                : cast),
          }
        : campaign;

    this.shell.updateCampaign(move);
    this.shell.publishCardsChanged(id);
  }
}
