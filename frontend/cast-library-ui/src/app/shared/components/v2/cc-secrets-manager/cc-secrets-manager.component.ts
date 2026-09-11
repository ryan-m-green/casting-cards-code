import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignSecret } from '../../../models/secret.model';

@Component({
  selector: 'cc-secrets-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cc-secrets-manager.component.html',
  styleUrl: './cc-secrets-manager.component.scss'
})
export class CcSecretsManagerComponent {
  readonly secrets = input.required<CampaignSecret[]>();
  readonly context = input<'journal' | 'campaign'>('campaign');
  readonly isDm = input<boolean>(false);
  readonly editing = input<boolean>(false);
  readonly allowAdd = input<boolean>(true);
  readonly allowDelete = input<boolean>(true);
  readonly allowToggle = input<boolean>(true);

  readonly reveal = output<CampaignSecret>();
  readonly reseal = output<CampaignSecret>();
  readonly add = output<string>();
  readonly delete = output<CampaignSecret>();

  adding = signal(false);
  newSecretContent = signal('');

  get isCampaignContext(): boolean {
    return this.context() === 'campaign';
  }

  onToggle(secret: CampaignSecret): void {
    if (secret.isRevealed) {
      this.reseal.emit(secret);
    } else {
      this.reveal.emit(secret);
    }
  }

  onDelete(secret: CampaignSecret): void {
    this.delete.emit(secret);
  }

  startAdding(): void {
    this.newSecretContent.set('');
    this.adding.set(true);
  }

  cancelAdding(): void {
    this.adding.set(false);
  }

  confirmAdd(): void {
    const content = this.newSecretContent().trim();
    if (!content) return;
    this.add.emit(content);
    this.newSecretContent.set('');
    this.adding.set(false);
  }
}
