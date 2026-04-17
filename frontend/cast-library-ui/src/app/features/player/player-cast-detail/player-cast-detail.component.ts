import { Component, OnInit, signal, computed, inject, effect, ViewChild } from '@angular/core';
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
import { TimeOfDayBarComponent } from '../../../shared/components/time-of-day-bar/time-of-day-bar.component';

@Component({
  selector: 'app-player-cast-detail',
  standalone: true,
  imports: [CommonModule, PlayerCastNotesComponent, TimeOfDayBarComponent],
  templateUrl: './player-cast-detail.component.html',
  styleUrl: './player-cast-detail.component.scss'
})
export class PlayerCastDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private hub        = inject(CampaignHubService);
  private transition = inject(PortalTransitionService);

  @ViewChild(PlayerCastNotesComponent) private notesComp?: PlayerCastNotesComponent;

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = signal<CampaignDetail | null>(null);
  playerNotes        = signal<CampaignCastPlayerNotes | null>(null);
  playerRating       = computed(() => this.playerNotes()?.rating ?? 0);
  starAnimating      = signal(false);

  portalColor = computed(() => this.campaign()?.spineColor ?? '#c8b07a');

  timeOfDay = computed(() => this.campaign()?.timeOfDay ?? null);

  cast = computed<CampaignCastInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.casts.find(ca => ca.instanceId === this.castInstanceId()) ?? null;
  });

  castSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.castInstanceId === this.castInstanceId() && s.isRevealed);
  });

  parentSublocation = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find(l => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  constructor() {
    effect(() => {
      const event = this.hub.secretRevealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        const exists = c.secrets.some(s => s.id === event.secretId);
        if (exists) {
          return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: true } : s) };
        }
        const newSecret: CampaignSecret = {
          id: event.secretId,
          campaignId: event.campaignId,
          castInstanceId: event.castInstanceId,
          locationInstanceId: event.locationInstanceId,
          sublocationInstanceId: event.sublocationInstanceId,
          content: event.secretContent,
          sortOrder: 0,
          isRevealed: true,
          revealedAt: new Date().toISOString(),
        };
        return { ...c, secrets: [...c.secrets, newSecret] };
      });
    });

    effect(() => {
      const event = this.hub.secretResealed();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.campaign.update(c => {
        if (!c) return c;
        return { ...c, secrets: c.secrets.map(s => s.id === event.secretId ? { ...s, isRevealed: false } : s) };
      });
    });

    effect(() => {
      const event = this.hub.cardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      if (event.isVisible) {
        this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
          .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
      } else {
        this.campaign.update(c => {
          if (!c) return c;
          return {
            ...c,
            locations: c.locations.filter(x => x.instanceId !== event.instanceId),
            sublocations: c.sublocations.filter(x => x.instanceId !== event.instanceId),
            casts:     c.casts.filter(x => x.instanceId !== event.instanceId),
          };
        });
      }
    });

    effect(() => {
      const event = this.hub.bulkCardVisibilityChanged();
      if (!event || event.campaignId !== this.campaignId()) return;
      this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${this.campaignId()}/player`)
        .subscribe(c => { this.campaign.set(c); this.transition.spineColor = c.spineColor; });
    });
  }

  ngOnInit() {
    this.transition.hide();
    const id     = this.route.snapshot.paramMap.get('id')!;
    const locId  = this.route.snapshot.paramMap.get('sublocationInstanceId')!;
    const castId = this.route.snapshot.paramMap.get('castInstanceId')!;
    this.campaignId.set(id);
    this.sublocationInstanceId.set(locId);
    this.castInstanceId.set(castId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}/player`)
      .subscribe(c => {
        this.campaign.set(c);
        this.transition.spineColor = c.spineColor;
      });
    this.http.get<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${id}/cast-player-notes/${castId}`
    ).subscribe(n => this.playerNotes.set(n));
  }

  goToSublocation() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'sublocations', this.sublocationInstanceId()]);
  }

  goToLocation() {
    const locationId = this.parentSublocation()?.locationInstanceId;
    if (locationId) {
      this.transition.quickCover();
      this.router.navigate(['/player/campaign', this.campaignId(), 'locations', locationId]);
    }
  }

  goToMyCharacter() {
    this.transition.quickCover();
    this.router.navigate(['/player/campaign', this.campaignId(), 'my-character']);
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
