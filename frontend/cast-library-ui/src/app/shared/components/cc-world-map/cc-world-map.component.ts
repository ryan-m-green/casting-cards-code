import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CcViewBtnComponent } from '../cc-view-btn/cc-view-btn.component';

@Component({
  selector: 'app-cc-world-map',
  standalone: true,
  imports: [CommonModule, CcViewBtnComponent],
  templateUrl: './cc-world-map.component.html',
  styleUrl: './cc-world-map.component.scss',
})
export class CcWorldMapComponent {
  private http = inject(HttpClient);

  /** Campaign ID used to upload the world map image. */
  campaignId = input.required<string>();

  /** Current world map image URL (null when none has been uploaded). */
  worldMapImageUrl = input<string | null>(null);

  /** When true, the DM upload control is shown. */
  isDm = input(false);

  /** Portal/campaign accent color. */
  portalColor = input<string>('#6e28d0');

  /** Emits the new image URL after a successful upload. */
  imageUploaded = output<string>();

  /** Emits when the view button is pressed (image opened in the right drawer). */
  requestView = output<void>();

  uploading = signal(false);
  error = signal<string | null>(null);

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploading.set(true);
    this.error.set(null);

    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<{ imageUrl: string }>(
        `${environment.apiUrl}/api/campaigns/${this.campaignId()}/worldmap-image`,
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
