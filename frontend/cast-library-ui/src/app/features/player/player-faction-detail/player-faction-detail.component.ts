import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, Injector, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignFactionInstance, FactionRelationship } from '../../../shared/models/faction.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignCastPlayerNotes, CampaignFactionPlayerNotes } from '../../../shared/models/campaign.model';
import { perceptionLabel } from '../../faction/faction-form/faction-form.component';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerFactionNotesComponent } from '../player-faction-notes/player-faction-notes.component';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { FactionRelationshipsSectionComponent } from '../../../shared/components/faction-relationships-section/faction-relationships-section.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';

@Component({
  selector: 'app-player-faction-detail',
  standalone: true,
  imports: [CommonModule, PlayerFactionNotesComponent, FactionCardComponent, FactionRelationshipsSectionComponent, SublocationCardComponent, CastCardComponent],
  templateUrl: './player-faction-detail.component.html',
  styleUrl: './player-faction-detail.component.scss',
})
export class PlayerFactionDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private shellSvc   = inject(PlayerCampaignShellService);
  private hub        = inject(CampaignHubService);
  private injector   = inject(Injector);

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;
  @ViewChild('expandBtn')     private expandBtnRef!: ElementRef<HTMLElement>;

  campaignId        = signal('');
  factionInstanceId = signal('');
  faction           = signal<CampaignFactionInstance | null>(null);
  detailExpanded    = signal(false);
  panelHeight       = signal('220px');

  factionRelationships = computed<FactionRelationship[]>(() =>
    this.faction()?.factionRelationships ?? []
  );

  visibleFactions = computed<CampaignFactionInstance[]>(() =>
    this.shellSvc.campaign()?.factions ?? []
  );

  factionSublocations = computed<CampaignSublocationInstance[]>(() => {
    const c = this.shellSvc.campaign();
    const f = this.faction();
    if (!c || !f) return [];
    return c.sublocations.filter(s => f.subLocationInstanceIds.includes(s.instanceId));
  });

  factionCast = computed<CampaignCastInstance[]>(() => {
    const c = this.shellSvc.campaign();
    const f = this.faction();
    if (!c || !f) return [];
    return c.casts.filter(ca => f.castInstanceIds.includes(ca.instanceId));
  });

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
        this.faction.update(fi => fi ? { ...fi, primarySublocationInstanceId: undefined } : fi);
      });
    } else {
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/sublocations/${sid}/primary`,
        {}
      ).subscribe(() => {
        this.faction.update(fi => fi ? { ...fi, primarySublocationInstanceId: sid } : fi);
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
        this.faction.update(fi => fi ? { ...fi, primaryCastInstanceId: undefined } : fi);
      });
    } else {
      this.http.patch(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${fid}/cast/${cid}/primary`,
        {}
      ).subscribe(() => {
        this.faction.update(fi => fi ? { ...fi, primaryCastInstanceId: cid } : fi);
      });
    }
  }

  private sublocationTiltMap = new Map<string, number>();
  private castTiltMap        = new Map<string, number>();
  castRatings                = signal<Map<string, number>>(new Map());

  // ── Player assessment (influence + perception sliders) ────────────────────
  playerNotes        = signal<CampaignFactionPlayerNotes | null>(null);
  notesText          = signal<string>('');
  notesSaving        = signal(false);
  private saveDebounce: ReturnType<typeof setTimeout> | null = null;

  assessmentInfluence  = computed(() => this.playerNotes()?.influence  ?? null);
  assessmentPerception = computed(() => this.playerNotes()?.perception ?? null);
  perceptionLabel = perceptionLabel;

  onInfluenceChange(value: number) {
    this.playerNotes.update(n => n ? { ...n, influence: value } : n);
    this.faction.update(f => f ? { ...f, influence: value } : f);
    this.scheduleSave();
  }

  onPerceptionChange(value: number) {
    this.playerNotes.update(n => n ? { ...n, perception: value } : n);
    this.faction.update(f => f ? { ...f, perception: value } : f);
    this.scheduleSave();
  }

  onNotesChange(text: string) {
    this.notesText.set(text);
    this.scheduleSave();
  }

  private scheduleSave() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.saveNotes(), 600);
  }

  private saveNotes() {
    const n = this.playerNotes();
    if (!n) return;
    this.notesSaving.set(true);
    this.http.put<CampaignFactionPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/faction-player-notes/${this.factionInstanceId()}`,
      { notes: this.notesText(), influence: n.influence, perception: n.perception }
    ).subscribe(updated => {
      this.playerNotes.set(updated);
      this.notesSaving.set(false);
    });
  }

  castRating(instanceId: string): number {
    return this.castRatings().get(instanceId) ?? 0;
  }

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

  constructor() {
    effect(() => {
      const event = this.hub.cardVisibilityChanged();
      if (!event || event.cardType !== 'faction') return;
      const factionId  = untracked(() => this.factionInstanceId());
      const campaignId = untracked(() => this.campaignId());
      if (!factionId || !campaignId || event.instanceId !== factionId) return;
      if (!event.isVisible) {
        this.transition.quickCover();
        this.router.navigate(['/player/campaign', campaignId]);
      }
    });
  }

  ngOnInit() {
    this.transition.hide();
    const id            = this.route.snapshot.paramMap.get('id')!;
    const factionInstId = this.route.snapshot.paramMap.get('factionInstanceId')!;
    this.campaignId.set(id);
    this.factionInstanceId.set(factionInstId);

    this.http.get<CampaignFactionInstance[]>(
      `${environment.apiUrl}/api/campaigns/${id}/factions/player`
    ).pipe(
      catchError(() => of([] as CampaignFactionInstance[]))
    ).subscribe(factions => {
      const f = factions.find(x => x.factionInstanceId === factionInstId) ?? null;
      this.faction.set(f);
      if (f) {
        this.shellSvc.setTitleContext({ pageType: 'player-faction-detail', campaignId: id, baseRoute: '/player/campaign', location: null });
        if (f.castInstanceIds.length) {
          const params = f.castInstanceIds.map(cid => `castInstanceId=${cid}`).join('&');
          this.http.get<CampaignCastPlayerNotes[]>(
            `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/by-cast-instances?${params}`
          ).pipe(catchError(() => of([] as CampaignCastPlayerNotes[])))
            .subscribe(notes => {
              const map = new Map<string, number>();
              notes.forEach(n => map.set(n.castInstanceId, n.rating));
              this.castRatings.set(map);
            });
        }
      }
    });

    this.http.get<CampaignFactionPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${id}/faction-player-notes/${factionInstId}`
    ).pipe(
      catchError(() => of<CampaignFactionPlayerNotes>({ id: '', campaignId: id, factionInstanceId: factionInstId, notes: '', influence: null, perception: null }))
    ).subscribe(n => {
      this.playerNotes.set(n);
      this.notesText.set(n.notes);
      // Sync initial influence to faction card glow
      if (n.influence != null) {
        this.faction.update(f => f ? { ...f, influence: n.influence! } : f);
      }
    });

    effect(() => {
      const e = this.hub.noteUpdated();
      if (e?.entityType === 'faction' && e.instanceId === this.factionInstanceId()) {
        this.loadPlayerNotes();
      }
    }, { injector: this.injector });

    effect(() => {
      const event = this.hub.factionInstanceUpdated();
      if (!event || event.factionInstanceId !== untracked(() => this.factionInstanceId())) return;
      const id            = untracked(() => this.campaignId());
      const factionInstId = untracked(() => this.factionInstanceId());
      this.http.get<CampaignFactionInstance[]>(
        `${environment.apiUrl}/api/campaigns/${id}/factions/player`
      ).pipe(
        catchError(() => of([] as CampaignFactionInstance[]))
      ).subscribe(factions => {
        const f = factions.find(x => x.factionInstanceId === factionInstId) ?? null;
        if (f) this.faction.set(f);
      });
    }, { injector: this.injector });
  }

  private loadPlayerNotes() {
    const id            = this.campaignId();
    const factionInstId = this.factionInstanceId();
    this.http.get<CampaignFactionPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${id}/faction-player-notes/${factionInstId}`
    ).pipe(
      catchError(() => of<CampaignFactionPlayerNotes>({ id: '', campaignId: id, factionInstanceId: factionInstId, notes: '', influence: null, perception: null }))
    ).subscribe(n => {
      this.playerNotes.set(n);
      this.notesText.set(n.notes);
      if (n.influence != null) {
        this.faction.update(f => f ? { ...f, influence: n.influence! } : f);
      }
      if (n.perception != null) {
        this.faction.update(f => f ? { ...f, perception: n.perception! } : f);
      }
    });
  }

  ngOnDestroy() {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
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
      this.panelHeight.set(`${contentH + btnH}px`);
      if (window.innerWidth < 768) {
        const left = panel.getBoundingClientRect().left;
        panel.style.marginLeft = `${-(left - 20)}px`;
        panel.style.width      = `${window.innerWidth - 40}px`;
      }
      this.detailExpanded.set(true);
    }
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }
}
