import { Component, OnInit, OnDestroy, signal, computed, inject, untracked } from '@angular/core';
import { RouterOutlet, RouterLink, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { catchError, filter } from 'rxjs/operators';
import { EMPTY, firstValueFrom, Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';
import { CardRevealBadgeComponent } from '../../../shared/components/card-reveal-badge/card-reveal-badge.component';
import {
  CardRevealOverlayComponent,
  CardRevealOverlayData,
} from '../../../shared/components/card-reveal-overlay/card-reveal-overlay.component';
import { EventCardComponent } from '../../../shared/components/event-card/event-card.component';
import { VoidTitleSegmentsComponent } from '../../../shared/components/void-title-segments/void-title-segments.component';
import { CurrencyDisplayComponent, CurrencyLine } from '../../../shared/components/currency-display/currency-display.component';
import { VoidNavDrawerComponent } from '../../../shared/components/void-nav-drawer/void-nav-drawer.component';
import { QuicknotesComponent } from '../../../shared/components/quicknotes/quicknotes.component';

@Component({
  selector: 'app-player-campaign-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, TimeOfDayBarComponent, CardRevealBadgeComponent, CardRevealOverlayComponent, EventCardComponent, CurrencyDisplayComponent, VoidNavDrawerComponent, VoidTitleSegmentsComponent, QuicknotesComponent],
  templateUrl: './player-campaign-shell.component.html',
  styleUrl: './player-campaign-shell.component.scss',
})
export class PlayerCampaignShellComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private auth       = inject(AuthService);
  private transition = inject(PortalTransitionService);
  shellSvc           = inject(PlayerCampaignShellService);

  campaignId        = signal('');
  campaign          = signal<CampaignDetail | null>(null);
  timeOfDay         = computed(() => this.campaign()?.timeOfDay ?? null);
  isDm              = computed(() => this.campaign()?.dmUserId === this.auth.currentUser()?.id);
  overlayData       = signal<CardRevealOverlayData | null>(null);
  wizardSecretContent   = signal<string | null>(null);
  wizardSecretRecipient = signal<string>('');

  // ── Event card notification ───────────────────────────────────────────────
  eventCardTitle = signal<string | null>(null);
  private pendingOverlayData: CardRevealOverlayData | null = null;

  // ── Card reveal overlay ──────────────────────────────────────────────────────
  showOverlay       = signal(false);
  cardRevealQueue   = signal<CardRevealOverlayData[]>([]);

  // ── Purse popover ──────────────────────────────────────────────────────────
  showPurse        = signal(false);
  purse            = signal<CurrencyLine[]>([]);

  // ── Currency card overlay ─────────────────────────────────────────────────
  showGoldCard     = signal(false);
  goldCardAmount   = signal(0);
  goldCardCurrency = signal('gp');
  goldCardNote     = signal<string | null>(null);

  private hubSubscriptions: Subscription[] = [];

  constructor() {
    // Show overlay when a card is newly unlocked
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (!event.isVisible) return;

        // Re-fetch campaign data to get the newly visible card
        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(async c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
            const data = await this.buildOverlayFromVisibilityEvent(c, event.instanceId, event.cardType, event.title, event.body);
            if (data) {
              if (this.eventCardTitle() !== null) {
                this.pendingOverlayData = data;
              } else {
                this.cardRevealQueue.update(queue => [...queue, data]);
              }
            }
          });
      })
    );

    // Re-fetch campaign when a card is hidden so the nav drawer removes the node
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (event.isVisible) return;

        // Remove the card from the reveal queue by matching instanceId (or eventId for campaign-events)
        this.cardRevealQueue.update(queue => queue.filter(item => {
          if (event.cardType === 'campaign-event') {
            return !(item.cardType === event.cardType && item.eventId === event.instanceId);
          }
          return !(item.cardType === event.cardType && item.instanceId === event.instanceId);
        }));

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Show overlay when a faction is unlocked; remove it when locked
    this.hubSubscriptions.push(
      this.hub.cardVisibilityChanged$.subscribe(event => {
        if (!event || event.cardType !== 'faction' || event.campaignId !== this.campaignId()) return;

        if (event.isVisible) {
          this.http
            .get<CampaignFactionInstance[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/factions/player`)
            .subscribe(factions => {
              const faction = factions.find(f => f.factionInstanceId === event.instanceId);
              if (faction) {
                const data: CardRevealOverlayData = {
                  cardType:   'faction',
                  name:       faction.name,
                  descriptor: faction.type ?? '',
                  symbolPath: faction.symbolPath ?? '',
                };
                if (this.eventCardTitle() !== null) {
                  this.pendingOverlayData = data;
                } else {
                  this.overlayData.set(data);
                }
              }
            });
        }
      })
    );

    // Re-fetch campaign when a faction is removed (clears faction symbols from sublocation/cast cards)
    this.hubSubscriptions.push(
      this.hub.factionRemoved$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Re-fetch campaign when a faction is locked (clears faction symbols from sublocation/cast cards)
    this.hubSubscriptions.push(
      this.hub.factionLocked$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Re-fetch campaign when a shop item is updated (refreshes sublocation shop items for players)
    this.hubSubscriptions.push(
      this.hub.shopItemUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Update a shop item's isScratchedOff flag in-place when the DM toggles the scratch state
    this.hubSubscriptions.push(
      this.hub.shopItemScratchToggled$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const update = (c: CampaignDetail): CampaignDetail => ({
          ...c,
          sublocations: c.sublocations.map((s: any) =>
            s.instanceId !== event.sublocationInstanceId ? s : {
              ...s,
              shopItems: (s.shopItems ?? []).map((item: any) =>
                item.id !== event.shopItemId ? item : { ...item, isScratchedOff: event.isScratchedOff }
              ),
            }
          ),
        });

        this.campaign.update(c => c ? update(c) : c);
        this.shellSvc.setCampaign(update(untracked(() => this.shellSvc.campaign())!));
      })
    );

    // Re-fetch campaign when a cast instance is updated (refreshes cast detail panels)
    this.hubSubscriptions.push(
      this.hub.castInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Re-fetch campaign when a location instance is updated (refreshes location detail panels)
    this.hubSubscriptions.push(
      this.hub.locationInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Re-fetch campaign when a sublocation instance is updated (refreshes sublocation detail panels)
    this.hubSubscriptions.push(
      this.hub.sublocationInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Re-fetch campaign when a faction instance is updated (refreshes faction cards in nav/shell)
    this.hubSubscriptions.push(
      this.hub.factionInstanceUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Update event card content when a storyline event is updated
    this.hubSubscriptions.push(
      this.hub.storylineEventUpdated$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        // If the event card is currently displayed, update its content
        if (this.eventCardTitle() !== null) {
          // Update the overlay data with the new content
          this.overlayData.set({
            cardType: 'campaign-event',
            name: event.title,
            descriptor: 'Event • Game Master',
            content: event.body,
            imageUrl: event.imageUrl ?? undefined,
            eventId: event.eventId,
            portalColor: this.campaign()?.spineColor ?? '#6e28d0',
          });
        }

        // Re-fetch events list to ensure it's up to date
        this.http
          .get<{ id: string; title: string; body: string; imageUrl?: string }[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/events/player`)
          .subscribe(events => {
            // Update campaign events in campaign detail
            this.http
              .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
              .subscribe(c => {
                this.campaign.set(c);
                this.shellSvc.setCampaign(c);
              });
          });
      })
    );

    // Re-fetch campaign when a bulk card visibility change occurs (e.g. unlock all casts)
    this.hubSubscriptions.push(
      this.hub.bulkCardVisibilityChanged$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        if (!event.isVisible) return;

        this.http
          .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => {
            this.campaign.set(c);
            this.shellSvc.setCampaign(c);
          });
      })
    );

    // Show overlay when a secret is revealed (enriched with content)
    this.hubSubscriptions.push(
      this.hub.secretRevealed$.subscribe(async event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const c = untracked(() => this.campaign());
        if (!c) return;

        const instanceId = event.castInstanceId ?? event.locationInstanceId ?? event.sublocationInstanceId;
        if (!instanceId) return;

        const cardType = event.castInstanceId ? 'cast'
                       : event.locationInstanceId ? 'location'
                       : 'sublocation';

        const data = await this.buildOverlayFromVisibilityEvent(c, instanceId, cardType);
        if (data) {
          this.overlayData.set({ ...data, secretContent: event.secretContent });
        }
      })
    );

    // Show wizard overlay when the DM delivers a personal secret to this player
    this.hubSubscriptions.push(
      this.hub.secretDelivered$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;
        const myId = untracked(() => this.auth.currentUser()?.id);
        if (!myId || event.playerUserId !== myId) return;
        this.wizardSecretContent.set(event.content);
        this.wizardSecretRecipient.set(untracked(() => this.auth.currentUser()?.displayName ?? ''));
      })
    );

    // Show card reveal overlay when a party member shares a secret
    this.hubSubscriptions.push(
      this.hub.secretShared$.subscribe(event => {
        if (!event) return;
        this.overlayData.set({
          cardType:      'player',
          name:          event.playerName,
          descriptor:    event.playerRaceClass,
          imageUrl:      event.playerImageUrl,
          secretContent: event.secretContent,
        });
      })
    );

    // Show currency card when the DM awards gold to this player or the party
    this.hubSubscriptions.push(
      this.hub.goldAwarded$.subscribe(queue => {
        if (!queue.length) return;
        const myId = untracked(() => this.auth.currentUser()?.id);
        const mine = queue.find((e: any) =>
          e.campaignId === this.campaignId() &&
          (e.playerUserId === null || e.playerUserId === myId)
        );
        if (!mine) return;
        this.goldCardAmount.set(mine.amount);
        this.goldCardCurrency.set(mine.currency);
        this.goldCardNote.set(mine.note);
        this.showGoldCard.set(true);
        // Update purse balance for the awarded currency type
        this.purse.update(lines => {
          const existing = lines.find(l => l.type === mine.currency);
          if (existing) {
            return lines.map(l => l.type === mine.currency ? { ...l, amount: l.amount + mine.amount } : l);
          }
          return [...lines, { type: mine.currency, amount: mine.amount }];
        });
      })
    );

    // Update cast's sublocation in campaign when a cast travels — keeps the nav drawer in sync
    this.hubSubscriptions.push(
      this.hub.castTravelled$.subscribe(event => {
        if (!event || event.campaignId !== this.campaignId()) return;

        const update = (c: CampaignDetail): CampaignDetail => ({
          ...c,
          casts: c.casts.map(ca =>
            ca.instanceId === event.castInstanceId
              ? { ...ca, sublocationInstanceId: event.toSublocationInstanceId, locationInstanceId: event.toLocationInstanceId }
              : ca
          ),
        });

        this.campaign.update(c => c ? update(c) : c);
        this.shellSvc.setCampaign(update(untracked(() => this.shellSvc.campaign())!));
      })
    );
  }

  ngOnInit() {
    if (history.state?.portalEntry) {
      setTimeout(() => this.transition.hide(), 300);
    } else {
      this.transition.hide();
    }

    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    this.loadQueueCount(id);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => this.loadQueueCount(this.campaignId()));

    const token = this.auth.getToken();
    const connectAndJoin = token
      ? this.hub.connect(token).then(() => this.hub.joinCampaign(id))
      : this.hub.joinCampaign(id);
    connectAndJoin.catch(console.warn);

    // Gate: redirect to player card creation if none exists yet
    this.http.get(
      `${environment.apiUrl}/api/campaigns/${id}/player-cards/mine`
    ).pipe(
      catchError(err => {
        if (err.status === 404) {
          this.router.navigate(['/player/campaign', id, 'player-card', 'new'], { replaceUrl: true });
        }
        return EMPTY;
      })
    ).subscribe();

    this.http
      .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.shellSvc.setCampaign(c);
      });

    this.http
      .get<{ currencyBalances: { currency: string; amount: number }[] }>(
        `${environment.apiUrl}/api/campaigns/${id}/player-cards/mine`
      )
      .pipe(catchError(() => EMPTY))
      .subscribe(card => {
        this.purse.set(
          (card.currencyBalances ?? []).map(b => ({ type: b.currency, amount: b.amount }))
        );
      });
  }

  refreshPurse() {
    const id = this.campaignId();
    if (!id) return;
    this.http
      .get<{ currencyBalances: { currency: string; amount: number }[] }>(
        `${environment.apiUrl}/api/campaigns/${id}/player-cards/mine`
      )
      .pipe(catchError(() => EMPTY))
      .subscribe(card => {
        this.purse.set(
          (card.currencyBalances ?? []).map(b => ({ type: b.currency, amount: b.amount }))
        );
      });
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(console.warn);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadQueueCount(id: string) {
    this.http
      .get<{ id: string }[]>(`${environment.apiUrl}/api/campaigns/${id}/quicknote-queue`)
      .pipe(catchError(() => EMPTY))
      .subscribe(items => this.shellSvc.quicknoteQueueCount.set(items.length));
  }

  dismissOverlay() {
    this.overlayData.set(null);
    this.showOverlay.set(false);
    this.cardRevealQueue.set([]);
  }

  onBadgeClick() {
    this.showOverlay.set(true);
  }

  dismissWizardSecret() {
    this.wizardSecretContent.set(null);
  }

  dismissEventCard() {
    this.eventCardTitle.set(null);
    if (this.pendingOverlayData) {
      const pending = this.pendingOverlayData;
      this.pendingOverlayData = null;
      setTimeout(() => this.cardRevealQueue.update(queue => [...queue, pending]), 400);
    }
  }

  dismissGoldCard() {
    this.showGoldCard.set(false);
  }

  navigateToSecrets() {
    this.wizardSecretContent.set(null);
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'the-party'], { queryParams: { tab: 'secrets' } })
      .then(() => this.transition.hide());
  }

  togglePurse() {
    this.showPurse.update(v => !v);
  }

  closePurse() {
    this.showPurse.set(false);
  }

  goToMyCharacter() {
    this.router.navigate(['/player/campaign', this.campaignId(), 'the-party']);
  }

  goToCampaignInsight() {
    this.router.navigate(['/player/campaign', this.campaignId(), 'campaign-insight']);
  }

  exitPortal() {
    const destination = this.auth.isDm() ? '/dm/campaigns' : '/player/campaigns';
    this.transition.exitToLibrary(() =>
      this.router.navigate([destination], { state: { noFlip: true } })
    );
  }

  safeColor(color: string | undefined): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  private async buildOverlayFromVisibilityEvent(
    campaign: CampaignDetail,
    instanceId: string,
    cardType: 'location' | 'sublocation' | 'cast' | 'faction' | 'campaign-event',
    eventTitle?: string,
    eventBody?: string,
  ): Promise<CardRevealOverlayData | null> {
    if (cardType === 'campaign-event') {
      // Use title and body from SignalR event instead of making API call
      if (!eventTitle || !eventBody) return null;
      return {
        cardType: 'campaign-event',
        name: eventTitle,
        descriptor: 'Event • Game Master',
        content: eventBody,
        eventId: instanceId,
        portalColor: this.campaign()?.spineColor ?? '#6e28d0',
      };
    }
    if (cardType === 'location') {
      const location = campaign.locations.find((c: any) => c.instanceId === instanceId);
      if (!location) return null;
      return { cardType: 'location', name: location.name, descriptor: location.classification ?? '', imageUrl: location.imageUrl ?? '', instanceId };
    }
    if (cardType === 'sublocation') {
      const subLoc = campaign.sublocations.find((l: any) => l.instanceId === instanceId);
      if (!subLoc) return null;
      return { cardType: 'sublocation', name: subLoc.name, descriptor: '', imageUrl: subLoc.imageUrl ?? '', instanceId };
    }
    if (cardType === 'cast') {
      const cast = campaign.casts.find((ca: any) => ca.instanceId === instanceId);
      if (!cast) return null;
      return { cardType: 'cast', name: cast.name, descriptor: cast.role ?? '', imageUrl: cast.imageUrl ?? '', instanceId };
    }
    return null;
  }
}
