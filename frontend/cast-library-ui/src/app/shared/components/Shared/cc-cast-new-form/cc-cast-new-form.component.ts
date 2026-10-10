import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { CampaignCastInstance, Cast } from '../../../models/cast.model';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';
import { CcDialCounterComponent } from '../cc-dial-counter/cc-dial-counter.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../cc-campaign-dropdown/cc-campaign-dropdown.component';
import { KeywordTagsComponent } from '../cc-keyword-tags/cc-keyword-tags.component';
import {
  AGE_OPTIONS,
  POSTURE_OPTIONS,
  PRONOUN_OPTIONS,
  RACE_OPTIONS,
  ROLE_OPTIONS,
  SPEED_OPTIONS,
} from '../../../../features/cast/cast-form/cast-form.component';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const asOptions = (values: string[]): CampaignDropdownOption[] =>
  values.map(value => ({ value, label: value }));

@Component({
  selector: 'cc-cast-new-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CcTextboxComponent, CcDialCounterComponent, CampaignDropdownComponent, KeywordTagsComponent],
  templateUrl: './cc-cast-new-form.component.html',
  styleUrl: './cc-cast-new-form.component.scss'
})
export class CcCastNewFormComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input('');
  readonly sublocationInstanceId = input('');

  readonly editCast = input<CampaignCastInstance | null>(null);

  readonly showSaveRow = input<boolean>(true);

  readonly saved = output<CampaignCastInstance>();

  readonly saveStatus = signal<SaveStatus>('idle');

  readonly isEditing = computed(() => this.editCast() !== null);

  readonly keywordOptions = signal<string[]>([]);

  readonly pronounOptions = asOptions(PRONOUN_OPTIONS);
  readonly ageOptions = asOptions(AGE_OPTIONS);
  readonly roleOptions = asOptions(ROLE_OPTIONS);
  readonly raceOptions = asOptions(RACE_OPTIONS);
  readonly postureOptions = asOptions(POSTURE_OPTIONS);
  readonly speedOptions = asOptions(SPEED_OPTIONS);

  readonly castForm = this.fb.group({
    name: ['', Validators.required],
    pronouns: [''],
    age: [''],
    role: [''],
    race: [''],
    posture: [''],
    speed: [''],
    maxHitPoints: [0],
    publicDescription: [''],
    voiceNotes: [''],
    description: [''],
    keywords: [[] as string[]],
  });

  ngOnInit() {
    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=cast`
    ).subscribe({
      next: res => this.keywordOptions.set(res.keywords ?? []),
      error: () => this.keywordOptions.set([]),
    });

    const editing = this.editCast();
    if (editing) {
      this.castForm.setValue({
        name: editing.name ?? '',
        pronouns: editing.pronouns ?? '',
        age: editing.age ?? '',
        role: editing.role ?? '',
        race: editing.race ?? '',
        posture: editing.posture ?? '',
        speed: editing.speed ?? '',
        maxHitPoints: editing.maxHitPoints ?? 0,
        publicDescription: editing.publicDescription ?? '',
        voiceNotes: editing.voiceNotes ?? '',
        description: editing.description ?? '',
        keywords: editing.keywords ?? [],
      });
    }
  }

  onSave() {
    this.save();
  }

  save(syncLibrary = false) {
    if (this.castForm.invalid || this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');

    const details = this._detailsFromForm();

    if (this.editCast()) {
      this._saveEdit(details, syncLibrary);
      return;
    }

    this._create(details);
  }

  private _detailsFromForm() {
    const raw = this.castForm.value;
    return {
      name: raw.name,
      pronouns: raw.pronouns ?? '',
      race: raw.race ?? '',
      role: raw.role ?? '',
      age: raw.age ?? '',
      maxHitPoints: Number(raw.maxHitPoints) || 0,
      posture: raw.posture ?? '',
      speed: raw.speed ?? '',
      keywords: raw.keywords ?? [],
      voiceNotes: raw.voiceNotes ?? '',
      description: raw.description ?? '',
      publicDescription: raw.publicDescription ?? '',
    };
  }

  private _create(details: ReturnType<CcCastNewFormComponent['_detailsFromForm']>) {
    this.http.post<Cast>(`${environment.apiUrl}/api/cast`, details)
      .pipe(catchError(() => {
        this._fail();
        return EMPTY;
      }))
      .subscribe(cast => {
        this.http.post<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaigns/${this.campaignId()}/casts`,
          {
            castId: cast.id,
            locationInstanceId: this.locationInstanceId(),
            sublocationInstanceId: this.sublocationInstanceId(),
          }
        ).pipe(catchError(() => {
          this._fail();
          return EMPTY;
        }))
          .subscribe(instance => {
            this._done();
            this.castForm.reset({
              name: '', pronouns: '', age: '', role: '', race: '', posture: '', speed: '',
              maxHitPoints: 0, publicDescription: '', voiceNotes: '', description: '', keywords: [],
            });
            this.saved.emit(instance);
          });
      });
  }

  private _saveEdit(
    details: ReturnType<CcCastNewFormComponent['_detailsFromForm']>,
    syncLibrary: boolean
  ) {
    const instance = this.editCast()!;

    this.http.patch<void>(
      `${environment.apiUrl}/api/campaign/${this.campaignId()}/castinstances/${instance.instanceId}`,
      {
        ...details,
        voicePlacement: instance.voicePlacement ?? [],
        dmNotes: instance.dmNotes ?? '',
        syncLibrary,
      }
    ).pipe(catchError(() => {
      this._fail();
      return EMPTY;
    }))
      .subscribe(() => {
        if (!syncLibrary) this._mergeKeywords(details.keywords);

        this.http.get<CampaignCastInstance>(
          `${environment.apiUrl}/api/campaign/${this.campaignId()}/castinstances/${instance.instanceId}`
        ).pipe(catchError(() => {
          this._fail();
          return EMPTY;
        }))
          .subscribe(updated => {
            this._done();
            this.saved.emit(updated);
          });
      });
  }

  private _mergeKeywords(keywords: string[]) {
    if (!keywords.length) return;

    forkJoin(keywords.map(keyword =>
      this.http.post(`${environment.apiUrl}/api/campaign-keywords`, { cardType: 'cast', keyword })
        .pipe(catchError(() => of(null)))
    )).subscribe();
  }

  private _done() {
    this.saveStatus.set('saved');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }

  private _fail() {
    this.saveStatus.set('error');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }
}

