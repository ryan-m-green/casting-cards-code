import { Component, OnInit, OnDestroy, signal, computed, inject, effect, untracked } from '@angular/core';
import { RouterOutlet, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';
import {
  CardRevealOverlayComponent,
  CardRevealOverlayData,
} from '../../../shared/components/card-reveal-overlay/card-reveal-overlay.component';
import { WhisperCardComponent } from '../../../shared/components/whisper-card/whisper-card.component';
import { CurrencyCardComponent } from '../../../shared/components/currency-card/currency-card.component';
import { CurrencyDisplayComponent, CurrencyLine } from '../../../shared/components/currency-display/currency-display.component';
import { ShellBreadcrumbsComponent } from '../../../shared/components/shell-breadcrumbs/shell-breadcrumbs.component';

@Component({
  selector: 'app-player-campaign-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, TimeOfDayBarComponent, CardRevealOverlayComponent, WhisperCardComponent, CurrencyCardComponent, CurrencyDisplayComponent, ShellBreadcrumbsComponent],
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
  overlayData       = signal<CardRevealOverlayData | null>(null);
  wizardSecretContent   = signal<string | null>(null);
  wizardSecretRecipient = signal<string>('');

  // ── Purse popover ──────────────────────────────────────────────────────────
  showPurse        = signal(false);
  purse            = signal<CurrencyLine[]>([]);

  // ── Currency card overlay ─────────────────────────────────────────────────
  showGoldCard     = signal(false);
  goldCardAmount   = signal(0);
  goldCardCurrency = signal('gp');
  goldCardNote     = signal<string | null>(null);

  constructor() {
    // Show overlay when a card is newly unlocked
    effect(() => {
      const event = this.hub.cardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      if (!event.isVisible) return;

      // Re-fetch campaign data to get the newly visible card
      this.http
        .get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
        .subscribe(c => {
          this.campaign.set(c);
          const data = this.buildOverlayFromVisibilityEvent(c, event.instanceId, event.cardType);
          if (data) this.overlayData.set(data);
        });
    });

    // Show overlay when a secret is revealed (enriched with content)
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;

      const c = untracked(() => this.campaign());
      if (!c) return;

      const instanceId = event.castInstanceId ?? event.locationInstanceId ?? event.sublocationInstanceId;
      if (!instanceId) return;

      const cardType = event.castInstanceId ? 'cast'
                     : event.locationInstanceId ? 'location'
                     : 'sublocation';

      const data = this.buildOverlayFromVisibilityEvent(c, instanceId, cardType);
      if (data) {
        this.overlayData.set({ ...data, secretContent: event.secretContent });
      }
    });

    // Show wizard overlay when the DM delivers a personal secret to this player
    effect(() => {
      const event = this.hub.secretDelivered();
      if (!event || event.campaignId !== this.campaignId()) return;
      const myId = untracked(() => this.auth.currentUser()?.id);
      if (!myId || event.playerUserId !== myId) return;
      this.wizardSecretContent.set(event.content);
      this.wizardSecretRecipient.set(untracked(() => this.auth.currentUser()?.displayName ?? ''));
    });

    // Show card reveal overlay when a party member shares a secret
    effect(() => {
      const event = this.hub.secretShared();
      if (!event) return;
      this.overlayData.set({
        cardType:      'player',
        name:          event.playerName,
        descriptor:    event.playerRaceClass,
        imageUrl:      event.playerImageUrl,
        secretContent: event.secretContent,
      });
    });

    // Show currency card when the DM awards gold to this player or the party
    effect(() => {
      const queue = this.hub.goldAwarded();
      if (!queue.length) return;
      const myId = untracked(() => this.auth.currentUser()?.id);
      const mine = queue.find(e =>
        e.campaignId === this.campaignId() &&
        (e.playerUserId === null || e.playerUserId === myId)
      );
      this.hub.goldAwarded.set([]);
      if (!mine) return;
      this.goldCardAmount.set(mine.amount);
      this.goldCardCurrency.set(mine.currency);
      this.goldCardNote.set(mine.note);
      this.showGoldCard.set(true);
    });
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);

    const token = this.auth.getToken();
    const connectAndJoin = token && !this.hub.isConnected()
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
      .subscribe(c => this.campaign.set(c));

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
  }

  dismissOverlay() {
    this.overlayData.set(null);
  }

  dismissWizardSecret() {
    this.wizardSecretContent.set(null);
  }

  dismissGoldCard() {
    this.showGoldCard.set(false);
  }

  navigateToSecrets() {
    this.wizardSecretContent.set(null);
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character'], { queryParams: { tab: 'secrets' } })
      .then(() => this.transition.hide());
  }

  togglePurse() {
    this.showPurse.update(v => !v);
  }

  closePurse() {
    this.showPurse.set(false);
  }

  goToMyCharacter() {
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
  }

  exitPortal() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/player/campaigns'], { state: { noFlip: true } })
    );
  }

  safeColor(color: string | undefined): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  private buildOverlayFromVisibilityEvent(
    campaign: CampaignDetail,
    instanceId: string,
    cardType: 'location' | 'sublocation' | 'cast',
  ): CardRevealOverlayData | null {
    if (cardType === 'location') {
      const location = campaign.locations.find((c: any) => c.instanceId === instanceId);
      if (!location) return null;
      return { cardType: 'location', name: location.name, descriptor: location.classification ?? '', imageUrl: location.imageUrl ?? '' };
    }
    if (cardType === 'sublocation') {
      const subLoc = campaign.sublocations.find((l: any) => l.instanceId === instanceId);
      if (!subLoc) return null;
      return { cardType: 'sublocation', name: subLoc.name, descriptor: '', imageUrl: subLoc.imageUrl ?? '' };
    }
    if (cardType === 'cast') {
      const cast = campaign.casts.find((ca: any) => ca.instanceId === instanceId);
      if (!cast) return null;
      return { cardType: 'cast', name: cast.name, descriptor: cast.role ?? '', imageUrl: cast.imageUrl ?? '' };
    }
    return null;
  }
}
