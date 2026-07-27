import { CommonModule } from '@angular/common';
import { Component, input, output, signal, Signal, computed } from '@angular/core';
import { SoundtrackDomain } from '../../models/soundtrack.model';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../campaign-dropdown/campaign-dropdown.component';

export interface SelectedSoundtrack {
  id: string;
  title: string;
}

@Component({
  selector: 'app-soundtrack-selector',
  standalone: true,
  imports: [CommonModule, CampaignDropdownComponent],
  templateUrl: './soundtrack-selector.component.html',
  styleUrl: './soundtrack-selector.component.scss'
})
export class SoundtrackSelectorComponent {
  soundtracks = input.required<SoundtrackDomain[]>();
  selectedSoundtrackIds = input<string[]>([]);
  selectedSoundtracksChange = output<string[]>();

  editingSoundtrackId = signal<string | null>(null);

  soundtrackOptions = computed(() => {
    const availableSoundtracks = this.soundtracks()
      .filter(s => !this.selectedSoundtrackIds().includes(s.id))
      .map(s => ({ value: s.id, label: s.title }));
    
    return [
      { value: '', label: 'Select a soundtrack' },
      ...availableSoundtracks
    ];
  });

  addSoundtrack(soundtrackId: string): void {
    if (!soundtrackId || this.selectedSoundtrackIds().includes(soundtrackId)) {
      return;
    }
    
    const updated = [...this.selectedSoundtrackIds(), soundtrackId];
    this.selectedSoundtracksChange.emit(updated);
    this.editingSoundtrackId.set(null);
  }

  removeSoundtrack(index: number): void {
    const updated = this.selectedSoundtrackIds().filter((_, i) => i !== index);
    this.selectedSoundtracksChange.emit(updated);
  }

  getSelectedSoundtracks(): SelectedSoundtrack[] {
    return this.selectedSoundtrackIds()
      .map(id => {
        const soundtrack = this.soundtracks().find(s => s.id === id);
        return soundtrack ? { id: soundtrack.id, title: soundtrack.title } : null;
      })
      .filter((s): s is SelectedSoundtrack => s !== null);
  }

  onSoundtrackChange(soundtrackId: string): void {
    this.editingSoundtrackId.set(soundtrackId);
  }
}
