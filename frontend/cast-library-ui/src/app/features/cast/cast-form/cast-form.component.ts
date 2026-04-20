import { Component, OnInit, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Cast } from '../../../shared/models/cast.model';
import { SparkleService } from '../../../shared/services/sparkle.service';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';

const VOICE_OPTIONS = ['Chest', 'Throat', 'Mouth / Oral', 'Nasal', 'Head / Sinus'];

const POSTURE_OPTIONS = [
  'Upright', 'Puffed Chest', 'Slouched', 'Hunched', 'Relaxed',
  'Tense', 'Swaggering', 'Cowering', 'Guarded', 'Leaning',
];

const SPEED_OPTIONS = [
  'Slow & Deliberate', 'Steady Drumbeat', 'Brisk', 'Quick & Hurried',
  'Nervous & Rushed', 'Measured', 'Lumbering', 'Graceful',
];

const ALIGNMENT_OPTIONS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
];

const PRONOUN_OPTIONS = [
  'he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'it/its', 'any pronouns',
];

@Component({
  selector: 'app-cast-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DmNavComponent, CastCardComponent],
  templateUrl: './cast-form.component.html',
  styleUrl: './cast-form.component.scss'
})
export class CastFormComponent implements OnInit {
  @ViewChild('sparkHost') sparkHost!: ElementRef<HTMLElement>;

  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private http    = inject(HttpClient);
  private fb      = inject(FormBuilder);
  private sparkle = inject(SparkleService);

  castId         = signal<string | null>(null);
  saveStatus     = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  imageUrl       = signal<string | null>(null);
  imageUploading = signal(false);
  voiceOptions     = VOICE_OPTIONS;
  pronounOptions   = PRONOUN_OPTIONS;
  alignmentOptions = ALIGNMENT_OPTIONS;
  postureOptions   = POSTURE_OPTIONS;
  speedOptions     = SPEED_OPTIONS;

  labelText    = signal<'Saved' | 'Saving…' | 'Error'>('Saved');
  labelVisible = signal(true);

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
        VOICE_OPTIONS.forEach((opt, i) => vpArray.at(i).setValue(cast.voicePlacement?.includes(opt) ?? false));
        this.imageUrl.set(cast.imageUrl ?? null);
      });
    }
  }

  get voicePlacementArray() { return this.form.get('voicePlacement') as FormArray; }

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
      catchError(() => {
        this.saveStatus.set('error');
        this.fadeLabelTo('Error');
        setTimeout(() => this.saveStatus.set('idle'), 2000);
        return EMPTY;
      })
    ).subscribe(cast => {
      this.saveStatus.set('saved');
      this.fadeLabelTo('Saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000);
      if (!this.castId()) {
        this.castId.set(cast.id);
        this.router.navigate(['/dm/cast', cast.id], { replaceUrl: true, queryParams: { upload: 'true' }, state: { noFlip: true } });
      }
    });
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

  private buildPayload() {
    const raw = this.form.value;
    return {
      ...raw,
      voicePlacement: VOICE_OPTIONS.filter((_, i) => (raw.voicePlacement as boolean[])[i]),
    };
  }
}
