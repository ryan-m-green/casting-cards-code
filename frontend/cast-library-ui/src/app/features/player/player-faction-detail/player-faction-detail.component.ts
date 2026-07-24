import { Component, OnInit, OnDestroy, signal, computed, inject, ViewChild, ElementRef, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of, Subscription } from 'rxjs';
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
import { FactionRelationshipsSectionComponent, SaveRelationshipEvent } from '../../../shared/components/faction-relationships-section/faction-relationships-section.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { SectionLabelComponent } from '../../../shared/components/section-label/section-label.component';
import { DetailPanelActionsComponent } from '../../../shared/components/detail-panel-actions/detail-panel-actions.component';

@Component({
  selector: 'app-player-faction-detail',
  standalone: true,
  imports: [CommonModule, PlayerFactionNotesComponent, FactionCardComponent, FactionRelationshipsSectionComponent, SublocationCardComponent, CastCardComponent, SectionLabelComponent, DetailPanelActionsComponent],
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

  @ViewChild('detailContent') private detailContentRef!: ElementRef<HTMLElement>;

  campaignId        = signal('');
  factionInstanceId = signal('');
  faction           = signal<CampaignFactionInstance | null>(null);
  detailExpanded    = signal(false);

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
  private paramsSub?: Subscription;
  private hubSubscriptions: Subscription[] = [];
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
    const saveStartTime = Date.now();
    
    this.http.put<CampaignFactionPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/faction-player-notes/${this.factionInstanceId()}`,
      { notes: this.notesText(), influence: n.influence, perception: n.perception }
    ).subscribe(updated => {
      this.playerNotes.set(updated);
      
      // Ensure saving label shows for at least 1 second
      const elapsed = Date.now() - saveStartTime;
      const remainingTime = Math.max(0, 1000 - elapsed);
      
      setTimeout(() => {
        this.notesSaving.set(false);
      }, remainingTime);
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
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.cardType !== 'faction') return;
        const factionId  = untracked(() => this.factionInstanceId());
        const campaignId = untracked(() => this.campaignId());
        if (!factionId || !campaignId || event.instanceId !== factionId) return;
        if (!event.isVisible) {
          this.transition.quickCover();
          this.router.navigate(['/player/campaign', campaignId]);
        }
      })
    );
  }

  ngOnInit() {
    this.transition.hide();
    this.paramsSub = this.route.paramMap.subscribe(params => {
      const id            = params.get('id')!;
      const factionInstId = params.get('factionInstanceId')!;
      this.campaignId.set(id);
      this.factionInstanceId.set(factionInstId);
      this.faction.set(null);
      this.playerNotes.set(null);
      this.castRatings.set(new Map());

      this.http.get<CampaignFactionInstance[]>(
        `${environment.apiUrl}/api/campaigns/${id}/factions/player`
      ).pipe(
        catchError(() => of([] as CampaignFactionInstance[]))
      ).subscribe(factions => {
        const f = factions.find(x => x.factionInstanceId === factionInstId) ?? null;
        this.faction.set(f);
        if (f) {
          this.shellSvc.setTitleContext({
            pageType: 'player-faction-detail',
            campaignId: id,
            campaignName: this.shellSvc.campaign()?.name,
            baseRoute: '/player/campaign',
            location: null,
            faction: { instanceId: f.factionInstanceId, name: f.name ?? '' }
          });
          if (f.castInstanceIds.length) {
            const queryParams = f.castInstanceIds.map(cid => `castInstanceId=${cid}`).join('&');
            this.http.get<CampaignCastPlayerNotes[]>(
              `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/by-cast-instances?${queryParams}`
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
    });

    this.hubSubscriptions.push(
      this.hub.noteUpdated$.subscribe(e => {
        if (e?.entityType === 'faction' && e.instanceId === this.factionInstanceId()) {
          this.loadPlayerNotes();
        }
      })
    );

    // Subscribe to session ended event to reload notes
    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(event => {
        if (event) {
          // Add delay to allow backend to complete note deletion
          setTimeout(() => this.loadPlayerNotes(), 500);
        }
      })
    );

    // Subscribe to session cancelled event to reload notes
    this.hubSubscriptions.push(
      this.hub.sessionCancelled$.subscribe(event => {
        if (event) {
          // Add delay to allow backend to complete note deletion
          setTimeout(() => this.loadPlayerNotes(), 500);
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionInstanceUpdated$.subscribe(event => {
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
      })
    );

    this.hubSubscriptions.push(
      this.hub.factionSymbolAssigned$.subscribe(event => {
        if (!event || event.campaignId !== untracked(() => this.campaignId())) {
          return;
        }
        const id            = untracked(() => this.campaignId());
        const factionInstId = untracked(() => this.factionInstanceId());
        this.http.get<CampaignFactionInstance[]>(
          `${environment.apiUrl}/api/campaigns/${id}/factions/player`
        ).pipe(
          catchError(() => of([] as CampaignFactionInstance[]))
        ).subscribe(factions => {
          const f = factions.find(x => x.factionInstanceId === factionInstId) ?? null;
          if (f) {
            this.faction.set(f);
          }
        });
      })
    );
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
    this.paramsSub?.unsubscribe();
  }

  toggleDetail() {
    const panel = this.detailContentRef.nativeElement.parentElement as HTMLElement;
    if (this.detailExpanded()) {
      panel.style.marginLeft = '';
      panel.style.width = '';
      this.detailExpanded.set(false);
    } else {
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

  saveRelationship(event: SaveRelationshipEvent) {
    const f = this.faction();
    if (!f) return;
    const body = {
      factionInstanceIdA: f.factionInstanceId,
      factionInstanceIdB: event.factionInstanceIdB,
      relationshipType: event.relationshipType,
      strength: event.strength,
    };
    this.http.post<FactionRelationship>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/${f.factionInstanceId}/relationships`,
      body
    ).subscribe(rel => {
      this.faction.update(fi => fi ? {
        ...fi,
        factionRelationships: [...(fi.factionRelationships ?? []), rel],
      } : fi);
    });
  }
}
