import { Component, input, output, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignSecret } from '../../models/secret.model';
import { environment } from '../../../../environments/environment';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { CcDetailPanelActionsComponent } from '../v2/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../v2/cc-secrets-manager/cc-secrets-manager.component';

@Component({
  selector: 'app-cast-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcTextboxComponent, CcSecretsManagerComponent],
  templateUrl: './cast-detail-content.component.html',
  styleUrl: './cast-detail-content.component.scss'
})
export class CastDetailContentComponent {
  private http = inject(HttpClient);

  cast = input.required<CampaignCastInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input<string>('');
  castInstanceId = input.required<string>();
  closeDrawer = output<void>();
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('cast');

  // Local reactive secret state that can be updated after reveal/reseal/add/delete
  secretsState = signal<CampaignSecret[] | null>(null);

  currentSecrets = computed(() => this.secretsState() ?? this.secrets());

  // Edit mode state
  editing = signal<boolean>(false);

  // Portrait input state
  imageFile = signal<File | null>(null);

  // Endpoint mapping based on cardtype
  private getEndpointMapping(cardType: 'location' | 'sublocation' | 'cast' | 'faction') {
    const endpoints = {
      location: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/locationinstances/${instanceId}/image`,
      sublocation: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}/image`,
      cast: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${instanceId}/image`,
      faction: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/factioninstances/${instanceId}/image`
    };
    return endpoints[cardType];
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  startEditing() {
    this.imageFile.set(null);
    this.editing.set(true);
  }

  saveDetails() {
    const cast = this.cast();
    const campaignId = this.campaignId();
    const file = this.imageFile();
    const currentCardType = this.cardType();

    console.log('CastDetailContent - saveDetails called');
    console.log('CastDetailContent - campaignId:', campaignId);
    console.log('CastDetailContent - instanceId:', (cast as CampaignCastInstance).instanceId);
    console.log('CastDetailContent - cardType:', currentCardType);
    console.log('CastDetailContent - has file:', !!file);

    if (!campaignId || !(cast as CampaignCastInstance).instanceId) {
      console.warn('Cannot save: missing campaignId or instanceId');
      this.editing.set(false);
      return;
    }

    const instanceId = (cast as CampaignCastInstance).instanceId;
    const sourceCastId = (cast as CampaignCastInstance).sourceCastId;

    // Upload image if selected
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceCastId', sourceCastId);
      const endpoint = this.getEndpointMapping(currentCardType);
      const url = endpoint(campaignId, instanceId);
      console.log('CastDetailContent - uploading image to:', url);
      this.http.post(
        url,
        formData
      ).subscribe({
        next: () => {
          console.log('CastDetailContent - Image uploaded successfully');
          this.imageFile.set(null);
          this.editing.set(false);
        },
        error: (err) => {
          console.error('CastDetailContent - Failed to upload image:', err);
          this.editing.set(false);
        }
      });
    } else {
      this.editing.set(false);
    }
  }

  saveToLibrary() {
    this.saveDetails();
  }

  cancelEditing() {
    this.editing.set(false);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }

  onRevealSecret(secret: CampaignSecret): void {
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reveal`,
      {}
    ).subscribe(() => {
      this.secretsState.set(this.currentSecrets().map(s => s.id === secret.id ? { ...s, isRevealed: true } : s));
    });
  }

  onResealSecret(secret: CampaignSecret): void {
    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}/reseal`,
      {}
    ).subscribe(() => {
      this.secretsState.set(this.currentSecrets().map(s => s.id === secret.id ? { ...s, isRevealed: false } : s));
    });
  }

  onDeleteSecret(secret: CampaignSecret): void {
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/secrets/${secret.id}`
    ).subscribe(() => {
      this.secretsState.set(this.currentSecrets().filter(s => s.id !== secret.id));
    });
  }

  onAddSecret(content: string): void {
    const campaignId = this.campaignId();
    const instanceId = this.castInstanceId();
    if (!campaignId || !instanceId) return;

    this.http.post<CampaignSecret>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/secrets`,
      { instanceId, entityType: 'Cast', content }
    ).subscribe(s => {
      this.secretsState.set([...this.currentSecrets(), s]);
    });
  }
}
