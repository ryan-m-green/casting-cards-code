import { Component, OnInit, OnDestroy, signal, computed, inject, effect, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail, CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCastNotesComponent } from '../player-cast-notes/player-cast-notes.component';

@Component({
  selector: 'app-player-cast-detail',
  standalone: true,
  imports: [CommonModule, PlayerCastNotesComponent],
  templateUrl: './player-cast-detail.component.html',
  styleUrl: './player-cast-detail.component.scss'
})
export class PlayerCastDetailComponent implements OnInit, OnDestroy {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);

  @ViewChild(PlayerCastNotesComponent) private notesComp?: PlayerCastNotesComponent;

  campaignId         = signal('');
  locationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  playerNotes        = signal<CampaignCastPlayerNotes | null>(null);
  playerRating       = computed(() => this.playerNotes()?.rating ?? 0);
  starAnimating      = signal(false);

  portalColor = computed(() => this.campaign()?.spineColor ?? '#c8b07a');

  cast = computed<CampaignCastInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.casts.find(ca => ca.instanceId === this.castInstanceId()) ?? null;
  });

  castSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.castInstanceId === this.castInstanceId());
  });

  parentLocation = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.locations.find(l => l.instanceId === this.locationInstanceId()) ?? null;
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
    this.transition.hide();
    const id     = this.route.snapshot.paramMap.get('id')!;
    const locId  = this.route.snapshot.paramMap.get('locationInstanceId')!;
    const castId = this.route.snapshot.paramMap.get('castInstanceId')!;
    this.campaignId.set(id);
    this.locationInstanceId.set(locId);
    this.castInstanceId.set(castId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
      });
    this.http.get<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/${castId}`
    ).subscribe(n => this.playerNotes.set(n));
    this.hub.joinCampaign(id).catch(console.warn);
  }

  ngOnDestroy() {
    this.hub.leaveCampaign(this.campaignId()).catch(console.warn);
  }

  goToLocation() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'locations', this.locationInstanceId()]);
  }

  goToCity() {
    const cityId = this.parentLocation()?.cityInstanceId;
    if (cityId) {
      this.transition.quickCover();
      this.router.navigate(['/player/campaign', this.campaignId(), 'cities', cityId]);
    }
  }

  goToCampaign() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }

  setRating(stars: number) {
    const newRating = this.playerRating() === stars ? 0 : stars;
    const notes = this.playerNotes();
    this.playerNotes.update(n => n ? { ...n, rating: newRating } : n);
    this.notesComp?.syncRating(newRating);
    this.starAnimating.set(true);
    setTimeout(() => this.starAnimating.set(false), 700);
    this.http.put<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/cast-player-notes/${this.castInstanceId()}`,
      {
        want:        notes?.want        ?? '',
        connections: notes?.connections ?? [],
        alignment:   notes?.alignment   ?? '',
        perception:  notes?.perception  ?? 0,
        rating:      newRating,
      }
    ).subscribe(updated => this.playerNotes.set(updated));
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
