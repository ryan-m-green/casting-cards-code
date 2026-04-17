import { Component, OnInit, signal, computed, inject, HostListener, ElementRef } from '@angular/core';
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
  private elRef   = inject(ElementRef);

  campaignId = signal('');
  saving     = signal(false);
  error      = signal('');

  // ── Multi-pill state ────────────────────────────────────────────────────
  selectedRaces    = signal<string[]>([]);
  selectedClasses  = signal<string[]>([]);
  availableRaces   = computed(() => RACE_OPTIONS.filter(r => !this.selectedRaces().includes(r)));
  availableClasses = computed(() => CLASS_OPTIONS.filter(c => !this.selectedClasses().includes(c)));
  showRaceDropdown  = signal(false);
  showClassDropdown = signal(false);
  raceError   = signal(false);
  classError  = signal(false);

  // ── Post-save state ────────────────────────────────────────────────────
  savedCard      = signal<PlayerCard | null>(null);
  imageUrl       = signal<string | null>(null);
  imageUploading = signal(false);
  showImageModal = signal(false);

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
    if (!this.availableRaces().length) this.showRaceDropdown.set(false);
  }

  removeRace(race: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedRaces.update(list => list.filter(r => r !== race));
  }

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
    if (!this.availableClasses().length) this.showClassDropdown.set(false);
  }

  removeClassItem(cls: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedClasses.update(list => list.filter(c => c !== cls));
  }

  // ── Close dropdowns on outside click ───────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.pill-select')) {
      this.showRaceDropdown.set(false);
      this.showClassDropdown.set(false);
    }
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
        this.saving.set(false);
        this.savedCard.set(card);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to create character. Please try again.');
      },
    });
  }

  // ── Image upload ────────────────────────────────────────────────────────
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    const card  = this.savedCard();
    if (!file || !card) return;

    const previousUrl = this.imageUrl();
    const objectUrl   = URL.createObjectURL(file);
    this.imageUrl.set(objectUrl);
    this.imageUploading.set(true);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ imageUrl: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/player-cards/${card.id}/image`, formData
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

  enterCampaign() {
    this.router.navigate(['/player/campaign', this.campaignId()]);
  }
}
