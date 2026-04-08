import { Component, OnInit, signal, inject, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { Campaign } from '../../shared/models/campaign.model';
import { PortalTransitionService } from '../../core/portal-transition.service';
import { DmNavComponent } from '../../shared/components/dm-nav/dm-nav.component';

interface DashboardStats {
  campaignCount: number;
  locationCount: number;
  sublocationCount: number;
  castCount: number;
  activeCampaign: Campaign | null;
}

interface ImportResult {
  castsImported: number;
  locationsImported: number;
  sublocationsImported: number;
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
  imports: [CommonModule, DmNavComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private http       = inject(HttpClient);
  private router     = inject(Router);
  private transition = inject(PortalTransitionService);
  auth               = inject(AuthService);

  @ViewChild('portalGhostTpl') private portalGhostTpl!: ElementRef<HTMLElement>;
  private isEntering = false;

  stats = signal<DashboardStats>({
    campaignCount: 0, locationCount: 0, sublocationCount: 0, castCount: 0, activeCampaign: null
  });

  showImportPanel = signal(false);
  importing       = signal(false);
  importResult    = signal<ImportResult | null>(null);
  importError     = signal<string | null>(null);
  selectedZipFile = signal<File | null>(null);

  ngOnInit() {
    this.http.get<DashboardStats>(`${environment.apiUrl}/api/dashboard/stats`)
      .subscribe(s => this.stats.set(s));
  }

  safeColor(color: string): string {
    return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6e28d0';
  }

  goto(path: string) { this.router.navigate([path]); }

  portalEnter(id: string, spineColor: string) {
    if (this.isEntering) return;
    this.isEntering = true;

    const template = this.portalGhostTpl.nativeElement;
    const ghostW   = template.offsetWidth  || 170;
    const ghostH   = template.offsetHeight || 240;
    const cx       = window.innerWidth  / 2;
    const cy       = window.innerHeight / 2;
    const color    = this.safeColor(spineColor);

    // ── Build ghost card — append off-screen to measure true size ─
    const ghost = template.cloneNode(true) as HTMLElement;
    ghost.classList.remove('portal-ghost-tpl');
    Object.assign(ghost.style, {
      position:      'fixed',
      top:           '-9999px',
      left:          '-9999px',
      width:         ghostW + 'px',
      margin:        '0',
      overflow:      'visible',
      zIndex:        '9000',
      pointerEvents: 'none',
      opacity:       '0',
      transition:    'none',
      willChange:    'transform, opacity',
      visibility:    'hidden',
    });
    document.body.appendChild(ghost);
    void ghost.offsetWidth;

    // Measure natural (untransformed) size so centering is accurate
    const actualW = ghost.offsetWidth  || ghostW;
    const actualH = ghost.offsetHeight || ghostH;

    // Center first, then apply initial scale so transform-origin stays at (cx, cy)
    ghost.style.top        = (cy - actualH / 2) + 'px';
    ghost.style.left       = (cx - actualW / 2) + 'px';
    ghost.style.transform  = 'scale(0.4)';
    ghost.style.visibility = '';

    this.transition.ghostTemplate = ghost.cloneNode(true) as HTMLElement;
    this.transition.originRect    = null;
    this.transition.spineColor    = color;

    // ── Spawn inward-converging sparks ────────────────────────────
    const sparks: HTMLElement[] = [];
    for (let i = 0; i < 30; i++) {
      const angle  = (i / 30) * 2 * Math.PI + Math.random() * 0.5;
      const dist   = 80 + Math.random() * 80;
      const size   = 5 + Math.random() * 6;
      const startX = cx + Math.cos(angle) * dist;
      const startY = cy + Math.sin(angle) * dist;
      const sp     = document.createElement('div');
      Object.assign(sp.style, {
        position:      'fixed',
        width:         size + 'px',
        height:        size + 'px',
        borderRadius:  '50%',
        background:    color,
        boxShadow:     `0 0 ${size * 3}px ${color}, 0 0 ${size * 7}px ${color}, 0 0 ${size * 12}px ${color}`,
        left:          (startX - size / 2) + 'px',
        top:           (startY - size / 2) + 'px',
        zIndex:        '9001',
        pointerEvents: 'none',
        opacity:       '1',
        transition:    'transform 600ms cubic-bezier(0.4,0,0.6,1), opacity 600ms ease-in',
      });
      document.body.appendChild(sp);
      sparks.push(sp);
      void sp.offsetWidth;
      // Translate each spark inward to the card center
      sp.style.transform = `translate(${cx - startX}px, ${cy - startY}px)`;
      sp.style.opacity   = '0';
    }

    void ghost.offsetWidth;

    // Phase 0 — assemble: sparks converge as card grows from tiny (600ms)
    ghost.style.transition = 'opacity 550ms ease-out, transform 600ms cubic-bezier(0.34,1.2,0.64,1)';
    ghost.style.opacity    = '1';
    ghost.style.transform  = 'scale(1.04)';

    setTimeout(() => {
      // Settle
      ghost.style.transition = 'transform 150ms ease-out';
      ghost.style.transform  = 'scale(1.0)';

      setTimeout(() => {
        // Phase 1 — breathe pulse
        ghost.style.transition = 'transform 0.26s ease-in-out';
        ghost.style.transform  = 'scale(1.06)';

        setTimeout(() => {
          // Phase 2 — zoom into void
          ghost.style.transition = 'transform 1.5s cubic-bezier(0.4,0,0.8,1)';
          ghost.style.transform  = 'scale(30)';

          this.transition.show();

          setTimeout(() => {
            ghost.remove();
            sparks.forEach(s => s.remove());
            this.isEntering = false;
            this.router.navigate(['/campaign', id], { state: { noFlip: true, portalEntry: true } });
          }, 2000);
        }, 260);
      }, 150);
    }, 600);
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
}
