import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormGroup } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Sublocation } from '../../../shared/models/sublocation.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-sublocation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, SublocationCardComponent, JournalTitleComponent],
  templateUrl: './sublocation-form.component.html',
  styleUrl: './sublocation-form.component.scss'
})
export class SublocationFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private fb             = inject(FormBuilder);
  private sparkle        = inject(SparkleService);
  private drawerService  = inject(SubscriptionDrawerService);
  auth = inject(AuthService);

  sublocationId  = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  limitError     = signal<string | null>(null);
  imageUrl        = signal<string | null>(null);
  imageUploading  = signal(false);
  imageFile       = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(false);
  form = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
    dmNotes:     [''],
    shopItems:   this.fb.array([]),
  });

  get shopItems() { return this.form.get('shopItems') as FormArray; }

  previewSublocation = computed<Sublocation>(() => {
    const v = this.form.value;
    return {
      id: this.sublocationId() ?? '',
      locationId: '',
      dmUserId: '',
      name: v.name ?? '',
      description: v.description ?? '',
      imageUrl: this.imageUrl() ?? undefined,
      shopItems: (v.shopItems ?? []).map((item: any, i: number) => ({
        id: String(i),
        name: item.name ?? '',
        priceAmount: item.priceAmount ?? 0,
        priceCurrencyType: item.priceCurrencyType ?? 'gp',
        description: item.description ?? '',
        isScratchedOff: false,
      })),
      createdAt: '',
    };
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.sublocationId.set(id);
      this.http.get<Sublocation>(`${environment.apiUrl}/api/sublocations/${id}`).subscribe(l => {
        this.form.patchValue({ name: l.name, description: l.description, dmNotes: l.dmNotes ?? '' });
        l.shopItems?.forEach(item => this.shopItems.push(this.newItem(item.name, item.priceAmount, item.priceCurrencyType, item.description)));
        this.imageUrl.set(l.imageUrl ?? null);
      });
    }
  }

  onPortraitFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  onFileSelected(file: File) {
    if (!this.sublocationId()) return;
    const previousUrl = this.imageUrl();
    const objectUrl   = URL.createObjectURL(file);
    this.imageUrl.set(objectUrl);
    this.imageUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/sublocations/${this.sublocationId()}/image`, formData
    ).subscribe({
      next: res => {
        URL.revokeObjectURL(objectUrl);
        const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
        this.imageUrl.set(cacheBustedUrl);
        this.imageUploading.set(false);
      },
      error: () => {
        URL.revokeObjectURL(objectUrl);
        this.imageUrl.set(previousUrl);
        this.imageUploading.set(false);
      },
    });
  }

  newItem(name = '', priceAmount: number | null = null, priceCurrencyType = 'gp', description = ''): FormGroup {
    return this.fb.group({
      name:             [name],
      priceAmount:      [priceAmount, [Validators.min(1), Validators.max(9999)]],
      priceCurrencyType:[priceCurrencyType],
      description:      [description],
    });
  }

  addItem()             { this.shopItems.push(this.newItem()); }
  removeItem(i: number) { this.shopItems.removeAt(i); }

  onSave(e: MouseEvent): void {
    if (this.form.invalid || this.saveStatus() === 'saving') return;
    this.sparkle.trigger(this.sparkHost.nativeElement);
    this.fadeLabelTo('Saving…');
    this.save();
  }

  private fadeLabelTo(text: 'Saved' | 'Saving…' | 'Error'): void {
    this.labelVisible.set(false);
    setTimeout(() => {
      this.labelText.set(text);
      this.labelVisible.set(true);
    }, 280);
  }

  save() {
    if (this.form.invalid) return;
    this.saveStatus.set('saving');
    const formValue = this.form.value;
    const payload = {
      ...formValue,
      shopItems: formValue.shopItems?.map((item: any) => ({
        name:             item.name,
        priceAmount:      item.priceAmount ?? 0,
        priceCurrencyType: item.priceCurrencyType ?? 'gp',
        description:      item.description,
      })),
    };
    const req = this.sublocationId()
      ? this.http.put<Sublocation>(`${environment.apiUrl}/api/sublocations/${this.sublocationId()}`, payload)
      : this.http.post<Sublocation>(`${environment.apiUrl}/api/sublocations`, payload);

    req.pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.limitError.set(err.error);
          this.saveStatus.set('idle');
        } else {
          this.saveStatus.set('error');
          this.fadeLabelTo('Error');
          setTimeout(() => { this.saveStatus.set('idle'); this.labelVisible.set(false); }, 2000);
        }
        return EMPTY;
      })
    ).subscribe(subLoc => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => { this.saveStatus.set('idle'); this.labelVisible.set(false); }, 2000);
      if (!this.sublocationId()) {
        this.sublocationId.set(subLoc.id);
        const file = this.imageFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const prev = this.imagePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.imageFile.set(null);
          this.imagePreviewUrl.set(null);
          this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/sublocations/${subLoc.id}/image`, formData).subscribe(() => {
            this.router.navigate(['/gm/sublocations', subLoc.id], { replaceUrl: true, state: { noFlip: true } });
          });
        } else {
          this.router.navigate(['/gm/sublocations', subLoc.id], { replaceUrl: true, state: { noFlip: true } });
        }
      }
    });
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
