import { Component, OnInit, OnDestroy, signal, inject, effect, untracked } from '@angular/core';
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
import {
  CardRevealOverlayComponent,
  CardRevealOverlayData,
} from '../../../shared/components/card-reveal-overlay/card-reveal-overlay.component';
import { WizardSecretOverlayComponent } from '../../../shared/components/wizard-secret-overlay/wizard-secret-overlay.component';
import { CurrencyCardComponent } from '../../../shared/components/currency-card/currency-card.component';

@Component({
  selector: 'app-player-campaign-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, CardRevealOverlayComponent, WizardSecretOverlayComponent, CurrencyCardComponent],
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

  campaignId        = signal('');
  campaign          = signal<CampaignDetail | null>(null);
  overlayData       = signal<CardRevealOverlayData | null>(null);
  wizardSecretContent = signal<string | null>(null);

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
    });

    // Show currency card when the DM awards gold to this player or the party
    effect(() => {
      const event = this.hub.goldAwarded();
      if (!event || event.campaignId !== this.campaignId()) return;
      const myId = untracked(() => this.auth.currentUser()?.id);
      if (event.playerUserId !== null && event.playerUserId !== myId) return;
      this.goldCardAmount.set(event.amount);
      this.goldCardCurrency.set(event.currency);
      this.goldCardNote.set(event.note);
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
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
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
