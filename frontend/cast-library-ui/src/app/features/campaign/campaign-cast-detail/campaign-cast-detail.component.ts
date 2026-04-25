import { Component, OnInit, signal, computed, inject, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignDetail } from '../../../shared/models/campaign.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { AuthService } from '../../../core/auth/auth.service';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { PortalTransitionService } from '../../../core/portal-transition.service';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';

@Component({
  selector: 'app-campaign-cast-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, CastCardComponent],
  templateUrl: './campaign-cast-detail.component.html',
  styleUrl: './campaign-cast-detail.component.scss'
})
export class CampaignCastDetailComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private http     = inject(HttpClient);
  private hub      = inject(CampaignHubService);
  private auth     = inject(AuthService);
  private shellSvc = inject(CampaignShellService);
  private transition = inject(PortalTransitionService);

  campaignId         = signal('');
  sublocationInstanceId = signal('');
  castInstanceId     = signal('');
  campaign           = signal<CampaignDetail | null>(null);

  // Edit mode
  editing              = signal(false);
  editPublicDescription = signal('');
  editDescription      = signal('');
  editPronouns         = signal('');
  editRace             = signal('');
  editRole             = signal('');
  editAge              = signal('');
  editAlignment        = signal('');
  editPosture          = signal('');
  editSpeed            = signal('');
  editDmNotes          = signal('');

  // Add secret
  addingSecret     = signal(false);
  newSecretContent = signal('');

  isDm = computed(() => this.auth.isDm());

  cast = computed<CampaignCastInstance | null>(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.casts.find(ca => ca.instanceId === this.castInstanceId()) ?? null;
  });

  parentSublocation = computed(() => {
    const c = this.campaign();
    if (!c) return null;
    return c.sublocations.find((l: CampaignSublocationInstance) => l.instanceId === this.sublocationInstanceId()) ?? null;
  });

  parentLocation = computed(() => {
    const c   = this.campaign();
    const subLoc = this.parentSublocation();
    if (!c || !subLoc) return null;
    return c.locations.find(ci => ci.instanceId === subLoc.locationInstanceId) ?? null;
  });

  castSecrets = computed<CampaignSecret[]>(() => {
    const c = this.campaign();
    if (!c) return [];
    return c.secrets.filter(s => s.castInstanceId === this.castInstanceId());
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
    const id       = this.route.snapshot.paramMap.get('id')!;
    const subLocId = this.route.snapshot.paramMap.get('sublocationInstanceId')!;
    const castId   = this.route.snapshot.paramMap.get('castInstanceId')!;
    this.campaignId.set(id);
    this.sublocationInstanceId.set(subLocId);
    this.castInstanceId.set(castId);
    this.http.get<CampaignDetail>(`${environment.apiUrl}/api/campaigns/${id}`)
      .subscribe(c => {
        this.campaign.set(c);
        const cast    = c.casts.find(ca => ca.instanceId === castId);
        const subLoc  = c.sublocations.find((l: CampaignSublocationInstance) => l.instanceId === subLocId);
        const loc     = subLoc ? c.locations.find(l => l.instanceId === subLoc.locationInstanceId) : null;
        this.shellSvc.setTitle(cast?.name ?? '');
        this.shellSvc.setCrumbs([
          { label: '← Locations',     action: () => this.goToCampaign() },
          { label: '← Sublocations', action: () => this.goToLocation() },
          { label: '← Cast',         action: () => this.goBack() },
        ]);
      });
  }

  toggleCastVisibility() {
    const cast = this.cast();
    if (!cast) return;
    const next = !cast.isVisibleToPlayers;
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${this.castInstanceId()}/visibility`,
      { isVisibleToPlayers: next }
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === this.castInstanceId() ? { ...ca, isVisibleToPlayers: next } : ca
        )
      } : c);
    });
  }

  toggleSecret(secret: CampaignSecret) {
    if (secret.isRevealed) {
      this.resealSecret(secret);
    } else {
      this.revealSecret(secret);
    }
  }

  private revealSecret(secret: CampaignSecret) {
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reveal`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === secret.id ? { ...s, isRevealed: true } : s
          )
        };
      });
    });
  }

  private resealSecret(secret: CampaignSecret) {
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reseal`,
      {}
    ).subscribe(() => {
      this.campaign.update(c => {
        if (!c) return c;
        return {
          ...c,
          secrets: c.secrets.map(s =>
            s.id === secret.id ? { ...s, isRevealed: false } : s
          )
        };
      });
    });
  }

  // ── Edit details ─────────────────────────────────────────────────────────

  startEditing() {
    const ca = this.cast();
    if (!ca) return;
    this.editPublicDescription.set(ca.publicDescription ?? '');
    this.editDescription.set(ca.description ?? '');
    this.editPronouns.set(ca.pronouns ?? '');
    this.editRace.set(ca.race ?? '');
    this.editRole.set(ca.role ?? '');
    this.editAge.set(ca.age ?? '');
    this.editAlignment.set(ca.alignment ?? '');
    this.editPosture.set(ca.posture ?? '');
    this.editSpeed.set(ca.speed ?? '');
    this.editDmNotes.set(ca.dmNotes ?? '');
    this.editing.set(true);
  }

  cancelEditing() {
    this.editing.set(false);
  }

  saveDetails() {
    const body = {
      publicDescription: this.editPublicDescription(),
      description:       this.editDescription(),
      pronouns:          this.editPronouns(),
      race:              this.editRace(),
      role:              this.editRole(),
      age:               this.editAge(),
      alignment:         this.editAlignment(),
      posture:           this.editPosture(),
      speed:             this.editSpeed(),
      dmNotes:           this.editDmNotes(),
    };
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts/${this.castInstanceId()}`,
      body
    ).subscribe(() => {
      this.campaign.update(c => c ? {
        ...c,
        casts: c.casts.map(ca =>
          ca.instanceId === this.castInstanceId() ? { ...ca, ...body } : ca
        )
      } : c);
      this.editing.set(false);
    });
  }

  // ── Secrets ───────────────────────────────────────────────────────────────

  startAddingSecret() {
    this.newSecretContent.set('');
    this.addingSecret.set(true);
  }

  cancelAddingSecret() {
    this.addingSecret.set(false);
  }

  confirmAddSecret() {
    const content = this.newSecretContent().trim();
    if (!content) return;
    this.http.post<CampaignSecret>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets`,
      { instanceId: this.castInstanceId(), entityType: 'Cast', content }
    ).subscribe(s => {
      this.campaign.update(c => c ? { ...c, secrets: [...c.secrets, s] } : c);
      this.addingSecret.set(false);
    });
  }

  exitToLibrary() {
    this.transition.exitToLibrary(() =>
      this.router.navigate(['/dm/campaigns'], { state: { noFlip: true } })
    );
  }

  goToTheParty() {
    this.router.navigate(['/campaign', this.campaignId(), 'the-party']);
  }

  goToCampaign() {
    this.router.navigate(['/campaign', this.campaignId()]);
  }

  goToLocation() {
    const location = this.parentLocation();
    if (location) {
      this.router.navigate(['/campaign', this.campaignId(), 'locations', location.instanceId]);
    }
  }

  goBack() {
    this.router.navigate(['/campaign', this.campaignId(), 'sublocations', this.sublocationInstanceId()]);
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
}
