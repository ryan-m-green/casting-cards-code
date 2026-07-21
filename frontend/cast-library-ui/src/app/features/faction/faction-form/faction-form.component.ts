import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Faction, FactionColors } from '../../../shared/models/faction.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { IconPickerComponent } from '../../../shared/components/icon-picker/icon-picker.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalDropdownComponent } from '../../../shared/components/journal-dropdown/journal-dropdown.component';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';

export function perceptionLabel(v: number): string {
  if (v ===  5) return 'Trusted';
  if (v ===  4) return 'Allied';
  if (v ===  3) return 'Loyal';
  if (v ===  2) return 'Welcoming';
  if (v ===  1) return 'Friendly';
  if (v ===  0) return 'Neutral';
  if (v === -1) return 'Wary';
  if (v === -2) return 'Suspicious';
  if (v === -3) return 'Unfriendly';
  if (v === -4) return 'Hostile';
  if (v === -5) return 'Enemy';
  return 'Neutral';
}

export const FACTION_TYPE_OPTIONS = [
  'guild', 'order', 'syndicate', 'cult', 'cabal', 'clan', 'tribe', 'house', 'league', 'coalition', 'council', 'empire', 'kingdom', 'dominion', 'confederacy', 'enclave', 'consortium', 'cartel', 'fellowship', 'brotherhood', 'sect', 'circle', 'pact', 'alliance', 'militia', 'regiment', 'brigade', 'company', 'corporation', 'foundation', 'academy', 'commune', 'collective', 'network'
];

@Component({
  selector: 'app-faction-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FactionCardComponent, IconPickerComponent, JournalTitleComponent, JournalDropdownComponent],
  templateUrl: './faction-form.component.html',
  styleUrl: './faction-form.component.scss'
})
export class FactionFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private fb             = inject(FormBuilder);
  private sparkle        = inject(SparkleService);
  private drawerService  = inject(SubscriptionDrawerService);
  auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  factionId      = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  limitError     = signal<string | null>(null);
  imageUrl       = signal<string | null>(null);
  selectedIcon   = signal<string | null>(null);
  typeOptions      = FACTION_TYPE_OPTIONS;
  perceptionLabel  = perceptionLabel;

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(false);

  form = this.fb.group({
    name:        ['', Validators.required],
    type:        ['', Validators.required],
    hidden:      [false],
    description: [''],
    dmNotes:     [''],
    influence:   [0],
    perception:  [0],
    evilColor:   ['#004d1a'],
    goodColor:   ['#ff99bb'],
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
      colors:     {
        evilColor: v.evilColor ?? '#000000',
        goodColor: v.goodColor ?? '#000000',
      },
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
          evilColor:   f.colors?.evilColor ?? '#000000',
          goodColor:   f.colors?.goodColor ?? '#000000',
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
      colors:      {
        evilColor: value.evilColor ?? '#000000',
        goodColor: value.goodColor ?? '#000000',
      },
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
      catchError((err: HttpErrorResponse) => {
        if (err.status === 403) {
          this.limitError.set(err.error);
          this.saveStatus.set('idle');
        } else {
          this.saveStatus.set('error');
          this.fadeLabelTo('Error');
          setTimeout(() => this.saveStatus.set('idle'), 2000);
        }
        return EMPTY;
      })
    ).subscribe(faction => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
      if (!this.factionId()) {
        this.factionId.set(faction.id);
        this.router.navigate(['/gm/faction', faction.id], { replaceUrl: true, queryParams: { upload: 'true' }, state: { noFlip: true } });
      }
    });
  }

  onIconSelected(path: string): void {
    this.selectedIcon.set(path);
    this.imageUrl.set(path);
  }

  get typeControl() { return this.form.get('type') as FormControl; }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
