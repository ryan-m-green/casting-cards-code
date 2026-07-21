import { Component, OnInit, OnDestroy, signal, computed, inject, untracked, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CastingCardPlayerComponent } from '../../../shared/components/casting-card-player/casting-card-player.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { PlayerSecretsDrawerComponent } from '../../../shared/components/player-secrets-drawer/player-secrets-drawer.component';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import {
  PlayerCardWithDetails,
  PlayerCardCondition,
  DiscoveredCastResponse,
  QuestingCompanion,
} from '../../../shared/models/player-card.model';

@Component({
  selector: 'app-player-the-party',
  standalone: true,
  imports: [CommonModule, CastingCardPlayerComponent, CastCardComponent, PlayerSecretsDrawerComponent],
  templateUrl: './player-the-party.component.html',
  styleUrl: './player-the-party.component.scss',
})
export class PlayerThePartyComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private hub        = inject(CampaignHubService);
  private shell      = inject(PlayerCampaignShellComponent);
  private shellService = inject(PlayerCampaignShellService);
  auth               = inject(AuthService);

  campaignId   = signal('');
  playerCardId = signal('');
  playerCard   = signal<PlayerCardWithDetails | null>(null);

  portalColor = signal(this.transition.spineColor);

  // ── View Secrets drawer ───────────────────────────────────────────────────────
  @ViewChild(PlayerSecretsDrawerComponent) secretsDrawer: PlayerSecretsDrawerComponent | null = null;

  // ── Cast ─────────────────────────────────────────────────────────────────
  discoveredCast  = signal<DiscoveredCastResponse | null>(null);

  // ── Questing Companions ───────────────────────────────────────────────────
  companionRatings = signal<Map<string, number>>(new Map());
  private companionTiltMap = new Map<string, number>();
  private partyMemberTiltMap = new Map<string, number>();
  private hubSubscriptions: Subscription[] = [];

  companionTiltFor(instanceId: string): number {
    if (!this.companionTiltMap.has(instanceId)) {
      this.companionTiltMap.set(instanceId, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.companionTiltMap.get(instanceId)!;
  }

  companionRating(instanceId: string): number {
    return this.companionRatings().get(instanceId) ?? 0;
  }

  partyMemberTiltFor(id: string): number {
    if (!this.partyMemberTiltMap.has(id)) {
      this.partyMemberTiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.partyMemberTiltMap.get(id)!;
  }

  goToCompanion(companion: QuestingCompanion) {
    const partySublocationId = this.discoveredCast()?.partyAnchorSublocationInstanceId;
    if (!partySublocationId) return;
    this.transition.quickCover();
    this.router.navigate(
      ['/player/campaign', this.campaignId(), 'sublocations', partySublocationId, 'cast', companion.instanceId],
      { queryParams: { from: 'party' } }
    );
  }

  castAsCompanion(companion: QuestingCompanion): any { return companion; }

  companionFactionSymbols(instanceId: string): { factionInstanceId: string; symbolPath: string }[] {
    return this.shellService.campaign()?.casts.find(c => c.instanceId === instanceId)?.factionSymbols ?? [];
  }

  filteredParty = computed(() => {
    const cast = this.discoveredCast();
    if (!cast) return [];
    
    const myCard = this.playerCard();
    const otherPartyMembers = cast.partyCards.filter(p => p.id !== this.playerCardId());
    
    // Return my card first, then other party members
    return myCard ? [myCard, ...otherPartyMembers] : otherPartyMembers;
  });

  constructor() {
    this.hubSubscriptions.push(
      this.hub.conditionAssigned$.subscribe(event => {
        if (!event) return;
        const myCardId = untracked(() => this.playerCardId());
        if (event.playerCardId === myCardId) {
          // Skip - conditions for current player are now handled in player-character component
          return;
        } else {
          this.discoveredCast.update(cast => {
            if (!cast) return cast;
            return {
              ...cast,
              partyCards: cast.partyCards.map(p =>
                p.id === event.playerCardId
                  ? { ...p, conditions: [...p.conditions, { id: event.conditionId, playerCardId: event.playerCardId, conditionName: event.conditionName, assignedAt: event.assignedAt }] }
                  : p
              ),
            };
          });
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.conditionRemoved$.subscribe(event => {
        if (!event) return;
        const myCardId = untracked(() => this.playerCardId());
        if (event.playerCardId === myCardId) {
          // Skip - conditions for current player are now handled in player-character component
          return;
        } else {
          this.discoveredCast.update(cast => {
            if (!cast) return cast;
            return {
              ...cast,
              partyCards: cast.partyCards.map(p =>
                p.id === event.playerCardId
                  ? { ...p, conditions: p.conditions.filter(c => c.id !== event.conditionId) }
                  : p
              ),
            };
          });
        }
      })
    );

    this.hubSubscriptions.push(
      this.hub.castTravelled$.subscribe(event => {
        if (!event) return;
        const partySubId = untracked(() => this.discoveredCast()?.partyAnchorSublocationInstanceId);
        if (!partySubId) return;

        const leavingParty  = event.fromSublocationInstanceId === partySubId;
        const arrivingParty = event.toSublocationInstanceId   === partySubId;

        if (leavingParty) {
          this.discoveredCast.update(cast => cast ? {
            ...cast,
            questingCompanions: cast.questingCompanions.filter(c => c.instanceId !== event.castInstanceId),
          } : cast);
        }

        if (arrivingParty) {
          this.http.get<any>(
            `${environment.apiUrl}/api/campaigns/${event.campaignId}/casts/${event.castInstanceId}`
          ).subscribe(cast => {
            this.discoveredCast.update(d => {
              if (!d) return d;
              const already = d.questingCompanions.some(c => c.instanceId === cast.instanceId);
              if (already) return d;
              return { ...d, questingCompanions: [...d.questingCompanions, cast] };
            });
          });
        }
      })
    );
  }

  ngOnInit() {
    this.transition.hide();
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.shellService.setTitleContext({ pageType: 'player-party', campaignId: id, campaignName: this.shellService.campaign()?.name, baseRoute: '/player/campaign', location: null });

    this.loadPlayerCardId(id);
    this.loadCast(id);
  }

  ngOnDestroy() {
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadPlayerCardId(id: string) {
    this.http.get<PlayerCardWithDetails>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/mine`
    ).subscribe({
      next: card => {
        this.playerCardId.set(card.id);
        this.playerCard.set(card);
      },
      error: () => {
        this.playerCardId.set('');
        this.playerCard.set(null);
      },
    });
  }

  // ── Cast ─────────────────────────────────────────────────────────────────────
  private loadCast(id: string) {
    this.http.get<{ partyCards: PlayerCardWithDetails[]; questingCompanions: QuestingCompanion[]; partyAnchorSublocationInstanceId: string | null }>(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/party`
    ).subscribe(data => {
      this.discoveredCast.set({
        partyCards:                          data.partyCards,
        questingCompanions:                  data.questingCompanions,
        people:                              [],
        locations:                           [],
        sublocations:                        [],
        partyAnchorSublocationInstanceId:    data.partyAnchorSublocationInstanceId,
      });

      if (data.questingCompanions.length) {
        const params = data.questingCompanions.map(c => `castInstanceId=${c.instanceId}`).join('&');
        this.http.get<CampaignCastPlayerNotes[]>(
          `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/by-cast-instances?${params}`
        ).subscribe(notes => {
          const map = new Map<string, number>();
          notes.forEach(n => map.set(n.castInstanceId, n.rating));
          this.companionRatings.set(map);
        });
      }
    });
  }

  // ── View Secrets drawer ───────────────────────────────────────────────────────
  viewSecrets(member: PlayerCardWithDetails) {
    this.secretsDrawer?.open(member, this.campaignId());
  }

  // ── Navigation ───────────────────────────────────────────────────────────────
  goToCharacter() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
  }
}
