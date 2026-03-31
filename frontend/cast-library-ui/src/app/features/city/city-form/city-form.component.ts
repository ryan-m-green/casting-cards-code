import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { City } from '../../../shared/models/city.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

const SIZE_OPTIONS = ['Hamlet', 'Village', 'Town', 'Large Town', 'City', 'Large City', 'Metropolis'];

const CONDITION_OPTIONS = [
  'Thriving', 'Stable', 'Declining', 'Struggling', 'Ruined',
  'Rebuilding', 'War-Torn', 'Occupied', 'Abandoned',
];

const GEOGRAPHY_OPTIONS = [
  'Coastal — Ocean', 'Coastal — River Delta', 'Coastal — Cliffside',
  'Riverbank', 'River Crossing / Ford', 'Island', 'Plains / Flatlands',
  'Rolling Hills', 'Mountain Pass', 'High Mountain', 'Deep Forest',
  'Forest Edge', 'Swamp / Marsh', 'Desert Oasis', 'Desert Expanse',
  'Underground / Cavern', 'Floating / Aerial', 'Volcanic',
];

const ARCHITECTURE_OPTIONS = [
  'Timber & Thatch — Rustic village construction',
  'Stone & Mortar — Sturdy, common medieval',
  'Grand Stone — Imposing public buildings',
  'Carved Rock — Cut into cliffs or cavern walls',
  'Elven Woodwork — Living trees, curved organic forms',
  'Dwarven Stonecraft — Heavy, angular, rune-etched',
  'Arcane Spires — Towers crackling with magical energy',
  'Bone & Leather — Tribal, nomadic materials',
  'Marble & Column — Classical imperial style',
  'Mudbrick — Desert or arid construction',
  'Iron & Steam — Industrial, forge-heavy',
  'Ancient Ruins — Built atop or within crumbling structures',
  'Mixed / Eclectic — Many cultures layered over time',
];

const ALL_LANGUAGES = [
  'Common', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc',
  'Abyssal', 'Celestial', 'Draconic', 'Deep Speech', 'Infernal',
  'Primordial', 'Aquan', 'Auran', 'Ignan', 'Terran',
  'Sylvan', 'Undercommon', 'Druidic', "Thieves' Cant",
  'Aarakocra', 'Gith', 'Modron', 'Slaad', 'Sphinx',
  'Bullywug', 'Hook Horror', 'Sahuagin', 'Troglodyte',
  'Drow Sign Language', 'Ixitxachitl',
];

const CLIMATE_OPTIONS = [
  'Tropical — Hot, humid, heavy rain',
  'Subtropical — Warm, seasonal rain',
  'Temperate — Mild seasons, moderate rain',
  'Mediterranean — Hot dry summers, mild wet winters',
  'Continental — Cold winters, warm summers',
  'Subarctic — Long brutal winters, brief summers',
  'Arctic / Tundra — Frozen most of the year',
  'Arid Desert — Scorching days, freezing nights',
  'Semi-Arid — Dry, sparse vegetation',
  'Highland — Cool, thin air, unpredictable storms',
  'Magical — Unnaturally altered by arcane forces',
  'Eternally Stormy — Perpetual storms or fog',
];

@Component({
  selector: 'app-city-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DmNavComponent],
  templateUrl: './city-form.component.html',
  styleUrl: './city-form.component.scss'
})
export class CityFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private http    = inject(HttpClient);
  private fb      = inject(FormBuilder);
  private sparkle = inject(SparkleService);

  sizeOptions         = SIZE_OPTIONS;
  conditionOptions    = CONDITION_OPTIONS;
  geographyOptions    = GEOGRAPHY_OPTIONS;
  architectureOptions = ARCHITECTURE_OPTIONS;
  climateOptions      = CLIMATE_OPTIONS;

  selectedLanguages  = signal<string[]>([]);
  availableLanguages = computed(() =>
    ALL_LANGUAGES.filter(l => !this.selectedLanguages().includes(l))
  );

  cityId         = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  imageUrl       = signal<string | null>(null);
  imageUploading = signal(false);
  showImageModal = signal(false);

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(true);

  form = this.fb.group({
    name:           ['', Validators.required],
    classification: [''],
    size:           [''],
    condition:      [''],
    geography:      [''],
    architecture:   [''],
    climate:        [''],
    religion:       [''],
    vibe:           [''],
    languages:      [''],
    description:    [''],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cityId.set(id);
      this.http.get<City>(`${environment.apiUrl}/api/cities/${id}`).subscribe(c => {
        this.form.patchValue(c);
        this.imageUrl.set(c.imageUrl ?? null);
        const existing = (c.languages ?? '').split(',').map((l: string) => l.trim()).filter(Boolean);
        this.selectedLanguages.set(existing);
      });
    }
    if (this.route.snapshot.queryParamMap.get('upload') === 'true') {
      this.showImageModal.set(true);
    }
  }

  addLanguage(lang: string) {
    this.selectedLanguages.update(list => [...list, lang]);
    this.form.get('languages')!.setValue(this.selectedLanguages().join(', '));
  }

  removeLanguage(lang: string) {
    this.selectedLanguages.update(list => list.filter(l => l !== lang));
    this.form.get('languages')!.setValue(this.selectedLanguages().join(', '));
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
    const req = this.cityId()
      ? this.http.put<City>(`${environment.apiUrl}/api/cities/${this.cityId()}`, this.form.value)
      : this.http.post<City>(`${environment.apiUrl}/api/cities`, this.form.value);

    req.pipe(
      catchError(() => {
        this.saveStatus.set('error');
        this.fadeLabelTo('Error');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
        return EMPTY;
      })
    ).subscribe(city => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
      if (!this.cityId()) {
        this.cityId.set(city.id);
        this.router.navigate(['/dm/cities', city.id], { replaceUrl: true, queryParams: { upload: 'true' }, state: { noFlip: true } });
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file || !this.cityId()) return;
    this.imageUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/cities/${this.cityId()}/image`, formData
    ).subscribe({
      next: res => { this.imageUrl.set(res.imageUrl); this.imageUploading.set(false); },
      error: ()  => { this.imageUploading.set(false); },
    });
  }
}
