import { Component, ChangeDetectionStrategy, OnDestroy, OnInit, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CcViewBtnComponent } from '../../Shared/cc-view-btn/cc-view-btn.component';
import { CcEditButtonComponent } from '../../../Shared/cc-edit-button/cc-edit-button.component';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-cc-world-map',
  standalone: true,
  imports: [CommonModule, CcViewBtnComponent, CcEditButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-world-map.component.html',
  styleUrl: './cc-world-map.component.scss',
})
export class CcWorldMapComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private gridLoad = inject(CampaignGridLoadService);
  private hub = inject(CampaignHubService);

  campaignId = input.required<string>();

  worldMapImageUrl = input<string | null>(null);

  isDm = input(false);

  portalColor = input<string>('#6e28d0');

  imageUploaded = output<string>();

  requestView = output<void>();

  uploading = signal(false);
  error = signal<string | null>(null);

  imageAspectRatio = signal<string | null>(null);

  private readonly subs = new Subscription();

  ngOnInit(): void {
    if (!this.worldMapImageUrl()) this.gridLoad.report('top-middle', 'map');

    this.subs.add(this.hub.on('WorldMapImageChanged', 'cc-world-map', event => {
      const imageUrl = event?.imageUrl;
      if (!imageUrl || imageUrl === this.worldMapImageUrl()) return;

      this.imageUploaded.emit(imageUrl);
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  onImageSettled(): void {
    this.gridLoad.report('top-middle', 'map');
  }

  onImageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      this.imageAspectRatio.set(`${image.naturalWidth}/${image.naturalHeight}`);
    }
    this.onImageSettled();
  }

  openReplacePicker(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    input.value = '';

    this.uploading.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<{ imageUrl: string }>(
        `${environment.apiUrl}/api/campaign/${this.campaignId()}/worldmap-image`,
        formData
      )
      .subscribe({
        next: (res) => {
          this.uploading.set(false);
          this.imageUploaded.emit(res.imageUrl);
        },
        error: (err) => {
          this.uploading.set(false);
          const raw = err?.error;
          this.error.set(
            typeof raw === 'string' && raw.length ? raw : 'Upload failed. Please try again.'
          );
        },
      });
  }
}
