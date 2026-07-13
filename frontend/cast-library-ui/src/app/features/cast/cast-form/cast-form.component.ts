import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators, FormControl } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cast } from '../../../shared/models/cast.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalDropdownComponent } from '../../../shared/components/journal-dropdown/journal-dropdown.component';
import { JournalRandomizeButtonComponent } from '../../../shared/components/journal-randomize-button/journal-randomize-button.component';
import { HttpErrorResponse } from '@angular/common/http';
import { SubscriptionDrawerService } from '../../../core/subscription-drawer.service';
import { AuthService } from '../../../core/auth/auth.service';

const VOICE_OPTIONS = ['chest', 'throat', 'mouth / oral', 'nasal', 'head / sinus'];

const POSTURE_OPTIONS = [
  'upright', 'slouched', 'hunched', 'rigid', 'relaxed', 'open', 'closed‑off', 'confident', 'defensive', 'aggressive', 'passive', 'dominant', 'submissive', 'balanced', 'unsteady', 'leaning forward', 'leaning back', 'leaning to the side', 'arms crossed', 'hands on hips', 'hands behind back', 'military‑straight', 'casual', 'tense', 'loose', 'curved spine', 'straight spine', 'reclined', 'perched', 'crouched', 'kneeling', 'squatting', 'wide‑stance', 'narrow‑stance', 'asymmetrical', 'symmetrical', 'tall', 'compressed'
];

const SPEED_OPTIONS = [
  'slow & deliberate', 'steady drumbeat', 'brisk', 'quick & hurried', 'nervous & rushed', 'measured', 'lumbering', 'graceful', 'sluggish', 'easygoing', 'calm & steady', 'smooth‑moving', 'relaxed pace', 'casual stride', 'purposeful stride', 'energetic', 'lively', 'darting', 'jittery', 'frantic', 'rapid‑fire', 'snappy', 'hurried', 'urgent', 'plodding', 'creeping', 'tentative', 'cautious', 'bold & decisive', 'fluid', 'sprightly', 'swift', 'nimble', 'light‑footed', 'heavy‑footed', 'stomping', 'drifting', 'wandering', 'methodical', 'stop‑and‑go', 'erratic', 'unpredictable'
];

const ALIGNMENT_OPTIONS = [
  'lawful good', 'neutral good', 'chaotic good',
  'lawful neutral', 'true neutral', 'chaotic neutral',
  'lawful evil', 'neutral evil', 'chaotic evil',
];

const PRONOUN_OPTIONS = [
  'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'it/its', 'any pronouns',
];

const AGE_OPTIONS = [
  'infant', 'toddler', 'child', 'youth', 'teen', 'youngadult', 'adult', 'midlife', 'elder', 'ancient'
];

const ROLE_OPTIONS = [
  'innkeeper', 'blacksmith', 'guildmaster', 'archivist', 'captain of the guard', 'merchant', 'healer', 'stablemaster', 'hunter', 'court advisor', 'high priest', 'ship captain', 'artificer', 'scout', 'mayor', 'quest scribe', 'wizard', 'bard', 'smuggler', 'naturalist', 'cartographer', 'diplomat', 'herbalist', 'monster hunter', 'librarian', 'alchemist', 'fence', 'noble', 'scribe', 'ranger', 'cook', 'quartermaster', 'engineer', 'spy', 'gladiator trainer', 'caravan leader', 'historian', 'sailor', 'miner', 'architect', 'tailor', 'brewer', 'butcher', 'farmer', 'shepherd', 'fisher', 'mason', 'jeweler', 'banker', 'tax collector', 'magistrate', 'lawyer', 'doctor', 'undertaker', 'gravekeeper', 'fortune teller', 'oracle', 'prophet', 'druid', 'shaman', 'beast tamer', 'falconer', 'weaponsmith', 'armorer', 'leatherworker', 'bowyer', 'fletcher', 'potion maker', 'scroll scribe', 'map seller', 'street performer', 'pickpocket', 'beggar', 'bounty hunter', 'mercenary', 'bodyguard', 'assassin', 'scout captain', 'guard recruiter', 'prison warden', 'jailor', 'courier', 'messenger', 'stablehand', 'dockworker', 'harbor master', 'lighthouse keeper', 'weather watcher', 'explorer', 'archaeologist', 'relic hunter', 'sage', 'tutor', 'professor', 'student', 'ritualist', 'cult leader', 'acolyte', 'temple attendant', 'festival organizer', 'town crier', 'auctioneer', 'market overseer'
];

const RACE_OPTIONS = [
  'human', 'elf', 'high elf', 'wood elf', 'dark elf', 'drow', 'half‑elf', 'dwarf', 'hill dwarf', 'mountain dwarf', 'halfling', 'lightfoot halfling', 'stout halfling', 'gnome', 'forest gnome', 'rock gnome', 'orc', 'half‑orc', 'goblin', 'hobgoblin', 'bugbear', 'kobold', 'dragonborn', 'tiefling', 'aasimar', 'genasi', 'fire genasi', 'water genasi', 'air genasi', 'earth genasi', 'tabaxi', 'kenku', 'tortle', 'lizardfolk', 'triton', 'firbolg', 'goliath', 'minotaur', 'centaur', 'satyr', 'leonin', 'merfolk', 'changeling', 'shifter', 'warforged', 'kalashtar', 'vedalken', 'simic hybrid', 'aarakocra', 'yuan‑ti pureblood', 'fairy', 'harengon', 'githyanki', 'githzerai', 'duergar', 'svirfneblin', 'eladrin', 'sea elf', 'shadar‑kai', 'reborn', 'dhampir', 'hexblood', 'vampire', 'werewolf', 'catfolk', 'ratfolk', 'tengu', 'kitsune', 'ifrit', 'undine', 'sylph', 'oread', 'fetchling', 'grippli', 'vanara', 'nagaji', 'samsaran', 'skinwalker', 'gillman', 'android', 'lashunta', 'vesk', 'ysoki', 'kasatha', 'half‑giant', 'thri‑kreen', 'mul', 'elan', 'maenad', 'blue', 'loxodon', 'owlin', 'plasmoid', 'autognome', 'hadozee', 'giff', 'locathah', 'khenra', 'naga', 'serpentfolk', 'birdfolk', 'foxfolk', 'wolffolk', 'bearfolk', 'rabbitfolk', 'turtlefolk', 'insectfolk', 'construct', 'living construct', 'elemental‑touched', 'celestial‑touched', 'infernal‑touched', 'fey‑touched', 'shadow‑touched', 'giant‑kin'
];


@Component({
  selector: 'app-cast-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CastCardComponent, JournalTitleComponent, JournalDropdownComponent, JournalRandomizeButtonComponent],
  templateUrl: './cast-form.component.html',
  styleUrl: './cast-form.component.scss'
})
export class CastFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route          = inject(ActivatedRoute);
  private router         = inject(Router);
  private http           = inject(HttpClient);
  private fb             = inject(FormBuilder);
  private sparkle        = inject(SparkleService);
  private drawerService  = inject(SubscriptionDrawerService);
  auth = inject(AuthService);

  castId         = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  limitError     = signal<string | null>(null);
  imageUrl        = signal<string | null>(null);
  imageUploading  = signal(false);
  imageFile       = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  voiceOptions     = VOICE_OPTIONS;
  pronounOptions   = PRONOUN_OPTIONS;
  ageOptions       = AGE_OPTIONS;
  roleOptions      = ROLE_OPTIONS;
  raceOptions      = RACE_OPTIONS;
  alignmentOptions = ALIGNMENT_OPTIONS;
  postureOptions   = POSTURE_OPTIONS;
  speedOptions     = SPEED_OPTIONS;

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(false);

  form = this.fb.group({
    name:              ['', Validators.required],
    role:              [''],
    race:              [''],
    age:               [''],
    alignment:         [''],
    pronouns:          [''],
    posture:           [''],
    speed:             [''],
    publicDescription: [''],
    description:       [''],
    voicePlacement:    this.fb.array(VOICE_OPTIONS.map(() => false)),
    voiceNotes:        [''],
  });

  previewCast = computed<Cast>(() => {
    const v = this.form.value;
    const vp = (v.voicePlacement as boolean[] | undefined) ?? [];
    return {
      id: this.castId() ?? '',
      dmUserId: '',
      name: v.name ?? '',
      role: v.role ?? '',
      race: v.race ?? '',
      age: v.age ?? '',
      alignment: v.alignment ?? '',
      pronouns: v.pronouns ?? '',
      posture: v.posture ?? '',
      speed: v.speed ?? '',
      voicePlacement: VOICE_OPTIONS.filter((_, i) => vp[i]),
      voiceNotes: v.voiceNotes ?? '',
      description: v.description ?? '',
      publicDescription: v.publicDescription ?? '',
      imageUrl: this.imageUrl() ?? undefined,
      createdAt: '',
    };
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.castId.set(id);
      this.http.get<Cast>(`${environment.apiUrl}/api/cast/${id}`).subscribe(cast => {
        this.form.patchValue({
          name: cast.name, role: cast.role, race: cast.race, age: cast.age,
          alignment: cast.alignment, pronouns: cast.pronouns, posture: cast.posture,
          speed: cast.speed, publicDescription: cast.publicDescription, description: cast.description,
          voiceNotes: cast.voiceNotes,
        });
        const vpArray = this.form.get('voicePlacement') as FormArray;
        const normalize = (s: string) => s.toLowerCase().replace(/\s*\/\s*/g, '/').trim();
        VOICE_OPTIONS.forEach((opt, i) => {
          vpArray.at(i).setValue(cast.voicePlacement?.some(v => normalize(v) === normalize(opt)) ?? false);
        });
        this.imageUrl.set(cast.imageUrl ?? null);
      });
    }
  }

  get voicePlacementArray() { return this.form.get('voicePlacement') as FormArray; }

  get pronounsControl() { return this.form.get('pronouns') as FormControl; }

  get ageControl() { return this.form.get('age') as FormControl; }

  get roleControl() { return this.form.get('role') as FormControl; }

  get raceControl() { return this.form.get('race') as FormControl; }

  get postureControl() { return this.form.get('posture') as FormControl; }

  get speedControl() { return this.form.get('speed') as FormControl; }

  get alignmentControl() { return this.form.get('alignment') as FormControl; }

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
    const value = this.buildPayload();
    const req = this.castId()
      ? this.http.put<Cast>(`${environment.apiUrl}/api/cast/${this.castId()}`, value)
      : this.http.post<Cast>(`${environment.apiUrl}/api/cast`, value);

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
    ).subscribe(cast => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => { this.saveStatus.set('idle'); this.labelVisible.set(false); }, 2000);
      if (!this.castId()) {
        this.castId.set(cast.id);
        const file = this.imageFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const prev = this.imagePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.imageFile.set(null);
          this.imagePreviewUrl.set(null);
          this.http.post<{ imageUrl: string }>(`${environment.apiUrl}/api/cast/${cast.id}/image`, formData).subscribe(() => {
            this.router.navigate(['/gm/cast', cast.id], { replaceUrl: true, state: { noFlip: true } });
          });
        } else {
          this.router.navigate(['/gm/cast', cast.id], { replaceUrl: true, state: { noFlip: true } });
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
    if (!this.castId()) return;
    const previousUrl = this.imageUrl();
    const objectUrl   = URL.createObjectURL(file);
    this.imageUrl.set(objectUrl);
    this.imageUploading.set(true);
    const formData = new FormData();
    formData.append('file', file);
    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/cast/${this.castId()}/image`, formData
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

  private buildPayload() {
    const raw = this.form.value;
    return {
      ...raw,
      voicePlacement: VOICE_OPTIONS.filter((_, i) => (raw.voicePlacement as boolean[])[i]),
    };
  }

  openUpgradeDrawer() {
    this.drawerService.open();
  }
}
