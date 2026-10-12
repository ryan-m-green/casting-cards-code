import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { Campaign } from '../../shared/models/campaign.model';
import { PortalAnimationService } from '../../core/portal-animation.service';
import { JournalTitleComponent } from '../../shared/components/Shared/journal-title/journal-title.component';
import { UpgradeBadgeComponent } from '../../shared/components/Journal/upgrade-badge/upgrade-badge.component';
import { CampaignHubService } from '../../core/hub/campaign-hub.service';
import { SubscriptionDrawerService } from '../../core/subscription-drawer.service';
import { PortalCardComponent } from '../../shared/components/Journal/portal-card/portal-card.component';
import { CcCardStatComponent } from './cc-card-stat/cc-card-stat.component';
import { CcDashConditionsCardComponent } from './cc-dash-conditions-card/cc-dash-conditions-card.component';
import { CcCheatsheetDashCardComponent } from './cc-cheatsheet-dash-card/cc-cheatsheet-dash-card.component';
import { CcSoundtrackCardComponent } from '../../shared/components/Campaign/Soundtracks/cc-soundtrack-card/cc-soundtrack-card.component';
import { CcDragScrollDirective } from '../../shared/directives/cc-drag-scroll.directive';

interface DashboardStats {
  campaignCount: number;
  locationCount: number;
  sublocationCount: number;
  castCount: number;
  factionCount: number;
  conditionCount: number;
  cheatSheetCount: number;
  soundtrackCount: number;
  activeCampaign: Campaign | null;
  lastPlayedCampaign: Campaign | null;
}

interface ImportResult {
  castsImported: number;
  locationsImported: number;
  sublocationsImported: number;
  factionsImported: number;
  castsSkipped: number;
  locationsSkipped: number;
  sublocationsSkipped: number;
  factionsSkipped: number;
  failures: ImportFailure[];
}

interface ImportFailure {
  cardType: string;
  name: string;
  reason: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, JournalTitleComponent, UpgradeBadgeComponent, CcCardStatComponent, CcDashConditionsCardComponent, CcCheatsheetDashCardComponent, CcSoundtrackCardComponent, PortalCardComponent, CcDragScrollDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private http           = inject(HttpClient);
  private router         = inject(Router);
  private animationService = inject(PortalAnimationService);
  auth                   = inject(AuthService);
  private hub            = inject(CampaignHubService);
  private subscriptionDrawerService = inject(SubscriptionDrawerService);

  private isEntering = false;

  stats = signal<DashboardStats>({
    campaignCount: 0, locationCount: 0, sublocationCount: 0, castCount: 0, factionCount: 0, conditionCount: 0, cheatSheetCount: 0, soundtrackCount: 0,
    activeCampaign: null, lastPlayedCampaign: null
  });

  showImportPanel = signal(false);
  importing       = signal(false);
  importResult    = signal<ImportResult | null>(null);
  importError     = signal<string | null>(null);
  selectedZipFile = signal<File | null>(null);

  readonly isCreateDisabled = computed(() => {
    if (this.auth.isExempt()) return false;
    if (this.auth.isFreeTrial()) return false;
    const level = this.auth.lockLevel();
    return level !== 'FullAccess';
  });

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.hub.connect().catch((err: Error) => {});
    }

    this.http.get<DashboardStats>(`${environment.apiUrl}/api/dashboard/stats`)
      .subscribe(s => this.stats.set(s));
  }

  goto(path: string) { this.router.navigate([path]); }

  enterActiveCampaign(event: Event) {
    this.enterCampaign(this.stats().activeCampaign, event.currentTarget as HTMLElement);
  }

  enterPlayedCampaign(event: Event) {
    this.enterCampaign(this.stats().lastPlayedCampaign, event.currentTarget as HTMLElement);
  }

  editCampaign(id: string) {
    this.router.navigate(['/gm/campaigns', id]);
  }

  private enterCampaign(campaign: Campaign | null, card: HTMLElement) {
    if (!campaign || !card || this.isEntering) return;
    this.isEntering = true;

    this.animationService.enter({
      card,
      id: campaign.id,
      spineColor: campaign.spineColor,
      routePrefix: '/campaign',
      onNavigate: (routePrefix, id) => {
        this.router.navigate([routePrefix, id], { state: { noFlip: true, portalEntry: true } });
        this.isEntering = false;
      },
      enableNavigation: true
    });
  }

  toggleImport() {
    this.showImportPanel.update(v => !v);
    this.importResult.set(null);
    this.importError.set(null);
    this.selectedZipFile.set(null);
  }

  onZipFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedZipFile.set(input.files?.[0] ?? null);
    this.importResult.set(null);
    this.importError.set(null);
  }

  submitImport() {
    const zipFile = this.selectedZipFile();
    if (!zipFile) return;

    const formData = new FormData();
    formData.append('zipFile', zipFile, zipFile.name);

    this.importing.set(true);
    this.importResult.set(null);
    this.importError.set(null);

    this.http.post<ImportResult>(`${environment.apiUrl}/api/dashboard/import`, formData)
      .subscribe({
        next: result => {
          this.importResult.set(result);
          this.importing.set(false);
          this.showImportPanel.set(false);
          this.http.get<DashboardStats>(`${environment.apiUrl}/api/dashboard/stats`)
            .subscribe(s => this.stats.set(s));
        },
        error: err => {
          this.importError.set(err.error ?? 'Import failed. Please check your JSON file.');
          this.importing.set(false);
        },
      });
  }

  downloadTemplate() {
    this.http.get(`${environment.apiUrl}/api/dashboard/import-template`, { responseType: 'blob' })
      .subscribe(blob => this.triggerDownload(blob, 'library-import-template.zip'));
  }

  exportLibrary() {
    this.http.get(`${environment.apiUrl}/api/dashboard/export`, { responseType: 'blob' })
      .subscribe(blob => {
        const date = new Date().toISOString().slice(0, 10);
        this.triggerDownload(blob, `library-export-${date}.zip`);
      });
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  openUpgradeDrawer() {
    this.subscriptionDrawerService.open();
  }
}
