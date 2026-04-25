import { Component, OnInit, signal, computed, inject, effect, HostListener, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignSublocationInstance, ShopItem } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { PortalImportCardComponent } from '../../../shared/components/portal-import-card/portal-import-card.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';

@Component({
  selector: 'app-campaign-sublocation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, SublocationCardComponent, CastCardComponent, PortalImportCardComponent, LockIconComponent],
  templateUrl: './campaign-sublocation-detail.component.html',
  styleUrl: './campaign-sublocation-detail.component.scss'
})
export class CampaignSublocationDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private auth       = inject(AuthService);
  private shellSvc   = inject(CampaignShellService);
  private transition = inject(PortalTransitionService);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  private _castImportCard = signal<PortalImportCardComponent | null>(null);
  @ViewChild('castImportCard') set castImportCardSetter(ref: PortalImportCardComponent | undefined) {
    this._castImportCard.set(ref ?? null);
  }
  get castImportCardRef(): PortalImportCardComponent | null {
    return this._castImportCard();
  }

  castDrawerOpen = signal(false);

  private _castGridEl = signal<HTMLElement | null>(null);
  @ViewChild('castGrid') set castGridRef(ref: ElementRef<HTMLElement> | undefined) {
    this._castGridEl.set(ref?.nativeElement ?? null);
  }
  get castGridEl(): HTMLElement | null { return this._castGridEl(); }

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');

  // Edit mode
  editing         = signal(false);
  editDescription = signal('');
  editDmNotes     = signal('');

  // Add secret
  addingSecret     = signal(false);
  newSecretContent = signal('');

  // Add shop item
  addingShopItem       = signal(false);
  newShopItemName      = signal('');
  newShopItemAmount    = signal('');
  newShopItemCurrency  = signal('gp');

  // Currency dropdown
  readonly currencies      = ['cp', 'sp', 'ep', 'gp', 'pp'];
  openDropdownId           = signal<string | null>(null);

  isDm = computed(() => this.auth.isDm());

  sublocation = computed<CampaignSublocationInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(l => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  sublocationSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.sublocationInstanceId === this.sublocationInstanceId());
  });

  sublocationCasts = computed<CampaignCastInstance[]>(() => {
    const c = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return [];
    return c.casts.filter(cast => cast.sublocationInstanceId === subLoc.instanceId);
  });

  parentLocation = computed(() => {
    const c   = this.campaign();
    const subLoc = this.sublocation();
    if (!c || !subLoc) return null;
    return c.locations.find(ci => ci.instanceId === subLoc.locationInstanceId) ?? null;
  });

  allCastsVisible = computed(() => {
    const casts = this.sublocationCasts();
    return casts.length > 0 && casts.every(c => c.isVisibleToPlayers);
  });

  constructor() {
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === event.secretId ? { ...s, isRevealed: true } : s
          )
        };
      });
    });
  }

  ngOnInit() {
    const id    = this.route.snapshot.paramMap.get('id')!;
    const locId = this.route.snapshot.paramMap.get('sublocationInstanceId')!;
    this.campaignId.set(id);
    this.sublocationInstanceId.set(locId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => {
        this.campaign.set(c);
        const subLoc    = c.sublocations.find(l => l.instanceId === locId);
        const parentLoc = subLoc ? c.locations.find(l => l.instanceId === subLoc.locationInstanceId) : null;
        this.shellSvc.setTitle(subLoc?.name ?? '');
        this.shellSvc.setCrumbs([
          { label: '← Locations',                   action: () => this.goToCampaign() },
          { label: '← Sublocations', action: () => this.goToLocation() },
        ]);
      });
  }

  // ── Edit details ─────────────────────────────────────────────────────────

  startEditing() {
    const subLoc = this.sublocation();
    if (!subLoc) return;
    this.editDescription.set(subLoc.description ?? '');
    this.editDmNotes.set(subLoc.dmNotes ?? '');
    this.editing.set(true);
    requestAnimationFrame(() => this.expandPanel());
  }

  cancelEditing() {
    this.editing.set(false);
  }

  saveDetails() {
    const body = {
      description: this.editDescription(),
      dmNotes:     this.editDmNotes(),
    };
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId() ? { ...l, ...body } : l
        )
      } : c);
      this.editing.set(false);
    });
  }

  private expandPanel() {
    const contentH = this.detailContentRef.nativeElement.scrollHeight;
    const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
    this.panelHeight.set(`${contentH + btnH}px`);
    this.detailExpanded.set(true);
  }

  // ── Secrets ───────────────────────────────────────────────────────────────

  startAddingSecret() {
    this.newSecretContent.set('');
    this.addingSecret.set(true);
    requestAnimationFrame(() => this.expandPanel());
  }

  cancelAddingSecret() {
    this.addingSecret.set(false);
  }

  confirmAddSecret() {
    const content = this.newSecretContent().trim();
    if (!content) return;
    this.http.post<CampaignSecret>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets`,
      { instanceId: this.sublocationInstanceId(), entityType: 'Sublocation', content }
    ).subscribe(s => {
      this.campaign.update(c => c ? { ...c, secrets: [...c.secrets, s] } : c);
      this.addingSecret.set(false);
    });
  }

  toggleSecret(secret: CampaignSecret) {
    if (secret.isRevealed) {
      this.resealSecret(secret);
    } else {
      this.revealSecret(secret);
    }
  }

  private revealSecret(secret: CampaignSecret) {
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reveal`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === secret.id ? { ...s, isRevealed: true } : s
          )
        };
      });
    });
  }

  private resealSecret(secret: CampaignSecret) {
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reseal`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === secret.id ? { ...s, isRevealed: false } : s
          )
        };
      });
    });
  }

  // ── Shop items ────────────────────────────────────────────────────────────

  toggleScratch(item: ShopItem) {
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}/shop-items/${item.id}/scratch`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId()
            ? { ...l, shopItems: l.shopItems.map(s => s.id === item.id ? { ...s, isScratchedOff: !s.isScratchedOff } : s) }
            : l
        )
      } : c);
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!(e.target as HTMLElement).closest('.notes-dropdown')) {
      this.openDropdownId.set(null);
    }
  }

  toggleCurrencyDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.openDropdownId.update(id => id === 'currency' ? null : 'currency');
  }

  isDropdownOpen(id: string): boolean { return this.openDropdownId() === id; }

  setCurrency(value: string) {
    this.newShopItemCurrency.set(value);
    this.openDropdownId.set(null);
  }

  startAddingShopItem() {
    this.newShopItemName.set('');
    this.newShopItemAmount.set('');
    this.newShopItemCurrency.set('gp');
    this.addingShopItem.set(true);
  }

  cancelAddingShopItem() {
    this.addingShopItem.set(false);
    this.openDropdownId.set(null);
  }

  confirmAddShopItem() {
    const name   = this.newShopItemName().trim();
    if (!name) return;
    const amount   = String(this.newShopItemAmount() ?? '').trim();
    const currency = this.newShopItemCurrency();
    const price    = amount ? `${amount} ${currency}` : '';
    const body = { name, price, description: '' };
     this.http.post<ShopItem>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}/shop-items`,
      body
    ).subscribe(item => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId()
            ? { ...l, shopItems: [...(l.shopItems ?? []), item] }
            : l
        )
      } : c);
      this.addingShopItem.set(false);
    });
  }

  // ── Visibility ────────────────────────────────────────────────────────────

  toggleSublocationVisibility() {
    const subLoc = this.sublocation();
    if (!subLoc) return;
    const next = !subLoc.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c);
    });
  }

  // ── Panel expand ──────────────────────────────────────────────────────────

  toggleDetail() {
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    if (this.detailExpanded()) {
      this.panelHeight.set('220px');
      panel.style.marginLeft = '';
      panel.style.width = '';
      this.detailExpanded.set(false);
    } else {
      const contentH = this.detailContentRef.nativeElement.scrollHeight;
      const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
      this.panelHeight.set(`${contentH + btnH}px`);
      if (window.innerWidth < 768) {
        const left = panel.getBoundingClientRect().left;
        panel.style.marginLeft = `${-(left - 20)}px`;
        panel.style.width      = `${window.innerWidth - 40}px`;
      }
      this.detailExpanded.set(true);
    }
  }

  // ── Tilt ──────────────────────────────────────────────────────────────────

  private castTilts = new Map<string, number>();

  castTilt(instanceId: string): number {
    if (!this.castTilts.has(instanceId)) {
      this.castTilts.set(instanceId, Math.random() < 0.5 ? -2 : 2);
    }
    return this.castTilts.get(instanceId)!;
  }

  // ── Cast ──────────────────────────────────────────────────────────────────

  goToCast(cast: CampaignCastInstance) {
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', this.sublocationInstanceId(), 'cast', cast.instanceId]);
  }

  toggleCastVisibility(cast: CampaignCastInstance) {
    const next = !cast.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${cast.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === cast.instanceId ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c);
    });
  }

  toggleAllCastVisibility() {
    const subLoc  = this.sublocation();
    const next = !this.allCastsVisible();
    if (!subLoc) return;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${subLoc.instanceId}/casts/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.sublocationInstanceId === subLoc.instanceId ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c);
    });
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  exitToLibrary() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  goToTheParty() {
    this.router.navigate(['/campaign', this.campaignId(), 'the-party']);
  }

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goToLocation() {
    const locationId = this.sublocation()?.locationInstanceId;
    if (locationId) {
      this.router.navigate(['/campaign', this.campaignId(), 'locations', locationId]);
    }
  }

  goBack() {
    const locationInstanceId = this.sublocation()?.locationInstanceId;
    if (locationInstanceId) {
      this.router.navigate(['/campaign', this.campaignId(), 'locations', locationInstanceId]);
    } else {
      this.router.navigate(['/campaign', this.campaignId()]);
    }
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }

  // ── Import card handlers ──────────────────────────────────────────────────

  onCastAdded(instance: CampaignCastInstance) {
    this.campaign.update(c => {
      if (!c) return c;
      const casts = c.casts ?? [];
      if (casts.some(ca => ca.instanceId === instance.instanceId)) return c;
      const tmpIdx = casts.findIndex(
        ca => ca.instanceId.startsWith('tmp-') && ca.sourceCastId === instance.sourceCastId
      );
      if (tmpIdx !== -1) {
        const updated = [...casts];
        updated[tmpIdx] = instance;
        return { ...c, casts: updated };
      }
      return { ...c, casts: [...casts, instance] };
    });
  }

  onCastRemoved(instanceId: string) {
    this.campaign.update(c => c ? { ...c, casts: (c.casts ?? []).filter(ca => ca.instanceId !== instanceId) } : c);
  }
}
