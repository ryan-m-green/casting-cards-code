import { Component, input, output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PlayerCard } from '../../../../models/player-card.model';
import { CcPortraitInputComponent } from '../../../Shared/cc-portrait-input/cc-portrait-input.component';

@Component({
  selector: 'cc-my-character-info-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcPortraitInputComponent],
  templateUrl: './cc-my-character-info-content.component.html',
  styleUrl: './cc-my-character-info-content.component.scss',
})
export class CcMyCharacterInfoContentComponent implements OnInit {
  private http = inject(HttpClient);

  readonly campaignId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();
  readonly changed = output<void>();

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly playerCardId = signal('');
  readonly imageUrl = signal<string | null>(null);

  readonly imageFile = signal<File | null>(null);
  readonly name = signal('');
  readonly race = signal('');
  readonly classValue = signal('');
  readonly description = signal('');

  ngOnInit(): void {
    this.http.get<PlayerCard>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/mine`
    ).subscribe({
      next: card => {
        if (!card) {
          this.loading.set(false);
          return;
        }
        this.playerCardId.set(card.id);
        this.imageUrl.set(card.imageUrl ?? null);
        this.name.set(card.name);
        this.race.set(card.race);
        this.classValue.set(card.class);
        this.description.set(card.description ?? '');
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private _uploadImage(file: File, playerCardId: string): void {
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}/image`,
      formData
    ).subscribe({
      next: res => {
        this.imageFile.set(null);
        const url = res.imageUrl.includes('?')
          ? `${res.imageUrl}&t=${Date.now()}`
          : `${res.imageUrl}?t=${Date.now()}`;
        this.imageUrl.set(url);
      },
      error: () => this.error.set('Failed to upload the portrait. Please try again.'),
    });
  }

  save(): void {
    const name = this.name().trim();
    const race = this.race().trim();
    const classValue = this.classValue().trim();
    if (!name || !race || !classValue) {
      this.error.set('Name, race, and class are required.');
      return;
    }
    const playerCardId = this.playerCardId();
    if (!playerCardId) return;

    this.saving.set(true);
    this.error.set('');

    const file = this.imageFile();
    if (file) this._uploadImage(file, playerCardId);

    const body = {
      name,
      race,
      class: classValue,
      description: this.description().trim() || null,
    };

    this.http.put<void>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${playerCardId}`,
      body
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.changed.emit();
        this.closeDrawer.emit();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to save. Please try again.');
      },
    });
  }
}
