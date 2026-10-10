import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignLocationInstance, Location } from '../../../../models/location.model';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { CcLangPickerComponent } from '../../../Shared/cc-lang-picker/cc-lang-picker.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../../Shared/cc-campaign-dropdown/cc-campaign-dropdown.component';
import { KeywordTagsComponent } from '../../../Shared/cc-keyword-tags/cc-keyword-tags.component';
import {
  ARCHITECTURE_OPTIONS,
  CLASSIFICATION_OPTIONS,
  CLIMATE_OPTIONS,
  CONDITION_OPTIONS,
  GEOGRAPHY_OPTIONS,
  RELIGION_OPTIONS,
  SIZE_OPTIONS,
  VIBE_OPTIONS,
} from '../../../../../features/location/location-form/location-form.component';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const asOptions = (values: string[]): CampaignDropdownOption[] =>
  values.map(value => ({ value, label: value }));

@Component({
  selector: 'cc-location-new-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CcTextboxComponent, CcLangPickerComponent, CampaignDropdownComponent, KeywordTagsComponent],
  templateUrl: './cc-location-new-form.component.html',
  styleUrl: './cc-location-new-form.component.scss'
})
export class CcLocationNewFormComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  readonly campaignId = input.required<string>();

  readonly saved = output<CampaignLocationInstance>();

  readonly saveStatus = signal<SaveStatus>('idle');

  readonly keywordOptions = signal<string[]>([]);

  readonly classificationOptions = asOptions(CLASSIFICATION_OPTIONS);
  readonly sizeOptions = asOptions(SIZE_OPTIONS);
  readonly conditionOptions = asOptions(CONDITION_OPTIONS);
  readonly geographyOptions = asOptions(GEOGRAPHY_OPTIONS);
  readonly architectureOptions = asOptions(ARCHITECTURE_OPTIONS);
  readonly climateOptions = asOptions(CLIMATE_OPTIONS);
  readonly religionOptions = asOptions(RELIGION_OPTIONS);
  readonly vibeOptions = asOptions(VIBE_OPTIONS);

  readonly locationForm = this.fb.group({
    name: ['', Validators.required],
    classification: [''],
    size: [''],
    condition: [''],
    geography: [''],
    architecture: [''],
    climate: [''],
    religion: [''],
    vibe: [''],
    languages: [''],
    description: [''],
    dmNotes: [''],
    keywords: [[] as string[]],
  });

  ngOnInit() {
    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=location`
    ).subscribe({
      next: res => this.keywordOptions.set(res.keywords ?? []),
      error: () => this.keywordOptions.set([]),
    });
  }

  onSave() {
    if (this.locationForm.invalid || this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');

    const raw = this.locationForm.value;
    const payload = {
      name: raw.name,
      classification: raw.classification ?? '',
      size: raw.size ?? '',
      condition: raw.condition ?? '',
      geography: raw.geography ?? '',
      architecture: raw.architecture ?? '',
      climate: raw.climate ?? '',
      religion: raw.religion ?? '',
      vibe: raw.vibe ?? '',
      languages: raw.languages ?? '',
      keywords: raw.keywords ?? [],
      description: raw.description ?? '',
      dmNotes: raw.dmNotes ?? '',
    };

    this.http.post<Location>(`${environment.apiUrl}/api/locations`, payload)
      .pipe(catchError(() => {
        this._fail();
        return EMPTY;
      }))
      .subscribe(location => {
        this.http.post<CampaignLocationInstance>(
          `${environment.apiUrl}/api/campaigns/${this.campaignId()}/locations`,
          { locationId: location.id }
        ).pipe(catchError(() => {
          this._fail();
          return EMPTY;
        }))
          .subscribe(instance => {
            this.saveStatus.set('saved');
            setTimeout(() => this.saveStatus.set('idle'), 2000);

            this.locationForm.reset({
              name: '', classification: '', size: '', condition: '', geography: '',
              architecture: '', climate: '', religion: '', vibe: '', languages: '',
              description: '', dmNotes: '', keywords: [],
            });
            this.saved.emit(instance);
          });
      });
  }

  private _fail() {
    this.saveStatus.set('error');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }
}
