import { Component, computed, effect, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { Location, CampaignLocationInstance } from '../../../models/location.model';
import { CampaignSecret } from '../../../models/secret.model';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';
import { CcLangPickerComponent } from '../cc-lang-picker/cc-lang-picker.component';
import { CcDetailPanelActionsComponent } from '../cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../cc-secrets-manager/cc-secrets-manager.component';
import { CcPortraitInputComponent } from '../cc-portrait-input/cc-portrait-input.component';
import { CampaignGmService } from '../../../../core/campaign-gm.service';

type DetailTab = 'details' | 'secrets';

@Component({
  selector: 'app-location-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcTextboxComponent, CcLangPickerComponent, CcSecretsManagerComponent, CcPortraitInputComponent],
  templateUrl: './location-detail-content.component.html',
  styleUrl: './location-detail-content.component.scss'
})
export class LocationDetailContentComponent {
  private http = inject(HttpClient);
  private campaignGm = inject(CampaignGmService);

  readonly isDm = this.campaignGm.isDm;

  location = input.required<Location | CampaignLocationInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input<string>('');
  closeDrawer = output<void>();
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('location');

  get locationInstanceId(): string {
    return (this.location() as CampaignLocationInstance).instanceId ?? '';
  }

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

  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  editing = signal<boolean>(false);

  imageFile = signal<File | null>(null);

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

  private savedLocation = signal<Location | CampaignLocationInstance | null>(null);

  readonly view = computed(() => this.savedLocation() ?? this.location());

  constructor() {
    effect(() => {
      this.location();
      this.savedLocation.set(null);
    });
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  startEditing() {
    if (!this.isDm()) return;
    const loc = this.view();
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
    this.persistLocation(false);
  }

  saveToLibrary() {
    this.persistLocation(true);
  }

  private persistLocation(syncLibrary: boolean) {
    if (!this.isDm()) return;
    const loc = this.view() as CampaignLocationInstance;
    const campaignId = this.campaignId();
    const file = this.imageFile();
    const currentCardType = this.cardType();

    this.editing.set(false);

    if (!campaignId || !loc?.instanceId) {
      console.warn('LocationDetailContent - Cannot save: missing campaignId or instanceId');
      return;
    }

    const fields = {
      name: this.editName(),
      description: this.editDescription(),
      classification: this.editClassification(),
      size: this.editSize(),
      condition: this.editCondition(),
      geography: this.editGeography(),
      architecture: this.editArchitecture(),
      climate: this.editClimate(),
      religion: this.editReligion(),
      vibe: this.editVibe(),
      languages: this.editLanguages(),
      dmNotes: loc.dmNotes ?? '',
      keywords: loc.keywords ?? [],
    };

    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${campaignId}/locations/${loc.instanceId}`,
      { ...fields, syncLibrary }
    ).subscribe({
      next: () => {
        this.savedLocation.set({ ...(this.view() as CampaignLocationInstance), ...fields });
      },
      error: (err) => console.error('LocationDetailContent - Failed to save location:', err),
    });

    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceLocationId', loc.sourceLocationId);
      const url = this.getEndpointMapping(currentCardType)(campaignId, loc.instanceId);
      this.http.post(url, formData).subscribe({
        next: () => this.imageFile.set(null),
        error: (err) => console.error('LocationDetailContent - Failed to upload image:', err),
      });
    }
  }

  cancelEditing() {
    this.editing.set(false);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }
}
