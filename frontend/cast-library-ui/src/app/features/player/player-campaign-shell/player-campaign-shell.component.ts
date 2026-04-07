import { Component, OnInit, OnDestroy, signal, inject, effect } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CardRevealOverlayComponent,
  CardRevealOverlayData,
} from '../../../shared/components/card-reveal-overlay/card-reveal-overlay.component';

@Component({
  selector: 'app-player-campaign-shell',
  standalone: true,
  imports: [RouterOutlet, CommonModule, CardRevealOverlayComponent],
  templateUrl: './player-campaign-shell.component.html',
  styleUrl: './player-campaign-shell.component.scss',
})
export class PlayerCampaignShellComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http  = inject(HttpClient);
  private hub   = inject(CampaignHubService);
  private auth  = inject(AuthService);

  campaignId  = signal('');
  campaign    = signal<CampaignDetail | null>(null);
  overlayData = signal<CardRevealOverlayData | null>(null);

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

      // Use the cached campaign data to identify the card
      const c = this.campaign();
      if (!c) return;

      const instanceId = event.castInstanceId ?? event.cityInstanceId ?? event.sublocationInstanceId;
      if (!instanceId) return;

      const cardType = event.castInstanceId ? 'cast'
                     : event.cityInstanceId ? 'city'
                     : 'sublocation';

      const data = this.buildOverlayFromVisibilityEvent(c, instanceId, cardType);
      if (data) {
        this.overlayData.set({ ...data, secretContent: event.secretContent });
      }
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

  private buildOverlayFromVisibilityEvent(
    campaign: CampaignDetail,
    instanceId: string,
    cardType: 'city' | 'sublocation' | 'cast',
  ): CardRevealOverlayData | null {
    if (cardType === 'city') {
      const city = campaign.cities.find(c => c.instanceId === instanceId);
      if (!city) return null;
      return { cardType: 'city', name: city.name, descriptor: city.classification ?? '', imageUrl: city.imageUrl ?? '' };
    }
    if (cardType === 'sublocation') {
      const subLoc = campaign.sublocations.find(l => l.instanceId === instanceId);
      if (!subLoc) return null;
      return { cardType: 'sublocation', name: subLoc.name, descriptor: '', imageUrl: subLoc.imageUrl ?? '' };
    }
    if (cardType === 'cast') {
      const cast = campaign.casts.find(ca => ca.instanceId === instanceId);
      if (!cast) return null;
      return { cardType: 'cast', name: cast.name, descriptor: cast.role ?? '', imageUrl: cast.imageUrl ?? '' };
    }
    return null;
  }
}
