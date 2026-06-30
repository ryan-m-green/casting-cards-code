import { Component, OnInit, signal, computed, inject, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PlayerCard } from '../../../shared/models/player-card.model';

const RACE_OPTIONS = [
  'Human', 'Elf', 'Half-Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Orc', 'Tiefling',
  'Dragonborn', 'Aasimar', 'Genasi', 'Tabaxi', 'Kenku', 'Firbolg', 'Goliath', 'Tortle',
  'Lizardfolk', 'Yuan-Ti Pureblood', 'Warforged', 'Changeling', 'Kalashtar', 'Shifter',
  'Fairy', 'Harengon', 'Owlin', 'Satyr', 'Centaur', 'Minotaur', 'Other',
];

const CLASS_OPTIONS = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger',
  'Rogue', 'Sorcerer', 'Warlock', 'Wizard', 'Artificer', 'Blood Hunter', 'Other',
];

@Component({
  selector: 'app-player-card-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './player-card-form.component.html',
  styleUrl: './player-card-form.component.scss',
})
export class PlayerCardFormComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private http    = inject(HttpClient);
  private fb      = inject(FormBuilder);

  campaignId = signal('');
  saving     = signal(false);
  error      = signal('');

  // ── Portrait (in-memory until card is saved) ────────────────────────────
  imageFile       = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  // ── Multi-pill state ────────────────────────────────────────────────────
  selectedRaces    = signal<string[]>([]);
  selectedClasses  = signal<string[]>([]);
  raceInputValue    = signal('');
  classInputValue   = signal('');

  availableRaces   = computed(() => {
    const unselected = RACE_OPTIONS.filter(r => !this.selectedRaces().includes(r));
    const search = this.raceInputValue().trim().toLowerCase();
    if (!search) return unselected;
    return unselected.filter(r => r.toLowerCase().includes(search));
  });

  availableClasses = computed(() => {
    const unselected = CLASS_OPTIONS.filter(c => !this.selectedClasses().includes(c));
    const search = this.classInputValue().trim().toLowerCase();
    if (!search) return unselected;
    return unselected.filter(c => c.toLowerCase().includes(search));
  });

  showRaceDropdown  = signal(false);
  showClassDropdown = signal(false);
  raceError   = signal(false);
  classError  = signal(false);

  // ── Post-save state ────────────────────────────────────────────────────
  savedCard = signal<PlayerCard | null>(null);

  form = this.fb.group({
    name:        ['', [Validators.required, Validators.maxLength(80)]],
    description: [''],
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId.set(id);
  }

  // ── Race pill methods ───────────────────────────────────────────────────
  toggleRaceDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.showClassDropdown.set(false);
    this.showRaceDropdown.update(v => !v);
  }

  addRace(race: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedRaces.update(list => [...list, race]);
    this.raceError.set(false);
    this.raceInputValue.set('');
    if (!this.availableRaces().length) this.showRaceDropdown.set(false);
  }

  removeRace(race: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedRaces.update(list => list.filter(r => r !== race));
  }

  onRaceInputKeydown(e: KeyboardEvent) {
    const value = this.raceInputValue().trim();
    if (e.key === 'Enter' && value) {
      e.preventDefault();
      if (!this.selectedRaces().includes(value)) {
        this.selectedRaces.update(list => [...list, value]);
        this.raceError.set(false);
      }
      this.raceInputValue.set('');
    } else if (e.key === 'Backspace' && !value && this.selectedRaces().length) {
      e.preventDefault();
      this.selectedRaces.update(list => list.slice(0, -1));
    }
  }

  onRaceInputChange(value: string) {
    this.raceInputValue.set(value);
    if (value.trim()) {
      this.showRaceDropdown.set(true);
    }
  }

  onRaceInputFocus() {
    this.showRaceDropdown.set(true);
    this.showClassDropdown.set(false);
  }

  onRaceInputBlur() { setTimeout(() => this.showRaceDropdown.set(false), 150); }

  // ── Class pill methods ──────────────────────────────────────────────────
  toggleClassDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.showRaceDropdown.set(false);
    this.showClassDropdown.update(v => !v);
  }

  addClassItem(cls: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedClasses.update(list => [...list, cls]);
    this.classError.set(false);
    this.classInputValue.set('');
    if (!this.availableClasses().length) this.showClassDropdown.set(false);
  }

  removeClassItem(cls: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedClasses.update(list => list.filter(c => c !== cls));
  }

  onClassInputKeydown(e: KeyboardEvent) {
    const value = this.classInputValue().trim();
    if (e.key === 'Enter' && value) {
      e.preventDefault();
      if (!this.selectedClasses().includes(value)) {
        this.selectedClasses.update(list => [...list, value]);
        this.classError.set(false);
      }
      this.classInputValue.set('');
    } else if (e.key === 'Backspace' && !value && this.selectedClasses().length) {
      e.preventDefault();
      this.selectedClasses.update(list => list.slice(0, -1));
    }
  }

  onClassInputChange(value: string) {
    this.classInputValue.set(value);
    if (value.trim()) {
      this.showClassDropdown.set(true);
    }
  }

  onClassInputFocus() {
    this.showClassDropdown.set(true);
    this.showRaceDropdown.set(false);
  }

  onClassInputBlur() { setTimeout(() => this.showClassDropdown.set(false), 150); }

  // ── Close dropdowns on outside click ───────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.pill-select')) {
      this.showRaceDropdown.set(false);
      this.showClassDropdown.set(false);
    }
  }

  // ── Portrait file selection ─────────────────────────────────────────────
  onPortraitFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.imagePreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  // ── Form submit ─────────────────────────────────────────────────────────
  submit() {
    this.form.markAllAsTouched();

    const noRace  = this.selectedRaces().length === 0;
    const noClass = this.selectedClasses().length === 0;
    this.raceError.set(noRace);
    this.classError.set(noClass);

    if (this.form.invalid || noRace || noClass) return;

    this.saving.set(true);
    this.error.set('');

    const body = {
      name:        this.form.value.name,
      race:        this.selectedRaces().join(', '),
      class:       this.selectedClasses().join(', '),
      description: this.form.value.description || null,
    };

    this.http.post<PlayerCard>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards`, body
    ).subscribe({
      next: card => {
        const file = this.imageFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const prev = this.imagePreviewUrl();
          if (prev) URL.revokeObjectURL(prev);
          this.imageFile.set(null);
          this.imagePreviewUrl.set(null);
          this.http.post<{ imageUrl: string }>(
            `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${card.id}/image`,
            formData
          ).subscribe({
            next:  res => {
              const cacheBustedUrl = res.imageUrl.includes('?') ? `${res.imageUrl}&t=${Date.now()}` : `${res.imageUrl}?t=${Date.now()}`;
              this.saving.set(false);
              this.savedCard.set({ ...card, imageUrl: cacheBustedUrl });
            },
            error: () => { this.saving.set(false); this.savedCard.set(card); },
          });
        } else {
          this.saving.set(false);
          this.savedCard.set(card);
        }
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to create character. Please try again.');
      },
    });
  }

  enterCampaign() {
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }
}
