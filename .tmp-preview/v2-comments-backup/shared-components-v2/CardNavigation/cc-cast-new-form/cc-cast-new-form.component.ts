import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignCastInstance, Cast } from '../../../../models/cast.model';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcDialCounterComponent } from '../../Shared/cc-dial-counter/cc-dial-counter.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../Shared/cc-campaign-dropdown/cc-campaign-dropdown.component';
import { KeywordTagsComponent } from '../../Shared/cc-keyword-tags/cc-keyword-tags.component';
import {
  AGE_OPTIONS,
  POSTURE_OPTIONS,
  PRONOUN_OPTIONS,
  RACE_OPTIONS,
  ROLE_OPTIONS,
  SPEED_OPTIONS,
} from '../../../../../features/cast/cast-form/cast-form.component';

/** Where the form's save has got to; drives the button. */
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** The option lists the library's cast form offers, as the campaign dropdown's options. */
const asOptions = (values: string[]): CampaignDropdownOption[] =>
  values.map(value => ({ value, label: value }));

/**
 * cc-cast-new-form
 *
 * The cast form for the realm row's own drawer, and for a cast card's detail panel: the same
 * fields either way, so the two are identical to look at and to fill in — the name, the
 * pronouns, age, role, race, posture and speed, the hit points, the public description, the
 * hashtags, and the GM-only voice notes and description. It mirrors `cc-faction-new-form`: the
 * fields are the v2 campaign components the rest of the drawer is made of (`cc-textbox` in
 * campaign context, `cc-campaign-dropdown`, `cc-dial-counter` and `cc-keyword-tags`), held in
 * this form's own reactive `form`, so the validity check and the payload are the library form's.
 * The dropdowns draw their own suggest lists from the option arrays that form exports, so a cast
 * built here is built from the same words.
 *
 * Two jobs, told apart by `editCast`:
 *
 *  - **nothing to edit** — the cast is built: it is written into the DM's library, then added to
 *    the campaign in the sublocation instance the ＋ stood on (under that sublocation's location,
 *    which the write carries). Those are the two calls the portal import card makes when it
 *    creates a cast for a sublocation, so a cast created here and one created there end up
 *    identical in the campaign.
 *  - **a cast to edit** — the campaign card is written back: the form fills itself from the card,
 *    and Save patches the instance with the form's fields, the campaign's own hidden numbers it
 *    does not ask about (hit points lost, temporary hit points, voice placement, GM notes)
 *    travelling back unchanged. A panel that wants the library card updated too asks for it —
 *    `save(true)` — which is what the detail panel's "Save to Library" button does; the library
 *    write is the server's own (`syncLibrary`), so the two copies stay in step. The hashtags are
 *    merged into the DM's vocabulary either way, as the library's own writes do, so the drawers'
 *    filter buttons learn any new word.
 *
 * The Save row is the form's own unless a detail panel is driving it (`showSaveRow`), in which
 * case that panel's own Save and Cancel buttons stand for it.
 */
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

  /**
   * Campaign the cast is in, and — while the form is building one — the sublocation instance the
   * cast goes into, under the location instance the ＋ stood on. A form standing over a card to
   * edit carries neither, since the card already knows where it lives.
   */
  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input('');
  readonly sublocationInstanceId = input('');

  /** The campaign card being edited. Left out, the form builds a new cast instead. */
  readonly editCast = input<CampaignCastInstance | null>(null);

  /**
   * Whether the form draws its own Save row. A detail panel passes `false` and drives the save
   * from its own button (see `save`), so the panel keeps one pair of Save and Cancel controls.
   */
  readonly showSaveRow = input<boolean>(true);

  /** The campaign instance, once the cast has been written. */
  readonly saved = output<CampaignCastInstance>();

  readonly saveStatus = signal<SaveStatus>('idle');

  /** Whether the form is standing over a card to edit rather than building a new cast. */
  readonly isEditing = computed(() => this.editCast() !== null);

  /** The campaign's own cast hashtags, as the keyword field's suggestions. */
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

    // Standing over a card: the fields arrive filled with it, so the GM edits what is there.
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

  /** The form's own Save button, which builds a cast or writes the one being edited back. */
  onSave() {
    this.save();
  }

  /**
   * Writes the form. `syncLibrary` is the detail panel's "Save to Library": the campaign card is
   * written either way, and the library card behind it only when asked (see the class comment).
   *
   * The button is dead until the form is valid, so there is nothing here to guard beyond a
   * double save.
   */
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

  /** The fields the form holds, as both the library's request and the campaign's answer them. */
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

  /**
   * Builds the cast: into the DM's library, then into the campaign in the sublocation the ＋
   * stood on, which is the sublocation under the location instance it carries.
   */
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

  /**
   * Writes the card being edited back. The campaign's own numbers the form does not ask about —
   * hit points lost, temporary hit points, voice placement and GM notes — travel back as they
   * stand, so saving a name does not put a wounded cast back on its feet.
   *
   * The write answers with nothing, so the card is read back for the panel to show: the
   * campaign's own version of it rather than what the form happened to hold.
   */
  private _saveEdit(
    details: ReturnType<CcCastNewFormComponent['_detailsFromForm']>,
    syncLibrary: boolean
  ) {
    const instance = this.editCast()!;

    this.http.patch<void>(
      `${environment.apiUrl}/api/campaign/${this.campaignId()}/castinstances/${instance.instanceId}`,
      {
        ...details,
        lostHitPoints: instance.lostHitPoints ?? 0,
        tempHitPoints: instance.tempHitPoints ?? 0,
        voicePlacement: instance.voicePlacement ?? [],
        dmNotes: instance.dmNotes ?? '',
        syncLibrary,
      }
    ).pipe(catchError(() => {
      this._fail();
      return EMPTY;
    }))
      .subscribe(() => {
        // A library write merges the hashtags into the DM's vocabulary on the server's own
        // side; a plain campaign-card write does not, so the words are offered to it here.
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

  /**
   * Offers the form's hashtags to the DM's vocabulary for cast cards (`campaign_keywords`), which
   * is what the drawers' filter buttons are made of and what the library's own writes keep up to
   * date. The index takes a word once, so offering one it already has costs nothing.
   */
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

