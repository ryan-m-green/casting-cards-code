import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignFactionInstance, FactionRelationship } from '../../../shared/models/faction.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { FactionDetailPanelComponent } from './faction-detail-panel/faction-detail-panel.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { FactionRelationshipsSectionComponent, SaveRelationshipEvent } from '../../../shared/components/faction-relationships-section/faction-relationships-section.component';

@Component({
  selector: 'app-campaign-faction-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, FactionCardComponent, FactionDetailPanelComponent, SublocationCardComponent, CastCardComponent, FactionRelationshipsSectionComponent],
  templateUrl: './campaign-faction-detail.component.html',
  styleUrl: './campaign-faction-detail.component.scss',
})
export class CampaignFactionDetailComponent implements OnInit, OnDestroy {
  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private hub      = inject(CampaignHubService);
  private auth     = inject(AuthService);
  private shellSvc = inject(CampaignShellService);
  private hubSubscriptions: Subscription[] = [];

  constructor() {
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (event.cardType !== 'faction') return;
        this.campaign.update(c => c ? {
          ...c,
          factions: c.factions.map(f =>
            f.factionInstanceId === event.instanceId ? { ...f, isVisibleToPlayers: event.isVisible } : f
          ),
        } : c);
      })
    );
  }

  private paramsSub?: Subscription;
  campaignId        = signal('');
  factionInstanceId = signal('');
  campaign          = signal<CampaignDetail | null>(null);
  detailExpanded    = signal(false);
  panelHeight       = signal('220px');

  // Edit mode
  editing         = signal(false);
  editName        = signal('');
  editType        = signal('');
  editDescription = signal('');
  editHidden      = signal(false);
  editDmNotes     = signal('');
  editInfluence   = signal(0);
  editPerception  = signal(0);
  editSymbolPath  = signal<string | null>(null);

  // Membership drawers
  sublocationDrawerOpen = signal(false);
  castDrawerOpen        = signal(false);

  private sublocationTiltMap = new Map<string, number>();
  private castTiltMap        = new Map<string, number>();

  sublocationTiltFor(id: string): number {
    if (!this.sublocationTiltMap.has(id)) {
      this.sublocationTiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.sublocationTiltMap.get(id)!;
  }

  castTiltFor(id: string): number {
    if (!this.castTiltMap.has(id)) {
      this.castTiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.castTiltMap.get(id)!;
  }

  isDm = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);

  faction = computed<CampaignFactionInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.factions.find(f => f.factionInstanceId === this.factionInstanceId()) ?? null;
  });

  factionSublocations = computed<CampaignSublocationInstance[]>(() => {
    const c = this.campaign();
    const f = this.faction();
    if (!c || !f) return [];
    return c.sublocations.filter(s => f.subLocationInstanceIds.includes(s.instanceId));
  });

  factionCast = computed<CampaignCastInstance[]>(() => {
    const c = this.campaign();
    const f = this.faction();
    if (!c || !f) return [];
    return c.casts.filter(ca => f.castInstanceIds.includes(ca.instanceId));
  });

  /** Sublocation IDs claimed by any OTHER faction in this campaign. */
  claimedSubLocationIds = computed<Set<string>>(() => {
    const c = this.campaign();
    const f = this.faction();
    if (!c || !f) return new Set();
    const claimed = new Set<string>();
    for (const fi of c.factions) {
      if (fi.factionInstanceId === f.factionInstanceId) continue;
      for (const id of fi.subLocationInstanceIds) claimed.add(id);
    }
    return claimed;
  });

  isSublocationMember(instanceId: string): boolean {
    return this.faction()?.subLocationInstanceIds.includes(instanceId) ?? false;
  }

  isSublocationClaimed(instanceId: string): boolean {
    return this.claimedSubLocationIds().has(instanceId);
  }

  isCastMember(instanceId: string): boolean {
    return this.faction()?.castInstanceIds.includes(instanceId) ?? false;
  }

  isPrimarySublocation(instanceId: string): boolean {
    return this.faction()?.primarySublocationInstanceId === instanceId;
  }

  isPrimaryCast(instanceId: string): boolean {
    return this.faction()?.primaryCastInstanceId === instanceId;
  }

  hasPrimarySublocation(): boolean {
    return !!this.faction()?.primarySublocationInstanceId;
  }

  hasPrimaryCast(): boolean {
    return !!this.faction()?.primaryCastInstanceId;
  }

  setPrimarySublocation(sub: CampaignSublocationInstance): void {
    const f = this.faction();
    if (!f) return;
    const fid = f.factionInstanceId;
    const sid = sub.instanceId;
    const isAlreadyPrimary = this.isPrimarySublocation(sid);

    if (isAlreadyPrimary) {
      this.http.delete(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/sublocations/primary`
      ).subscribe(() => {
        this.campaign.update(c => c ? {
          ...c,
          factions: c.factions.map(fi => fi.factionInstanceId !== fid ? fi : {
            ...fi,
            primarySublocationInstanceId: undefined,
          }),
        } : c);
      });
    } else {
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/sublocations/${sid}/primary`,
        {}
      ).subscribe(() => {
        this.campaign.update(c => c ? {
          ...c,
          factions: c.factions.map(fi => fi.factionInstanceId !== fid ? fi : {
            ...fi,
            primarySublocationInstanceId: sid,
          }),
        } : c);
      });
    }
  }

  setPrimaryCast(cast: CampaignCastInstance): void {
    const f = this.faction();
    if (!f) return;
    const fid = f.factionInstanceId;
    const cid = cast.instanceId;
    const isAlreadyPrimary = this.isPrimaryCast(cid);

    if (isAlreadyPrimary) {
      this.http.delete(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/cast/primary`
      ).subscribe(() => {
        this.campaign.update(c => c ? {
          ...c,
          factions: c.factions.map(fi => fi.factionInstanceId !== fid ? fi : {
            ...fi,
            primaryCastInstanceId: undefined,
          }),
        } : c);
      });
    } else {
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/cast/${cid}/primary`,
        {}
      ).subscribe(() => {
        this.campaign.update(c => c ? {
          ...c,
          factions: c.factions.map(fi => fi.factionInstanceId !== fid ? fi : {
            ...fi,
            primaryCastInstanceId: cid,
          }),
        } : c);
      });
    }
  }

  toggleSublocation(sub: CampaignSublocationInstance) {
    const f = this.faction();
    if (!f) return;
    if (this.isSublocationClaimed(sub.instanceId)) return;
    const fid = f.factionInstanceId;
    const sid = sub.instanceId;
    const isMember = this.isSublocationMember(sid);
    const url = `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/sublocations/${sid}`;
    const req = isMember ? this.http.delete(url) : this.http.post(url, {});
    req.subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(fi => fi.factionInstanceId !== fid ? fi : {
          ...fi,
          subLocationInstanceIds: isMember
            ? fi.subLocationInstanceIds.filter((id: string) => id !== sid)
            : [...fi.subLocationInstanceIds, sid],
          primarySublocationInstanceId: isMember && fi.primarySublocationInstanceId === sid
            ? undefined
            : fi.primarySublocationInstanceId,
        }),
      } : c);
    });
  }

  toggleCastMember(cast: CampaignCastInstance) {
    const f = this.faction();
    if (!f) return;
    const fid = f.factionInstanceId;
    const cid = cast.instanceId;
    const isMember = this.isCastMember(cid);
    const url = `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/cast/${cid}`;
    const req = isMember ? this.http.delete(url) : this.http.post(url, {});
    req.subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(fi => fi.factionInstanceId !== fid ? fi : {
          ...fi,
          castInstanceIds: isMember
            ? fi.castInstanceIds.filter((id: string) => id !== cid)
            : [...fi.castInstanceIds, cid],
          primaryCastInstanceId: isMember && fi.primaryCastInstanceId === cid
            ? undefined
            : fi.primaryCastInstanceId,
        }),
      } : c);
    });
  }

  // ── Relationship helpers ────────────────────────────────────────────────

  factionRelationships = computed<FactionRelationship[]>(() => {
    return this.faction()?.factionRelationships ?? [];
  });

  otherFactions = computed<CampaignFactionInstance[]>(() => {
    const c = this.campaign();
    const f = this.faction();
    if (!c || !f) return [];
    return c.factions.filter(fi => fi.factionInstanceId !== f.factionInstanceId);
  });

  saveRelationship(event: SaveRelationshipEvent) {
    const f = this.faction();
    if (!f) return;
    const body = {
      factionInstanceIdA: f.factionInstanceId,
      factionInstanceIdB: event.factionInstanceIdB,
      relationshipType:   event.relationshipType,
      strength:           event.strength,
    };
    this.http.post<FactionRelationship>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${f.factionInstanceId}/relationships`,
      body
    ).subscribe(rel => {
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(fi => fi.factionInstanceId !== f.factionInstanceId ? fi : {
          ...fi,
          factionRelationships: [...(fi.factionRelationships ?? []), rel],
        }),
      } : c);
    });
  }

  removeRelationship(rel: FactionRelationship) {
    const f = this.faction();
    if (!f) return;
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${f.factionInstanceId}/relationships/${rel.id}`
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(fi => fi.factionInstanceId !== f.factionInstanceId ? fi : {
          ...fi,
          factionRelationships: fi.factionRelationships.filter(r => r.id !== rel.id),
        }),
      } : c);
    });
  }

  ngOnInit() {
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id                = params.get('id')!;
      const factionInstanceId = params.get('factionInstanceId')!;
      this.campaignId.set(id);
      this.factionInstanceId.set(factionInstanceId);
      this.campaign.set(null);
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
        .subscribe(c => {
          this.campaign.set(c);
          const faction = c.factions.find(f => f.factionInstanceId === factionInstanceId);
          this.shellSvc.setTitleContext({
            pageType: 'gm-faction-detail',
            campaignId: id,
            baseRoute: '/campaign',
            location: null,
            faction: faction ? { instanceId: faction.factionInstanceId, name: faction.name ?? '' } : null
          }, '56px');
        });
    });
  }

  ngOnDestroy() {
    this.paramsSub?.unsubscribe();
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  goToFactions() {
    this.router.navigate(['/campaign', this.campaignId(), 'factions']);
  }

  startEditing() {
    const f = this.faction();
    if (!f) return;
    this.editName.set(f.name ?? '');
    this.editType.set(f.type ?? '');
    this.editDescription.set(f.description ?? '');
    this.editHidden.set(f.hidden ?? false);
    this.editDmNotes.set(f.dmNotes ?? '');
    this.editInfluence.set(f.influence ?? 0);
    this.editPerception.set(f.perception ?? 0);
    this.editSymbolPath.set(f.symbolPath ?? null);
    this.editing.set(true);
    if (!this.detailExpanded()) {
      requestAnimationFrame(() => this.expandPanel());
    }
  }

  private expandPanel() {
    const panel    = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    const contentH = this.detailContentRef.nativeElement.scrollHeight;
    const btnH     = this.expandBtnRef.nativeElement.offsetHeight;
    this.panelHeight.set(`${contentH + btnH + 268}px`);
    if (window.innerWidth < 768) {
      const left = panel.getBoundingClientRect().left;
      panel.style.marginLeft = `${-(left - 20)}px`;
      panel.style.width      = `${window.innerWidth - 40}px`;
    }
    this.detailExpanded.set(true);
  }

  private collapsePanel() {
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    panel.style.marginLeft = '';
    panel.style.width = '';
    this.panelHeight.set('220px');
    this.detailExpanded.set(false);
  }

  cancelEditing() {
    this.editing.set(false);
    this.collapsePanel();
  }

  saveDetails(syncLibrary = false) {
    const body = {
      name:        this.editName(),
      type:        this.editType(),
      description: this.editDescription(),
      hidden:      this.editHidden(),
      dmNotes:     this.editDmNotes(),
      influence:   this.editInfluence(),
      perception:  this.editPerception(),
      symbolPath:  this.editSymbolPath() ?? undefined,
      syncLibrary,
    };
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${this.factionInstanceId()}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(f =>
          f.factionInstanceId === this.factionInstanceId() ? { ...f, ...body } : f
        ),
      } : c);
      const faction = this.faction();
      this.shellSvc.setTitleContext({
        pageType: 'gm-faction-detail',
        campaignId: this.campaignId(),
        baseRoute: '/campaign',
        location: null,
        faction: faction ? { instanceId: faction.factionInstanceId, name: faction.name ?? '' } : null
      }, '56px');
      this.editing.set(false);
      this.collapsePanel();
    });
  }

  saveToLibrary() {
    this.saveDetails(true);
  }

  toggleFactionVisibility() {
    const f = this.faction();
    if (!f) return;
    const next = !f.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${this.factionInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        factions: c.factions.map(fi =>
          fi.factionInstanceId === this.factionInstanceId()
            ? { ...fi, isVisibleToPlayers: next }
            : fi
        ),
      } : c);
    });
  }

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
      this.panelHeight.set(`${contentH + btnH + 60}px`);
      if (window.innerWidth < 768) {
        const left = panel.getBoundingClientRect().left;
        panel.style.marginLeft = `${-(left - 20)}px`;
        panel.style.width      = `${window.innerWidth - 40}px`;
      }
      this.detailExpanded.set(true);
    }
  }
}
