import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { PlayerCardSecret } from '../../../../models/player-card.model';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';

@Component({
  selector: 'cc-player-secret-create-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent],
  templateUrl: './cc-player-secret-create-content.component.html',
  styleUrl: './cc-player-secret-create-content.component.scss',
})
export class CcPlayerSecretCreateContentComponent {
  private http = inject(HttpClient);

  readonly campaignId = input.required<string>();
  readonly playerCardId = input.required<string>();
  readonly portalColor = input<string>('#6e28d0');

  readonly closeDrawer = output<void>();
  readonly changed = output<void>();

  readonly content = signal('');
  readonly saving = signal(false);
  readonly error = signal('');

  save(): void {
    const content = this.content().trim();
    if (!content) {
      this.error.set('Write something before saving.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.http.post<PlayerCardSecret>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${this.playerCardId()}/secrets`,
      { content }
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
