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
  showRaceDropdown  = signal(false);
  showClassDropdown = signal(false);
  saving           = signal(false);
  error            = signal('');

  availableRaces   = computed(() => RACE_OPTIONS.filter(r => !this.selectedRaces().includes(r)));
  availableClasses = computed(() => CLASS_OPTIONS.filter(c => !this.selectedClasses().includes(c)));

  ngOnChanges() {
    if (this.visible) {
      this.draftName.set(this.name);
      this.draftDescription.set(this.description ?? '');
      this.selectedRaces.set(this.race ? this.race.split(', ').map(r => r.trim()).filter(Boolean) : []);
      this.selectedClasses.set(this.classValue ? this.classValue.split(', ').map(c => c.trim()).filter(Boolean) : []);
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

  addRace(race: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedRaces.update(l => [...l, race]);
    if (!this.availableRaces().length) this.showRaceDropdown.set(false);
  }

  removeRace(race: string, e: MouseEvent) { e.stopPropagation(); this.selectedRaces.update(l => l.filter(r => r !== race)); }

  addClassItem(cls: string, e: MouseEvent) {
    e.stopPropagation();
    this.selectedClasses.update(l => [...l, cls]);
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
