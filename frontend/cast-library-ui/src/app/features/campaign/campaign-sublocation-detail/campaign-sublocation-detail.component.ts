import { Component, OnInit, OnDestroy, signal, computed, inject, HostListener, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
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
import { FeatherIconComponent } from '../../../shared/components/feather-icon/feather-icon.component';
import { DetailPanelActionsComponent } from '../../../shared/components/detail-panel-actions/detail-panel-actions.component';
import { CardGridLayoutComponent } from '../../../shared/components/card-grid-layout/card-grid-layout.component';

@Component({
  selector: 'app-campaign-sublocation-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, SublocationCardComponent, CastCardComponent, LockIconComponent, FeatherIconComponent, DetailPanelActionsComponent, CardGridLayoutComponent],
  templateUrl: './campaign-sublocation-detail.component.html',
  styleUrl: './campaign-sublocation-detail.component.scss'
})
export class CampaignSublocationDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private auth       = inject(AuthService);
  private shellSvc   = inject(CampaignShellService);
  private transition = inject(PortalTransitionService);
  private hubSubscriptions: Subscription[] = [];

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  @Output() secretRevealed = new EventEmitter<CampaignSecret>();

  private _castImportCard = signal<PortalImportCardComponent | null>(null);
  @ViewChild('castImportCard') set castImportCardSetter(ref: PortalImportCardComponent | undefined) {
    this._castImportCard.set(ref ?? null);
  }
  get castImportCardRef(): PortalImportCardComponent | null {
    return this._castImportCard();
  }

  castDrawerOpen = signal(false);
  removableIds = new Set<string>();
  pendingIds = new Set<string>();

  private _castGridEl = signal<HTMLElement | null>(null);
  @ViewChild('castGrid') set castGridRef(ref: ElementRef<HTMLElement> | undefined) {
    this._castGridEl.set(ref?.nativeElement ?? null);
  }
  get castGridEl(): HTMLElement | null { return this._castGridEl(); }

  private paramsSub?: Subscription;
  campaignId         = signal('');
  sublocationInstanceId = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  detailExpanded     = signal(false);
  panelHeight        = signal('220px');

  // Edit mode
  editing         = signal(false);
  editName        = signal('');
  editDescription = signal('');
  editDmNotes     = signal('');
  imageFile       = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  // Add secret
  addingSecret     = signal(false);
  newSecretContent = signal('');

  // Add shop item
  addingShopItem       = signal(false);
  newShopItemName      = signal('');
  newShopItemAmount    = signal('');
  newShopItemCurrency  = signal('gp');

  // Edit existing shop item
  editingShopItemId    = signal<string | null>(null);
  editShopItemName     = signal('');
  editShopItemAmount   = signal('');
  editShopItemCurrency = signal('gp');

  // Currency dropdown
  readonly currencies      = ['cp', 'sp', 'ep', 'gp', 'pp'];
  openDropdownId           = signal<string | null>(null);

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

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
    this.hubSubscriptions.push(
      this.hub.secretRevealed$.subscribe(event => {
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
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionLocked$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            sublocations: (c.sublocations ?? []).map(l =>
              l.factionInstanceId === event.factionInstanceId
                ? { ...l, factionInstanceId: undefined, symbolPath: undefined }
                : l
            ),
            casts: (c.casts ?? []).map(ca => ({
              ...ca,
              factionSymbols: (ca.factionSymbols ?? []).filter(fs => fs.factionInstanceId !== event.factionInstanceId),
            })),
          };
        });
      })
    );

    this.hubSubscriptions.push(
      this.hub.shopItemDeleted$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (event.sublocationInstanceId !== this.sublocationInstanceId()) return;
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            sublocations: c.sublocations.map(l =>
              l.instanceId === this.sublocationInstanceId()
                ? { ...l, shopItems: l.shopItems.filter(s => s.id !== event.shopItemId) }
                : l
            ),
          };
        });
      })
    );
  }

  ngOnInit() {
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id    = params.get('id')!;
      const locId = params.get('sublocationInstanceId')!;
      this.campaignId.set(id);
      this.sublocationInstanceId.set(locId);
      this.campaign.set(null);
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
        .subscribe(c => {
          this.campaign.set(c);
          this.shellSvc.setCampaign(c);
          const subLoc    = c.sublocations.find(l => l.instanceId === locId);
          const parentLoc = subLoc ? c.locations.find(l => l.instanceId === subLoc.locationInstanceId) : null;
          if (subLoc) {
            this.shellSvc.setTitleContext({
              pageType: 'sublocation',
              campaignId: id,
              campaignName: c.name,
              baseRoute: '/campaign',
              location: parentLoc ?? null,
            }, '56px');
          }
        });
    });
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  // ── Edit details ─────────────────────────────────────────────────────────

  startEditing() {
    const subLoc = this.sublocation();
    if (!subLoc) return;
    this.editName.set(subLoc.name ?? '');
    this.editDescription.set(subLoc.description ?? '');
    this.editDmNotes.set(subLoc.dmNotes ?? '');
    const wasExpanded = this.detailExpanded();
    this.editing.set(true);
    requestAnimationFrame(() => this.expandPanel(!wasExpanded));
  }

  cancelEditing() {
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.editing.set(false);
  }

  saveDetails(syncLibrary = false) {
    const sublocationLibId = this.sublocation()?.sourceSublocationId;
    const body = {
      name:        this.editName(),
      description: this.editDescription(),
      dmNotes:     this.editDmNotes(),
      syncLibrary,
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
      this.shellSvc.setTitleContext({
        pageType: 'sublocation',
        campaignId: this.campaignId(),
        campaignName: this.campaign()?.name,
        baseRoute: '/campaign',
        location: this.parentLocation(),
      }, '56px');
      this.editing.set(false);
      const file = this.imageFile();
      if (file && sublocationLibId) {
        const formData = new FormData();
        formData.append('file', file);
        const prev = this.imagePreviewUrl();
        if (prev) URL.revokeObjectURL(prev);
        this.imageFile.set(null);
        this.imagePreviewUrl.set(null);
        this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/sublocations/${sublocationLibId}/image`, formData)
          .subscribe(res => {
            const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
            const updater = (c: CampaignDetail | null) => c ? {
              ...c,
              sublocations: c.sublocations.map(l =>
                l.instanceId === this.sublocationInstanceId() ? { ...l, imageUrl: cacheBustedUrl } : l
              )
            } : c;
            this.campaign.update(updater);
            this.shellSvc.updateCampaign(updater);
          });
      }
    });
  }

  onPortraitFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  saveToLibrary() {
    this.saveDetails(true);
  }

  private expandPanel(applyMobileWidth = false) {
    const panel    = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    const contentH = this.detailContentRef.nativeElement.scrollHeight;
    const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
    this.panelHeight.set(`${contentH + btnH}px`);
    if (applyMobileWidth && window.innerWidth < 768) {
      const left = panel.getBoundingClientRect().left;
      panel.style.marginLeft = `${-(left - 20)}px`;
      panel.style.width      = `${window.innerWidth - 40}px`;
    }
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

  deleteSecret(secret: CampaignSecret) {
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}`
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        secrets: c.secrets.filter(s => s.id !== secret.id)
      } : c);
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
      this.secretRevealed.emit(secret);
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

  deleteShopItem(itemId: string) {
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}/shop-items/${itemId}`
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId()
            ? { ...l, shopItems: l.shopItems.filter(s => s.id !== itemId) }
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

  toggleEditItemCurrencyDropdown(e: MouseEvent, itemId: string) {
    e.stopPropagation();
    const dropId = `edit-currency-${itemId}`;
    this.openDropdownId.update(id => id === dropId ? null : dropId);
  }

  isEditItemDropdownOpen(itemId: string): boolean {
    return this.openDropdownId() === `edit-currency-${itemId}`;
  }

  setEditItemCurrency(value: string, itemId: string) {
    this.editShopItemCurrency.set(value);
    this.openDropdownId.set(null);
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
    const body = { name, priceAmount: parseInt(amount) || 0, priceCurrencyType: currency, description: '' };
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

  startEditingShopItem(item: ShopItem) {
    this.editingShopItemId.set(item.id);
    this.editShopItemName.set(item.name);
    this.editShopItemAmount.set(String(item.priceAmount));
    this.editShopItemCurrency.set(item.priceCurrencyType);
    this.openDropdownId.set(null);
  }

  cancelEditingShopItem() {
    this.editingShopItemId.set(null);
    this.openDropdownId.set(null);
  }

  saveShopItem(item: ShopItem) {
    const name = this.editShopItemName().trim();
    if (!name) return;
    const body = {
      name,
      priceAmount: parseInt(this.editShopItemAmount()) || 0,
      priceCurrencyType: this.editShopItemCurrency(),
    };
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations/${this.sublocationInstanceId()}/shop-items/${item.id}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId()
            ? { ...l, shopItems: l.shopItems.map(s => s.id === item.id ? { ...s, ...body } : s) }
            : l
        )
      } : c);
      this.editingShopItemId.set(null);
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
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        sublocations: c.sublocations.map(l =>
          l.instanceId === this.sublocationInstanceId() ? { ...l, isVisibleToPlayers: next } : l
        )
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
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
      this.editing.set(false);
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

  onCardClick(instanceId: string) {
    const cast = this.sublocationCasts().find(c => c.instanceId === instanceId);
    if (cast) {
      this.goToCast(cast);
    }
  }

  goToCast(cast: CampaignCastInstance) {
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', this.sublocationInstanceId(), 'cast', cast.instanceId]);
  }

  toggleCastVisibility(cast: CampaignCastInstance) {
    const next = !cast.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${cast.instanceId}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === cast.instanceId ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
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
      const updater = (c: CampaignDetail | null) => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.sublocationInstanceId === subLoc.instanceId ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c;
      this.campaign.update(updater);
      this.shellSvc.updateCampaign(updater);
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
    const updater = (c: CampaignDetail | null) => {
      if (!c) return c;
      const casts = c.casts ?? [];
      const existingIdx = casts.findIndex(ca => ca.instanceId === instance.instanceId);
      if (existingIdx !== -1) {
        const updated = [...casts];
        updated[existingIdx] = instance;
        return { ...c, casts: updated };
      }
      const tmpIdx = casts.findIndex(
        ca => ca.instanceId.startsWith('tmp-') && ca.sourceCastId === instance.sourceCastId
      );
      if (tmpIdx !== -1) {
        const updated = [...casts];
        updated[tmpIdx] = instance;
        return { ...c, casts: updated };
      }
      return { ...c, casts: [...casts, instance] };
    };
    this.campaign.update(updater);
    this.shellSvc.updateCampaign(updater);
  }

  onCastRemoved(instanceId: string) {
    const updater = (c: CampaignDetail | null) => c ? { ...c, casts: (c.casts ?? []).filter(ca => ca.instanceId !== instanceId) } : c;
    this.campaign.update(updater);
    this.shellSvc.updateCampaign(updater);
  }
}
