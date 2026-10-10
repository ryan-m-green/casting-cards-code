import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EMPTY } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignSublocationInstance, Sublocation } from '../../../../models/sublocation.model';
import { CcTextboxComponent } from '../../../Shared/cc-textbox/cc-textbox.component';
import { CcShopInventoryComponent, ShopItemData } from '../../../Shared/cc-shop-inventory/cc-shop-inventory.component';
import { KeywordTagsComponent } from '../../../Shared/cc-keyword-tags/cc-keyword-tags.component';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

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

  readonly campaignId = input.required<string>();
  readonly locationInstanceId = input.required<string>();

  readonly saved = output<CampaignSublocationInstance>();

  readonly saveStatus = signal<SaveStatus>('idle');

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

  onSave() {
    if (this.sublocationForm.invalid || this.saveStatus() === 'saving') return;
    this.saveStatus.set('saving');

    const raw = this.sublocationForm.value;
    const payload = {
      name: raw.name,
      description: raw.description ?? '',
      dmNotes: raw.dmNotes ?? '',
      keywords: raw.keywords ?? [],
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
