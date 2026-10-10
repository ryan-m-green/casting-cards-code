import { Component, ChangeDetectionStrategy, OnInit, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { CcViewBtnComponent } from '../../Shared/cc-view-btn/cc-view-btn.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';

@Component({
  selector: 'app-cc-world-map',
  standalone: true,
  imports: [CommonModule, CcViewBtnComponent, CcEditButtonComponent],
  /** OnPush: the map is a leaf of signal inputs, so it is redrawn only when one of them changes. */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-world-map.component.html',
  styleUrl: './cc-world-map.component.scss',
})
export class CcWorldMapComponent implements OnInit {
  private http = inject(HttpClient);
  private gridLoad = inject(V2GridLoadService);

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

  /**
   * The uploaded picture's own proportions, as an `aspect-ratio` value (e.g. `1600/900`).
   * Null until the picture has loaded, which leaves the frame filling its area; once it is
   * known the frame is measured by the image, so the 12px gutter around the picture stays
   * 12px on every side rather than opening up on the axis the picture cannot fill.
   */
  imageAspectRatio = signal<string | null>(null);

  /** With no map to draw there is nothing for the area to wait on. */
  ngOnInit(): void {
    if (!this.worldMapImageUrl()) this.gridLoad.report('top-middle', 'map');
  }

  /** The map's image is in, or could not be: either way the area's last piece is done. */
  onImageSettled(): void {
    this.gridLoad.report('top-middle', 'map');
  }

  /** Reads the picture's proportions so the frame can take its shape from the image. */
  onImageLoaded(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      this.imageAspectRatio.set(`${image.naturalWidth}/${image.naturalHeight}`);
    }
    this.onImageSettled();
  }

  /**
   * Opens the picker the replace control stands for: the button is the campaign's shared edit control
   * (see cc-edit-button), which cannot wrap a file input the way the label here used to, so the input
   * is held beside it and asked to open from the button's own click.
   */
  openReplacePicker(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // The input is emptied once its file is in hand, so that picking the same map again asks the same
    // change of it: a file input that still holds a value asks nothing when the same file is picked.
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
