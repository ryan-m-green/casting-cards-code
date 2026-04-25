import { Component, OnInit, signal, computed, inject, ViewChild, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { PlayerCastNotesComponent } from '../player-cast-notes/player-cast-notes.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { PlayerCampaignShellComponent } from '../player-campaign-shell/player-campaign-shell.component';
import { PlayerCampaignShellService } from '../../../core/player-campaign-shell.service';

@Component({
  selector: 'app-player-cast-detail',
  standalone: true,
  imports: [CommonModule, PlayerCastNotesComponent, CastCardComponent],
  templateUrl: './player-cast-detail.component.html',
  styleUrl: './player-cast-detail.component.scss'
})
export class PlayerCastDetailComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private http       = inject(HttpClient);
  private transition = inject(PortalTransitionService);
  private shell      = inject(PlayerCampaignShellComponent);
  private shellService = inject(PlayerCampaignShellService);

  @ViewChild(PlayerCastNotesComponent) private notesComp?: PlayerCastNotesComponent;

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = () => this.shell.campaign();
  playerNotes        = signal<CampaignCastPlayerNotes | null>(null);
  playerRating       = computed(() => this.playerNotes()?.rating ?? 0);
  starAnimating      = signal(false);

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

  parentLocation = computed(() => {
    const c = this.campaign();
    const parentSubLoc = this.parentSublocation();
    if (!c || !parentSubLoc) return null;
    return c.locations.find(l => l.instanceId === parentSubLoc.locationInstanceId) ?? null;
  });

  constructor() {
    effect(() => {
      const ca = this.cast();
      const parentSubLoc = this.parentSublocation();
      const parentLoc = this.parentLocation();

      if (ca && parentSubLoc && parentLoc) {
        this.shellService.setCrumbs([
          { label: '← Locations', action: () => this.goToCampaign() },
          { label: '← Sublocations', action: () => this.goToLocation() },
          { label: '← Cast',         action: () => this.goToSublocation() }
        ]);
        this.shellService.setTitle(ca.name);
      }
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
