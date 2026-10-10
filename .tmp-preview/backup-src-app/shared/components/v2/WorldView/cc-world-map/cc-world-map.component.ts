import { Component, ChangeDetectionStrategy, OnInit, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { CcViewBtnComponent } from '../../Shared/cc-view-btn/cc-view-btn.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';

@Component({
  selector: 'app-cc-world-map',
  standalone: true,
  imports: [CommonModule, CcViewBtnComponent, CcEditButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-world-map.component.html',
  styleUrl: './cc-world-map.component.scss',
})
export class CcWorldMapComponent implements OnInit {
  private http = inject(HttpClient);
  private gridLoad = inject(CampaignGridLoadService);

  campaignId = input.required<string>();

  worldMapImageUrl = input<string | null>(null);

  isDm = input(false);

  portalColor = input<string>('#6e28d0');

  imageUploaded = output<string>();

  requestView = output<void>();

  uploading = signal(false);
  error = signal<string | null>(null);

  imageAspectRatio = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.worldMapImageUrl()) this.gridLoad.report('top-middle', 'map');
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
