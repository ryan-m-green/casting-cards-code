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

/** Where the form's save has got to; drives the button. */
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * cc-faction-new-form
 *
 * The "new faction" form, lifted out of `portal-import-card`'s faction section so the
 * campaign's faction row can build one in its own drawer. Same fields, same order: the
 * name, the description, the GM box (type, colours, visibility, GM notes, political
 * influence, perception), then the required symbol and the Save button.
 *
 * The v2 campaign components stand in for the portal card's own fields: the three
 * free-text fields are `cc-textbox` in campaign context, the type is
 * `cc-campaign-dropdown`, the colours — together with the perception bar that component
 * carries — are `cc-faction-colors`, the political influence is `cc-political-influence`,
 * and the symbol is `cc-symbol-picker`. Everything is still held in this form's reactive
 * `factionForm`, so the validity check and the save payload are unchanged.
 *
 * Saving writes the faction into the DM's library, then adds it to the campaign, then
 * patches the campaign instance with the form's own influence and perception — the same
 * three calls the portal import card makes, so a faction created here and one created
 * there end up identical.
 */
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

  /** Campaign the finished faction is added to. */
  readonly campaignId = input.required<string>();

  /** The campaign instance, once the faction is in the campaign. */
  readonly saved = output<CampaignFactionInstance>();

  /** The library's faction types, as the campaign dropdown's options (value and label are the type). */
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

  // `cc-faction-colors` and `cc-political-influence` are not form controls (their colours,
  // perception bar and influence slider are models). They are read from the form and written
  // straight back into it, so the reactive form stays the one source of truth and the payload
  // is unchanged.
  get evilColorControl(): FormControl<string | null>  { return this.factionForm.controls.evilColor; }
  get goodColorControl(): FormControl<string | null>  { return this.factionForm.controls.goodColor; }
  get perceptionControl(): FormControl<number | null> { return this.factionForm.controls.perception; }
  get influenceControl(): FormControl<number | null>  { return this.factionForm.controls.influence; }
  get hiddenControl(): FormControl<boolean | null>    { return this.factionForm.controls.hidden; }

  readonly selectedFactionIcon = signal<string | null>(null);
  readonly saveStatus = signal<SaveStatus>('idle');

  /** The DM's own faction keywords, offered as suggestions under the keyword input. */
  readonly keywordOptions = signal<string[]>([]);

  ngOnInit() {
    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=faction`
    ).subscribe({
      next: res => this.keywordOptions.set(res.keywords ?? []),
      error: () => this.keywordOptions.set([]),
    });
  }

  /**
   * The symbol picker's choice, or `''` when its clear button empties it. An empty symbol
   * is this form's `null`, so the required check and the payload's `symbolPath` both keep
   * working off `selectedFactionIcon`.
   */
  onIconSelected(path: string) {
    this.selectedFactionIcon.set(path || null);
  }

  /**
   * Creates the faction, adds it to the campaign, and hands the instance back. The
   * button is dead until the form is valid and a symbol is chosen, so there is nothing
   * here to guard beyond a double save.
   */
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
        // The v2 campaign shell's own faction route (api/campaign/...), which also tells
        // the campaign's hub group that its navigation has changed.
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

            // Patch the instance's own numbers immediately after creation, so the faction
            // the campaign shows is the one the form described.
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
