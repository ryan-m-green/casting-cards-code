import { Component, Input, Output, EventEmitter, OnChanges, signal, computed, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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

export interface PlayerCardInfoUpdate {
  name: string;
  race: string;
  class: string;
  description: string | null;
}

@Component({
  selector: 'app-character-info-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './character-info-editor.component.html',
  styleUrl: './character-info-editor.component.scss',
})
export class CharacterInfoEditorComponent implements OnChanges {
  private http = inject(HttpClient);

  @Input() visible      = false;
  @Input() campaignId   = '';
  @Input() playerCardId = '';
  @Input() name         = '';
  @Input() race         = '';
  @Input() classValue   = '';
  @Input() description: string | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() saved  = new EventEmitter<PlayerCardInfoUpdate>();

  draftName        = signal('');
  draftDescription = signal('');
  selectedRaces    = signal<string[]>([]);
  selectedClasses  = signal<string[]>([]);
  raceInputValue   = signal('');
  classInputValue  = signal('');
  showRaceDropdown  = signal(false);
  showClassDropdown = signal(false);
  saving           = signal(false);
  error            = signal('');

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

  ngOnChanges() {
    if (this.visible) {
      this.draftName.set(this.name);
      this.draftDescription.set(this.description ?? '');
      this.selectedRaces.set(this.race ? this.race.split(', ').map(r => r.trim()).filter(Boolean) : []);
      this.selectedClasses.set(this.classValue ? this.classValue.split(', ').map(c => c.trim()).filter(Boolean) : []);
      this.raceInputValue.set('');
      this.classInputValue.set('');
      this.error.set('');
      this.showRaceDropdown.set(false);
      this.showClassDropdown.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest('.pill-select')) {
      this.showRaceDropdown.set(false);
      this.showClassDropdown.set(false);
    }
  }

  toggleRaceDropdown(e: MouseEvent)  { e.stopPropagation(); this.showClassDropdown.set(false); this.showRaceDropdown.update(v => !v); }
  toggleClassDropdown(e: MouseEvent) { e.stopPropagation(); this.showRaceDropdown.set(false);  this.showClassDropdown.update(v => !v); }

  onRaceInputFocus() { this.showRaceDropdown.set(true); this.showClassDropdown.set(false); }
  onRaceInputChange(value: string) { this.raceInputValue.set(value); if (value.trim()) this.showRaceDropdown.set(true); }
  onRaceInputBlur() { setTimeout(() => this.showRaceDropdown.set(false), 150); }
  onRaceInputKeydown(e: KeyboardEvent) {
    const value = this.raceInputValue().trim();
    if (e.key === 'Enter' && value) {
      e.preventDefault();
      if (!this.selectedRaces().includes(value)) this.selectedRaces.update(l => [...l, value]);
      this.raceInputValue.set('');
    } else if (e.key === 'Backspace' && !value && this.selectedRaces().length) {
      e.preventDefault();
      this.selectedRaces.update(l => l.slice(0, -1));
    }
  }

  onClassInputFocus() { this.showClassDropdown.set(true); this.showRaceDropdown.set(false); }
  onClassInputChange(value: string) { this.classInputValue.set(value); if (value.trim()) this.showClassDropdown.set(true); }
  onClassInputBlur() { setTimeout(() => this.showClassDropdown.set(false), 150); }
  onClassInputKeydown(e: KeyboardEvent) {
    const value = this.classInputValue().trim();
    if (e.key === 'Enter' && value) {
      e.preventDefault();
      if (!this.selectedClasses().includes(value)) this.selectedClasses.update(l => [...l, value]);
      this.classInputValue.set('');
    } else if (e.key === 'Backspace' && !value && this.selectedClasses().length) {
      e.preventDefault();
      this.selectedClasses.update(l => l.slice(0, -1));
    }
  }

  addRace(race: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedRaces.update(l => [...l, race]);
    this.raceInputValue.set('');
    if (!this.availableRaces().length) this.showRaceDropdown.set(false);
  }

  removeRace(race: string, e: MouseEvent) { e.stopPropagation(); this.selectedRaces.update(l => l.filter(r => r !== race)); }

  addClassItem(cls: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedClasses.update(l => [...l, cls]);
    this.classInputValue.set('');
    if (!this.availableClasses().length) this.showClassDropdown.set(false);
  }

  removeClassItem(cls: string, e: MouseEvent) { e.stopPropagation(); this.selectedClasses.update(l => l.filter(c => c !== cls)); }

  close() { if (!this.saving()) this.closed.emit(); }

  save() {
    const name = this.draftName().trim();
    if (!name || !this.selectedRaces().length || !this.selectedClasses().length) {
      this.error.set('Name, race, and class are required.');
      return;
    }

    this.saving.set(true);
    this.error.set('');

    const body = {
      name,
      race:        this.selectedRaces().join(', '),
      class:       this.selectedClasses().join(', '),
      description: this.draftDescription().trim() || null,
    };

    this.http.put<void>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/player-cards/${this.playerCardId}`,
      body
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit(body);
        this.closed.emit();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to save. Please try again.');
      },
    });
  }
}
