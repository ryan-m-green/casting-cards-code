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
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';

@Component({
  selector: 'app-sublocation-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DmNavComponent, SublocationCardComponent],
  templateUrl: './sublocation-form.component.html',
  styleUrl: './sublocation-form.component.scss'
})
export class SublocationFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private http    = inject(HttpClient);
  private fb      = inject(FormBuilder);
  private sparkle = inject(SparkleService);

  sublocationId  = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  imageUrl       = signal<string | null>(null);
  imageUploading = signal(false);

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(true);
  form = this.fb.group({
    name:        ['', Validators.required],
    description: [''],
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
        price: item.priceAmount != null ? `${item.priceAmount} ${item.priceCurrency}` : '',
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
        this.form.patchValue({ name: l.name, description: l.description });
        l.shopItems?.forEach(item => this.shopItems.push(this.newItem(item.name, item.price, item.description)));
        this.imageUrl.set(l.imageUrl ?? null);
      });
    }
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
        this.imageUrl.set(res.imageUrl);
        this.imageUploading.set(false);
      },
      error: () => {
        URL.revokeObjectURL(objectUrl);
        this.imageUrl.set(previousUrl);
        this.imageUploading.set(false);
      },
    });
  }

  newItem(name = '', price = '', description = ''): FormGroup {
    const { amount, currency } = this.parsePrice(price);
    return this.fb.group({
      name:          [name],
      priceAmount:   [amount, [Validators.min(1), Validators.max(9999)]],
      priceCurrency: [currency],
      description:   [description],
    });
  }

  private parsePrice(price: string): { amount: number | null; currency: string } {
    if (!price) return { amount: null, currency: 'gp' };
    const parts = price.trim().split(/\s+/);
    const amount = parseInt(parts[0], 10);
    const currency = parts[1] ?? 'gp';
    return { amount: isNaN(amount) ? null : amount, currency };
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
        name:        item.name,
        price:       item.priceAmount != null ? `${item.priceAmount} ${item.priceCurrency}` : '',
        description: item.description,
      })),
    };
    const req = this.sublocationId()
      ? this.http.put<Sublocation>(`${environment.apiUrl}/api/sublocations/${this.sublocationId()}`, payload)
      : this.http.post<Sublocation>(`${environment.apiUrl}/api/sublocations`, payload);

    req.pipe(
      catchError(() => {
        this.saveStatus.set('error');
        this.fadeLabelTo('Error');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
        return EMPTY;
      })
    ).subscribe(subLoc => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
      if (!this.sublocationId()) {
        this.sublocationId.set(subLoc.id);
        this.router.navigate(['/dm/sublocations', subLoc.id], { replaceUrl: true, queryParams: { upload: 'true' }, state: { noFlip: true } });
      }
    });
  }
}
