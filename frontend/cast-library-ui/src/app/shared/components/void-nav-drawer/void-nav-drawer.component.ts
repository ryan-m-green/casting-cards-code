import {
  Component,
  input,
  signal,
  computed,
  inject,
  HostListener,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, NavigationEnd } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignDetail } from '../../models/campaign.model';
import { CampaignLocationInstance } from '../../models/location.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';

@Component({
  selector: 'app-void-nav-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './void-nav-drawer.component.html',
  styleUrl: './void-nav-drawer.component.scss',
})
export class VoidNavDrawerComponent implements OnChanges {
  private router     = inject(Router);
  private transition = inject(PortalTransitionService);

  campaignId  = input.required<string>();
  campaign    = input<CampaignDetail | null>(null);
  isDm        = input<boolean>(false);
  /** 'dm' routes → /campaign/:id, 'player' routes → /player/campaign/:id */
  mode        = input<'dm' | 'player'>('dm');
  queueCount  = input<number>(0);

  isOpen      = signal(false);
  isClosing   = signal(false);
  searchQuery = signal('');

  expandedLocationIds         = signal<Set<string>>(new Set());
  factionsExpanded            = signal(false);
  questingCompanionsExpanded  = signal(false);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // ── Filtered tree ─────────────────────────────────────────────────────────

  filteredLocations = computed(() => {
    const c     = this.campaign();
    const query = this.searchQuery().trim().toLowerCase();
    if (!c) return [];

    const locations = c.locations.filter(l => !l.isPartyAnchor && (this.isDm() || l.isVisibleToPlayers));

    if (!query) return locations;

    return locations.filter(loc => {
      if (loc.name.toLowerCase().includes(query)) return true;
      const sublocations = this.sublocationsFor(loc.instanceId);
      if (sublocations.some(s => s.name.toLowerCase().includes(query))) return true;
      return sublocations.some(s =>
        this.castsFor(s.instanceId).some(ca => ca.name.toLowerCase().includes(query))
      );
    });
  });

  filteredFactions = computed(() => {
    const c     = this.campaign();
    const query = this.searchQuery().trim().toLowerCase();
    if (!c) return [];

    const factions = c.factions.filter(f => this.isDm() || f.isVisibleToPlayers);
    if (!query) return factions;
    return factions.filter(f => f.name.toLowerCase().includes(query));
  });

  hasResults = computed(() =>
    this.filteredLocations().length > 0 ||
    this.filteredFactions().length > 0
  );

  partyCasts = computed(() => {
    const c = this.campaign();
    if (!c) return [];
    const partySub = c.sublocations.find(s => s.isPartyAnchor);
    if (!partySub) return [];
    return (c.casts ?? []).filter(
      ca => ca.sublocationInstanceId === partySub.instanceId &&
            (this.isDm() || ca.isVisibleToPlayers)
    );
  });

  // ── Active-state helpers ──────────────────────────────────────────────────

  isActiveHome = computed(() => {
    const url = this.currentUrl();
    const b   = this.base;
    return url === b || url === b + '/';
  });

  isActiveMyCharacter    = computed(() => this.currentUrl().includes('/the-party'));
  isActiveParty          = computed(() => this.currentUrl().includes('/the-party'));
  isActivePlayerFactions = computed(() => this.currentUrl().includes('/campaign-insight'));
  isActiveEvents         = computed(() => this.currentUrl().includes('/plot'));

  isActiveFactions = computed(() => {
    const url = this.currentUrl();
    const b   = this.base;
    return url === `${b}/factions` || url === `${b}/factions/`;
  });

  isActiveLocation(instanceId: string): boolean {
    return this.currentUrl().includes(`/locations/${instanceId}`);
  }

  isActiveSublocation(instanceId: string): boolean {
    const url = this.currentUrl();
    return url.includes(`/sublocations/${instanceId}`) && !url.includes('/cast/');
  }

  isActiveCast(castInstanceId: string): boolean {
    return this.currentUrl().includes(`/cast/${castInstanceId}`);
  }

  isActiveFactionDetail(factionInstanceId: string): boolean {
    return this.currentUrl().includes(`/factions/${factionInstanceId}`);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  sublocationsFor(locationInstanceId: string) {
    const c = this.campaign();
    if (!c) return [];
    return (c.sublocations ?? []).filter(
      s => s.locationInstanceId === locationInstanceId &&
           !s.isPartyAnchor &&
           (this.isDm() || s.isVisibleToPlayers)
    );
  }

  castsFor(sublocationInstanceId: string) {
    const c = this.campaign();
    if (!c) return [];
    return (c.casts ?? []).filter(
      ca => ca.sublocationInstanceId === sublocationInstanceId &&
            (this.isDm() || ca.isVisibleToPlayers)
    );
  }

  sublocationsByFaction(factionInstanceId: string) {
    const c = this.campaign();
    if (!c) return [];
    return (c.sublocations ?? []).filter(
      s => s.factionInstanceId === factionInstanceId &&
           !s.isPartyAnchor &&
           (this.isDm() || s.isVisibleToPlayers)
    );
  }

  toggleFactions() {
    this.factionsExpanded.update(v => !v);
  }

  isLocationExpanded(instanceId: string): boolean {
    return this.expandedLocationIds().has(instanceId);
  }

  toggleLocation(instanceId: string) {
    this.expandedLocationIds.update(set => {
      const next = new Set(set);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  }

  // Auto-expand matching locations when searching
  ngOnChanges(_changes: SimpleChanges) {
    // intentionally blank; auto-expansion handled via computed
  }

  autoExpand(locationInstanceId: string): boolean {
    const url  = this.currentUrl();
    const subs = this.sublocationsFor(locationInstanceId);
    if (subs.some(s => url.includes(`/sublocations/${s.instanceId}`))) return true;
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) return this.isLocationExpanded(locationInstanceId);
    const matchesSub  = subs.some(s => s.name.toLowerCase().includes(query));
    const matchesCast = subs.some(s =>
      this.castsFor(s.instanceId).some(ca => ca.name.toLowerCase().includes(query))
    );
    return matchesSub || matchesCast || this.isLocationExpanded(locationInstanceId);
  }

  // ── Open / close ──────────────────────────────────────────────────────────

  open() {
    this.isOpen.set(true);
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
      this.isOpen.set(false);
      this.isClosing.set(false);
    }, 240);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  private get base(): string {
    return this.mode() === 'player'
      ? `/player/campaign/${this.campaignId()}`
      : `/campaign/${this.campaignId()}`;
  }

  exitToLibrary() {
    const route = this.mode() === 'player' ? ['/player/campaigns'] : ['/gm/campaigns'];
    this.transition.exitToLibrary(() =>
      this.router.navigate(route, { state: { noFlip: true } })
    );
  }

  goHome() {
    this.router.navigate([this.base]);
    this.close();
  }

  goToParty() {
    this.router.navigate([`/campaign/${this.campaignId()}`, 'the-party']);
    this.close();
  }

  goToFactions() {
    this.router.navigate([`/campaign/${this.campaignId()}`, 'factions']);
    this.close();
  }

  goToMyCharacter() {
    this.router.navigate([this.base, 'the-party']);
    this.close();
  }

  goToPlayerFactions() {
    this.router.navigate([this.base, 'campaign-insight']);
    this.close();
  }

  goToLocation(loc: CampaignLocationInstance) {
    this.router.navigate([this.base, 'locations', loc.instanceId]);
    this.close();
  }

  goToSublocation(sublocationInstanceId: string) {
    this.router.navigate([this.base, 'sublocations', sublocationInstanceId]);
    this.close();
  }

  goToCast(sublocationInstanceId: string, castInstanceId: string) {
    this.router.navigate([this.base, 'sublocations', sublocationInstanceId, 'cast', castInstanceId]);
    this.close();
  }

  goToFaction(factionInstanceId: string) {
    if (this.isDm()) {
      this.router.navigate([`/campaign/${this.campaignId()}`, 'factions', factionInstanceId]);
    } else {
      this.router.navigate([this.base, 'factions', factionInstanceId]);
    }
    this.close();
  }

  goToQueue() {
    this.router.navigate([this.base, 'quicknote-queue']);
    this.close();
  }

  goToEvents() {
    this.router.navigate([this.base, 'plot']);
    this.close();
  }
}
