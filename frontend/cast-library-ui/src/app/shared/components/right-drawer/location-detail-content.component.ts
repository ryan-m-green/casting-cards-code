import { Component, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Location, CampaignLocationInstance } from '../../models/location.model';
import { CampaignSecret } from '../../models/secret.model';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { CcDetailPanelActionsComponent } from '../v2/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../v2/cc-secrets-manager/cc-secrets-manager.component';

@Component({
  selector: 'app-location-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcTextboxComponent, CcSecretsManagerComponent],
  templateUrl: './location-detail-content.component.html',
  styleUrl: './location-detail-content.component.scss'
})
export class LocationDetailContentComponent {
  private http = inject(HttpClient);

  location = input.required<Location | CampaignLocationInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input<string>('');
  closeDrawer = output<void>();
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('location');

  // Local reactive secret state that can be updated after reveal/reseal/add/delete
  secretsState = signal<CampaignSecret[] | null>(null);

  currentSecrets = computed(() => this.secretsState() ?? this.secrets());

  private get locationInstanceId(): string {
    return (this.location() as CampaignLocationInstance).instanceId ?? '';
  }

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

  // Edit mode state
  editing = signal<boolean>(false);

  // Portrait input state
  imageFile = signal<File | null>(null);

  // Editable field signals
  editName = signal('');
  editClassification = signal('');
  editSize = signal('');
  editCondition = signal('');
  editGeography = signal('');
  editArchitecture = signal('');
  editClimate = signal('');
  editReligion = signal('');
  editVibe = signal('');
  editLanguages = signal('');
  editDescription = signal('');

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  startEditing() {
    const loc = this.location();
    this.editName.set(loc.name || '');
    this.editClassification.set(loc.classification || '');
    this.editSize.set(loc.size || '');
    this.editCondition.set(loc.condition || '');
    this.editGeography.set(loc.geography || '');
    this.editArchitecture.set(loc.architecture || '');
    this.editClimate.set(loc.climate || '');
    this.editReligion.set(loc.religion || '');
    this.editVibe.set(loc.vibe || '');
    this.editLanguages.set(loc.languages || '');
    this.editDescription.set(loc.description || '');
    this.imageFile.set(null);
    this.editing.set(true);
  }

  saveDetails() {
    const loc = this.location();
    const campaignId = this.campaignId();
    const file = this.imageFile();
    const currentCardType = this.cardType();

    console.log('LocationDetailContent - saveDetails called');
    console.log('LocationDetailContent - campaignId:', campaignId);
    console.log('LocationDetailContent - instanceId:', (loc as CampaignLocationInstance).instanceId);
    console.log('LocationDetailContent - cardType:', currentCardType);
    console.log('LocationDetailContent - has file:', !!file);

    if (!campaignId || !(loc as CampaignLocationInstance).instanceId) {
      console.warn('Cannot save: missing campaignId or instanceId');
      this.editing.set(false);
      return;
    }

    const instanceId = (loc as CampaignLocationInstance).instanceId;
    const sourceLocationId = (loc as CampaignLocationInstance).sourceLocationId;

    // Upload image if selected
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceLocationId', sourceLocationId);
      const endpoint = this.getEndpointMapping(currentCardType);
      const url = endpoint(campaignId, instanceId);
      console.log('LocationDetailContent - uploading image to:', url);
      this.http.post(
        url,
        formData
      ).subscribe({
        next: () => {
          console.log('LocationDetailContent - Image uploaded successfully');
          this.imageFile.set(null);
          this.editing.set(false);
        },
        error: (err) => {
          console.error('LocationDetailContent - Failed to upload image:', err);
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
    const instanceId = this.locationInstanceId;
    if (!campaignId || !instanceId) return;

    this.http.post<CampaignSecret>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/secrets`,
      { instanceId, entityType: 'Location', content }
    ).subscribe(s => {
      this.secretsState.set([...this.currentSecrets(), s]);
    });
  }
}
