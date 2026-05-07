import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Faction } from '../../../shared/models/faction.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { IconPickerComponent } from '../../../shared/components/icon-picker/icon-picker.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';

export function perceptionLabel(v: number): string {
  if (v ===  5) return 'Revered';
  if (v ===  4) return 'Admired';
  if (v ===  3) return 'Respected';
  if (v ===  2) return 'Liked';
  if (v ===  1) return 'Friendly';
  if (v ===  0) return 'Neutral';
  if (v === -1) return 'Suspicious';
  if (v === -2) return 'Distrusted';
  if (v === -3) return 'Disliked';
  if (v === -4) return 'Despised';
  if (v === -5) return 'Reviled';
  return 'Neutral';
}

export const FACTION_TYPE_OPTIONS = [
  'Criminal Syndicate',
  'Guild',
  'Military Order',
  'Political Body',
  'Religious Cult',
  'Secret Society',
];

@Component({
  selector: 'app-faction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FactionCardComponent, IconPickerComponent, JournalTitleComponent],
  templateUrl: './faction-form.component.html',
  styleUrl: './faction-form.component.scss'
})
export class FactionFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private http    = inject(HttpClient);
  private fb      = inject(FormBuilder);
  private sparkle = inject(SparkleService);
  private destroyRef = inject(DestroyRef);

  factionId      = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  imageUrl       = signal<string | null>(null);
  selectedIcon   = signal<string | null>(null);
  typeOptions      = FACTION_TYPE_OPTIONS;
  perceptionLabel  = perceptionLabel;

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(true);

  form = this.fb.group({
    name:        ['', Validators.required],
    type:        [FACTION_TYPE_OPTIONS[0], Validators.required],
    hidden:      [false],
    description: [''],
    dmNotes:     [''],
    influence:   [0],
    perception:  [0],
  });

  private formValue = signal(this.form.value);

  previewFaction = computed<Faction>(() => {
    const v = this.formValue();
    return {
      id:         this.factionId() ?? '',
      dmUserId:   '',
      name:       v.name ?? '',
      type:       v.type ?? '',
      influence:  v.influence ?? 0,
      perception: v.perception ?? 0,
      hidden:     v.hidden ?? false,
      imageUrl:   this.imageUrl() ?? undefined,
      createdAt:  '',
    };
  });

  ngOnInit() {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.formValue.set(v));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.factionId.set(id);
      this.http.get<Faction>(`${environment.apiUrl}/api/factions/${id}`).subscribe(f => {
        this.form.patchValue({
          name:        f.name,
          type:        f.type,
          hidden:      f.hidden,
          description: f.description ?? '',
          dmNotes:     f.dmNotes ?? '',
          influence:   f.influence ?? 0,
          perception:  f.perception ?? 0,
        });
        this.imageUrl.set(f.imageUrl ?? null);
        if (f.symbolPath) {
          this.selectedIcon.set(f.symbolPath);
          this.imageUrl.set(f.symbolPath);
        }
      });
    }
  }

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
    const value = this.form.value;
    const payload = {
      name:        value.name,
      type:        value.type,
      hidden:      value.hidden ?? false,
      description: value.description ?? undefined,
      dmNotes:     value.dmNotes ?? undefined,
      influence:   value.influence ?? 0,
      perception:  value.perception ?? 0,
      symbolPath:  this.selectedIcon() ?? undefined,
    };

    const req = this.factionId()
      ? this.http.put<Faction>(`${environment.apiUrl}/api/factions/${this.factionId()}`, payload)
      : this.http.post<Faction>(`${environment.apiUrl}/api/factions`, payload);

    req.pipe(
      catchError(() => {
        this.saveStatus.set('error');
        this.fadeLabelTo('Error');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
        return EMPTY;
      })
    ).subscribe(faction => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
      if (!this.factionId()) {
        this.factionId.set(faction.id);
        this.router.navigate(['/dm/faction', faction.id], { replaceUrl: true, queryParams: { upload: 'true' }, state: { noFlip: true } });
      }
    });
  }

  onIconSelected(path: string): void {
    this.selectedIcon.set(path);
    this.imageUrl.set(path);

    if (this.form.invalid) return;
    this.fadeLabelTo('Saving…');
    this.saveStatus.set('saving');

    const value = this.form.value;
    const payload = {
      name:        value.name,
      type:        value.type,
      hidden:      value.hidden ?? false,
      description: value.description ?? undefined,
      dmNotes:     value.dmNotes ?? undefined,
      symbolPath:  path,
    };

    const req = this.factionId()
      ? this.http.put<Faction>(`${environment.apiUrl}/api/factions/${this.factionId()}`, payload)
      : this.http.post<Faction>(`${environment.apiUrl}/api/factions`, payload);

    req.pipe(
      catchError(() => {
        this.saveStatus.set('error');
        this.fadeLabelTo('Error');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
        return EMPTY;
      })
    ).subscribe(faction => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
      if (!this.factionId()) {
        this.factionId.set(faction.id);
        this.router.navigate(['/dm/faction', faction.id], { replaceUrl: true, queryParams: { upload: 'true' }, state: { noFlip: true } });
      }
    });
  }

  }
