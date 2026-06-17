import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DoodleArtDomain } from './configuration-settings.types';

@Component({
  selector: 'app-doodle-art-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './doodle-art-editor.component.html',
  styleUrl: './doodle-art-editor.component.scss',
})
export class DoodleArtEditorComponent {
  config = input.required<DoodleArtDomain>();
  configChange = output<DoodleArtDomain>();

  newArtItem = '';

  addArtItem() {
    if (!this.newArtItem.trim()) return;
    const current = this.config();
    const updated = {
      ...current,
      ArtItems: [...current.ArtItems, this.newArtItem.trim()],
    };
    this.configChange.emit(updated);
    this.newArtItem = '';
  }

  removeArtItem(index: number) {
    const current = this.config();
    const updated = {
      ...current,
      ArtItems: current.ArtItems.filter((_: string, i: number) => i !== index),
    };
    this.configChange.emit(updated);
  }
}
