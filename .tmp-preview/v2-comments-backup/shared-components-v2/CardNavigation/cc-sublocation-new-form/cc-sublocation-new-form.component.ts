import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignSublocationInstance, Sublocation } from '../../../../models/sublocation.model';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { CcShopInventoryComponent, ShopItemData } from '../cc-shop-inventory/cc-shop-inventory.component';
import { KeywordTagsComponent } from '../../Shared/cc-keyword-tags/cc-keyword-tags.component';

/** Where the form's save has got to; drives the button. */
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * cc-sublocation-new-form
 *
 * The "new sublocation" form for the realm row's own drawer. It mirrors
 * `cc-faction-new-form`: the same fields the library's sublocation form keeps (the name, the
 * description, the hashtags, the GM notes and the shop inventory), drawn with the v2 campaign
 * components the rest of the drawer is made of — `cc-textbox` in campaign context for the free
 * text, `cc-keyword-tags` for the hashtags and `cc-shop-inventory` for the shop — and held in
 * this form's own reactive `form`, so the validity check and the save payload are the library
 * form's.
 *
 * Saving writes the sublocation into the DM's library, then adds it to the campaign under the
 * location instance the ＋ stood on — the two calls the portal import card makes when it
 * creates a sublocation for a location — so a sublocation created here and one created there
 * end up identical in the campaign.
 */
@Component({
  selector: 'cc-sublocation-new-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CcTextboxComponent, CcShopInventoryComponent, KeywordTagsComponent],
  templateUrl: './cc-sublocation-new-form.component.html',
  styleUrl: './cc-sublocation-new-form.component.scss'
})
export class CcSublocationNewFormComponent implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  /** Campaign the finished sublocation is added to, and the location instance it goes under. */
  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input.required<string>();

  /** The campaign instance, once the sublocation is in the campaign. */
  readonly saved = output<CampaignSublocationInstance>();

  readonly saveStatus = signal<SaveStatus>('idle');

  /** The campaign's own sublocation hashtags, as the keyword field's suggestions. */
  readonly keywordOptions = signal<string[]>([]);

  readonly sublocationForm = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    dmNotes: [''],
    keywords: [[] as string[]],
    shopItems: [[] as ShopItemData[]],
  });

  ngOnInit() {
    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=sublocation`
    ).subscribe({
      next: res => this.keywordOptions.set(res.keywords ?? []),
      error: () => this.keywordOptions.set([]),
    });
  }

  /**
   * Creates the sublocation, adds it to the campaign under the location the ＋ stood on, and
   * hands the instance back. The button is dead until the form is valid, so there is nothing
   * here to guard beyond a double save.
   */
  onSave() {
    if (this.sublocationForm.invalid || this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');

    const raw = this.sublocationForm.value;
    const payload = {
      name: raw.name,
      description: raw.description ?? '',
      dmNotes: raw.dmNotes ?? '',
      keywords: raw.keywords ?? [],
      // The port of the shop the DM wrote. The drawer's own inventory component hands back only
      // the items it could read back in full (a name and a price), and the library's request
      // wants a plain number, so an amount the DM left blank is written as nothing.
      shopItems: (raw.shopItems ?? []).map(item => ({
        name: item.name,
        priceAmount: item.priceAmount ?? 0,
        priceCurrencyType: item.priceCurrencyType || 'gp',
        description: item.description ?? '',
      })),
    };

    this.http.post<Sublocation>(`${environment.apiUrl}/api/sublocations`, payload)
      .pipe(catchError(() => {
        this._fail();
        return EMPTY;
      }))
      .subscribe(sublocation => {
        this.http.post<CampaignSublocationInstance>(
          `${environment.apiUrl}/api/campaigns/${this.campaignId()}/sublocations`,
          { sublocationId: sublocation.id, locationInstanceId: this.locationInstanceId() }
        ).pipe(catchError(() => {
          this._fail();
          return EMPTY;
        }))
          .subscribe(instance => {
            this.saveStatus.set('saved');
            setTimeout(() => this.saveStatus.set('idle'), 2000);

            this.sublocationForm.reset({ name: '', description: '', dmNotes: '', keywords: [], shopItems: [] });
            this.saved.emit(instance);
          });
      });
  }

  private _fail() {
    this.saveStatus.set('error');
    setTimeout(() => this.saveStatus.set('idle'), 2000);
  }
}
