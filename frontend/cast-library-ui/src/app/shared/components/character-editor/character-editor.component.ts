import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-character-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-editor.component.html',
  styleUrl: './character-editor.component.scss',
})
export class CharacterEditorComponent {
  private http = inject(HttpClient);

  @Input() visible       = false;
  @Input() campaignId    = '';
  @Input() playerCardId  = '';
  @Input() name          = '';
  @Input() descriptor    = '';
  @Input() imageUrl: string | null = null;

  @Output() closed   = new EventEmitter<void>();
  @Output() uploaded = new EventEmitter<string>();

  imageUploading = signal(false);
  previewUrl     = signal<string | null>(null);

  get displayUrl(): string | null {
    return this.previewUrl() ?? this.imageUrl;
  }

  close() { this.closed.emit(); }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(objectUrl);
    this.imageUploading.set(true);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/${this.playerCardId}/image`,
      formData
    ).subscribe({
      next: res => {
        URL.revokeObjectURL(objectUrl);
        this.previewUrl.set(null);
        this.imageUploading.set(false);
        this.uploaded.emit(res.imageUrl);
      },
      error: () => {
        URL.revokeObjectURL(objectUrl);
        this.previewUrl.set(null);
        this.imageUploading.set(false);
      },
    });
  }
}
