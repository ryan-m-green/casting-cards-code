import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Location } from '../../../shared/models/location.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalDropdownComponent } from '../../../shared/components/journal-dropdown/journal-dropdown.component';
import { JournalRandomizeButtonComponent } from '../../../shared/components/journal-randomize-button/journal-randomize-button.component';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';

const SIZE_OPTIONS = ['Hamlet', 'Village', 'Town', 'Large Town', 'Location', 'Large Location', 'Metropolis'];

const CLASSIFICATION_OPTIONS = [
  'city', 'town', 'village', 'region', 'province', 'territory', 'country', 'kingdom', 'empire', 'capital', 'district', 'wilderness', 'forest', 'jungle', 'desert', 'tundra', 'mountain range', 'valley', 'canyon', 'plains', 'grasslands', 'highlands', 'lowlands', 'coastline', 'shoreline', 'island', 'archipelago', 'peninsula', 'riverlands', 'wetlands', 'badlands', 'frontier', 'heartland', 'plateau', 'crater', 'volcanic region', 'glacier', 'steppe', 'savanna', 'moorland', 'ocean', 'sea', 'reef', 'cavern system', 'cave network', 'mine system', 'farmland', 'countryside', 'trade hub', 'port city', 'harbor district', 'crossroads region', 'caravan route', 'sacred grounds', 'ruins', 'ancient site', 'archaeological zone'
];

const CONDITION_OPTIONS = [
  'calm', 'peaceful', 'bustling', 'crowded', 'quiet', 'deserted', 'lively', 'festive', 'tense', 'volatile', 'dangerous', 'unstable', 'war‑torn', 'recovering', 'thriving', 'prosperous', 'struggling', 'impoverished', 'neglected', 'fortified', 'guarded', 'patrolled', 'abandoned', 'ruined', 'decaying', 'overgrown', 'pristine', 'untouched', 'polluted', 'toxic', 'hazardous', 'stormy', 'windy', 'rainy', 'flooded', 'drought‑stricken', 'frozen', 'snow‑covered', 'foggy', 'smoky', 'dusty', 'scorching', 'humid', 'temperate', 'frigid', 'eerie', 'cursed', 'blessed', 'sacred', 'corrupted', 'chaotic', 'orderly', 'lawless', 'controlled', 'contested', 'occupied', 'besieged', 'isolated', 'remote', 'connected', 'central', 'strategic', 'forgotten', 'hidden', 'exposed'
];

const GEOGRAPHY_OPTIONS = [
  'mountain', 'mountain range', 'hill', 'valley', 'canyon', 'plateau', 'mesa', 'plain', 'grassland', 'prairie', 'savanna', 'desert', 'dune field', 'tundra', 'glacier', 'ice field', 'forest', 'jungle', 'rainforest', 'swamp', 'marsh', 'wetland', 'bog', 'moor', 'heath', 'coastline', 'beach', 'shoreline', 'cliff', 'reef', 'island', 'archipelago', 'peninsula', 'bay', 'gulf', 'fjord', 'river', 'river delta', 'riverlands', 'lake', 'lagoon', 'pond', 'waterfall', 'spring', 'cave', 'cavern system', 'cave network', 'volcano', 'crater', 'badlands', 'steppe'
];

const ARCHITECTURE_OPTIONS = [
  'ancient stonework', 'classical', 'gothic', 'baroque', 'renaissance', 'medieval', 'rustic', 'rural', 'frontier‑built', 'industrial', 'modern', 'futuristic', 'brutalist', 'minimalist', 'ornate', 'imperial', 'colonial', 'fortified', 'militaristic', 'monastic', 'temple‑focused', 'sacred', 'ceremonial', 'nomadic', 'tribal', 'desert‑carved', 'mountain‑carved', 'forest‑integrated', 'coastal', 'maritime', 'subterranean', 'cavern‑built', 'cliffside‑built', 'sprawling', 'compact', 'labyrinthine', 'orderly', 'chaotic', 'high‑rise', 'low‑rise', 'timber‑framed', 'masonry', 'marble‑heavy', 'metal‑worked', 'glass‑heavy', 'mixed‑material', 'overgrown', 'reclaimed', 'ruined', 'reconstructed', 'pristine'
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
  'tropical', 'subtropical', 'temperate', 'arid', 'semi‑arid', 'mediterranean', 'continental', 'oceanic', 'alpine', 'polar'
];

const RELIGION_OPTIONS = [
  'sun cult', 'moon cult', 'star cult', 'storm faith', 'earth mother', 'sea father', 'fire worship', 'nature druidism', 'beast totemism', 'ancestor worship', 'spirit veneration', 'elemental pantheon', 'celestial pantheon', 'infernal cult', 'abyssal cult', 'death cult', 'life cult', 'harvest faith', 'forge faith', 'knowledge order', 'trickster cult', 'war brotherhood', 'peace fellowship', 'justice order', 'shadow cult', 'light church', 'balance sect', 'time order', 'fate weavers', 'prophecy circle', 'arcane order', 'wild magic cult', 'blood rite cult', 'stone guardians', 'river spirits', 'mountain spirits', 'forest spirits', 'sky spirits', 'seasonal faith', 'spring renewal cult', 'winter vigil', 'autumn rites', 'summer flame cult'
];

const VIBE_OPTIONS = [
  'cozy', 'warm', 'welcoming', 'peaceful', 'serene', 'tranquil', 'lively', 'bustling', 'vibrant', 'festive', 'cheerful', 'whimsical', 'quirky', 'mysterious', 'eerie', 'haunting', 'somber', 'gloomy', 'oppressive', 'tense', 'foreboding', 'dangerous', 'chaotic', 'wild', 'primal', 'sacred', 'reverent', 'solemn', 'majestic', 'awe‑inspiring', 'ancient', 'timeless', 'rustic', 'homely', 'refined', 'elegant', 'gritty', 'rough', 'harsh', 'bleak', 'desolate', 'lonely', 'isolated', 'remote', 'hidden', 'secretive', 'enchanted', 'magical', 'arcane', 'otherworldly', 'surreal', 'dreamlike'
];

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LocationCardComponent, JournalTitleComponent, JournalDropdownComponent, JournalRandomizeButtonComponent],
  templateUrl: './location-form.component.html',
  styleUrl: './location-form.component.scss'
})
export class LocationFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private fb             = inject(FormBuilder);
  private sparkle        = inject(SparkleService);
  private drawerService  = inject(SubscriptionDrawerService);
  auth = inject(AuthService);

  sizeOptions         = SIZE_OPTIONS;
  classificationOptions = CLASSIFICATION_OPTIONS;
  conditionOptions    = CONDITION_OPTIONS;
  geographyOptions    = GEOGRAPHY_OPTIONS;
  architectureOptions = ARCHITECTURE_OPTIONS;
  climateOptions      = CLIMATE_OPTIONS;
  religionOptions     = RELIGION_OPTIONS;
  vibeOptions         = VIBE_OPTIONS;

  selectedLanguages  = signal<string[]>([]);
  availableLanguages = computed(() =>
    ALL_LANGUAGES.filter(l => !this.selectedLanguages().includes(l))
  );

  locationId     = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  limitError     = signal<string | null>(null);
  imageUrl        = signal<string | null>(null);
  imageUploading  = signal(false);
  imageFile       = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(false);

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
    dmNotes:        [''],
  });

  previewLocation = computed<Location>(() => {
    const v = this.form.value;
    return {
      id: this.locationId() ?? '',
      dmUserId: '',
      name: v.name ?? '',
      classification: v.classification ?? '',
      size: v.size ?? '',
      condition: v.condition ?? '',
      geography: v.geography ?? '',
      architecture: v.architecture ?? '',
      climate: v.climate ?? '',
      religion: v.religion ?? '',
      vibe: v.vibe ?? '',
      languages: v.languages ?? '',
      description: v.description ?? '',
      imageUrl: this.imageUrl() ?? undefined,
      createdAt: '',
    };
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.locationId.set(id);
      this.http.get<Location>(`${environment.apiUrl}/api/locations/${id}`).subscribe(c => {
        this.form.patchValue(c);
        this.imageUrl.set(c.imageUrl ?? null);
        const existing = (c.languages ?? '').split(',').map((l: string) => l.trim()).filter(Boolean);
        this.selectedLanguages.set(existing);
      });
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

  get classificationControl() { return this.form.get('classification') as FormControl; }

  get sizeControl() { return this.form.get('size') as FormControl; }

  get conditionControl() { return this.form.get('condition') as FormControl; }

  get geographyControl() { return this.form.get('geography') as FormControl; }

  get architectureControl() { return this.form.get('architecture') as FormControl; }

  get climateControl() { return this.form.get('climate') as FormControl; }

  get religionControl() { return this.form.get('religion') as FormControl; }

  get vibeControl() { return this.form.get('vibe') as FormControl; }

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
    const req = this.locationId()
      ? this.http.put<Location>(`${environment.apiUrl}/api/locations/${this.locationId()}`, this.form.value)
      : this.http.post<Location>(`${environment.apiUrl}/api/locations`, this.form.value);

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
    ).subscribe(location => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => { this.saveStatus.set('idle'); this.labelVisible.set(false); }, 2000);
      if (!this.locationId()) {
        this.locationId.set(location.id);
        const file = this.imageFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const prev = this.imagePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.imageFile.set(null);
          this.imagePreviewUrl.set(null);
          this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/locations/${location.id}/image`, formData).subscribe(() => {
            this.router.navigate(['/gm/locations', location.id], { replaceUrl: true, state: { noFlip: true } });
          });
        } else {
          this.router.navigate(['/gm/locations', location.id], { replaceUrl: true, state: { noFlip: true } });
        }
      }
    });
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
    if (!this.locationId()) return;
    const previousUrl = this.imageUrl();
    const objectUrl   = URL.createObjectURL(file);
    this.imageUrl.set(objectUrl);
    this.imageUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/locations/${this.locationId()}/image`, formData
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

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
