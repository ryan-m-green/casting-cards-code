import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignFactionInstance, Faction } from '../../../../models/faction.model';
import { CcSymbolPickerComponent } from '../../Shared/cc-symbol-picker/cc-symbol-picker.component';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../Shared/cc-campaign-dropdown/cc-campaign-dropdown.component';
import { CcFactionColorsComponent } from '../../Shared/cc-faction-colors/cc-faction-colors.component';
import { CcPoliticalInfluenceComponent } from '../../Shared/cc-political-influence/cc-political-influence.component';
import { CcFactionVisibilityComponent } from '../cc-faction-visibility/cc-faction-visibility.component';
import { KeywordTagsComponent } from '../../Shared/cc-keyword-tags/cc-keyword-tags.component';
import { FACTION_TYPE_OPTIONS } from '../../../../../features/faction/faction-form/faction-form.component';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'cc-faction-new-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CcTextboxComponent, CampaignDropdownComponent, CcFactionColorsComponent, CcPoliticalInfluenceComponent, CcFactionVisibilityComponent, CcSymbolPickerComponent, KeywordTagsComponent],
  templateUrl: './cc-faction-new-form.component.html',
  styleUrl: './cc-faction-new-form.component.scss'
})
export class CcFactionNewFormComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  readonly campaignId = input.required<string>();

  readonly saved = output<CampaignFactionInstance>();

  readonly factionTypeOptions: CampaignDropdownOption[] =
    FACTION_TYPE_OPTIONS.map(type => ({ value: type, label: type }));

  factionForm = this.fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    description: [''],
    dmNotes: [''],
    influence: [0],
    perception: [0],
    hidden: [false],
    goodColor: ['#ff99bb'],
    evilColor: ['#004d1a'],
    keywords: this.fb.control<string[]>([]),
  });

  get evilColorControl(): FormControl<string | null>  { return this.factionForm.controls.evilColor; }
  get goodColorControl(): FormControl<string | null>  { return this.factionForm.controls.goodColor; }
  get perceptionControl(): FormControl<number | null> { return this.factionForm.controls.perception; }
  get influenceControl(): FormControl<number | null>  { return this.factionForm.controls.influence; }
  get hiddenControl(): FormControl<boolean | null>    { return this.factionForm.controls.hidden; }

  readonly selectedFactionIcon = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('idle');

  readonly keywordOptions = signal<string[]>([]);

  ngOnInit() {
    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=faction`
    ).subscribe({
      next: res => this.keywordOptions.set(res.keywords ?? []),
      error: () => this.keywordOptions.set([]),
    });
  }

  onIconSelected(path: string) {
    this.selectedFactionIcon.set(path || null);
  }

  onSave() {
    if (this.factionForm.invalid || !this.selectedFactionIcon() || this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');

    const raw = this.factionForm.value;
    const payload = {
      name: raw.name,
      type: raw.type,
      description: raw.description ?? undefined,
      dmNotes: raw.dmNotes ?? undefined,
      hidden: raw.hidden ?? false,
      influence: raw.influence ?? 0,
      perception: raw.perception ?? 0,
      keywords: raw.keywords ?? [],
      symbolPath: this.selectedFactionIcon() ?? undefined,
      colors: {
        goodColor: raw.goodColor ?? '#ff99bb',
        evilColor: raw.evilColor ?? '#004d1a',
      },
    };

    this.http.post<Faction>(`${environment.apiUrl}/api/factions`, payload)
      .pipe(catchError(() => {
        this._fail();
        return EMPTY;
      }))
      .subscribe(faction => {
        this.http.post<CampaignFactionInstance>(
          `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions`,
          { factionId: faction.id }
        ).pipe(catchError(() => {
          this._fail();
          return EMPTY;
        }))
          .subscribe(instance => {
            this.saveStatus.set('saved');
            setTimeout(() => this.saveStatus.set('idle'), 2000);

            const influence = raw.influence ?? 0;
            const perception = raw.perception ?? 0;

            this.http.patch(
              `${environment.apiUrl}/api/campaign/${this.campaignId()}/factions/${instance.factionInstanceId}`,
              { name: instance.name, type: instance.type, description: instance.description ?? '', hidden: instance.hidden, dmNotes: instance.dmNotes ?? '', influence, perception, syncLibrary: false }
            ).subscribe();

            this.factionForm.reset({
              name: '',
              type: '',
              description: '',
              dmNotes: '',
              influence: 0,
              perception: 0,
              hidden: false,
              goodColor: '#ff99bb',
              evilColor: '#004d1a',
              keywords: [],
            });
            this.selectedFactionIcon.set(null);

            this.saved.emit({ ...instance, influence, perception });
          });
      });
  }

  private _fail() {
    this.saveStatus.set('error');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }
}
