import { Component, input, output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignSecret } from '../../models/secret.model';
import { environment } from '../../../../environments/environment';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { CcDetailPanelActionsComponent } from '../v2/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../v2/cc-secrets-manager/cc-secrets-manager.component';
import { CcPortraitInputComponent } from '../v2/cc-portrait-input/cc-portrait-input.component';

type DetailTab = 'details' | 'secrets';

@Component({
  selector: 'app-cast-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcTextboxComponent, CcSecretsManagerComponent, CcPortraitInputComponent],
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

  // Detail tabs
  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

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

    // Save always drops the panel out of edit mode, regardless of the async
    // persistence outcome (mirrors the Cancel behaviour).
    this.editing.set(false);

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
}
