import { Component, computed, effect, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Location, CampaignLocationInstance } from '../../models/location.model';
import { CampaignSecret } from '../../models/secret.model';
import { CcTextboxComponent } from '../v2/cc-textbox/cc-textbox.component';
import { CcLangPickerComponent } from '../v2/cc-lang-picker/cc-lang-picker.component';
import { CcDetailPanelActionsComponent } from '../v2/cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../v2/cc-secrets-manager/cc-secrets-manager.component';
import { CcPortraitInputComponent } from '../v2/cc-portrait-input/cc-portrait-input.component';

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

  location = input.required<Location | CampaignLocationInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input<string>('');
  closeDrawer = output<void>();
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('location');

  /** Instance id of the location card, passed to the shared secrets manager. */
  get locationInstanceId(): string {
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

  // Detail tabs
  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
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

  /**
   * Locally-updated copy of the location. Saving writes the edited fields back
   * through the API; holding the latest saved values here lets the read-only
   * view reflect them immediately instead of waiting for the parent to hand us
   * fresh data. Cleared whenever a different location arrives.
   */
  private savedLocation = signal<Location | CampaignLocationInstance | null>(null);

  /** Effective location for display: the local saved copy when present, else the input. */
  readonly view = computed(() => this.savedLocation() ?? this.location());

  constructor() {
    effect(() => {
      this.location(); // react to a new location being passed in
      this.savedLocation.set(null);
    });
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  startEditing() {
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

  /**
   * Persists the edited fields to the campaign location instance (and, when
   * `syncLibrary` is true, back to the source library location), then uploads a
   * new portrait if one was selected.
   */
  private persistLocation(syncLibrary: boolean) {
    const loc = this.view() as CampaignLocationInstance;
    const campaignId = this.campaignId();
    const file = this.imageFile();
    const currentCardType = this.cardType();

    // Save always drops the panel out of edit mode, regardless of the async
    // persistence outcome (mirrors the Cancel behaviour).
    this.editing.set(false);

    if (!campaignId || !loc?.instanceId) {
      console.warn('LocationDetailContent - Cannot save: missing campaignId or instanceId');
      return;
    }

    // Fields edited in the drawer. dmNotes/keywords are not editable here, so
    // pass their current values through rather than clearing them.
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
        // Reflect the saved values in the read-only view immediately.
        this.savedLocation.set({ ...(this.view() as CampaignLocationInstance), ...fields });
      },
      error: (err) => console.error('LocationDetailContent - Failed to save location:', err),
    });

    // Upload the portrait if one was selected.
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
