import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StopWordsDomain } from './configuration-settings.types';

@Component({
  selector: 'app-stop-words-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './stop-words-editor.component.html',
  styleUrl: './stop-words-editor.component.scss',
})
export class StopWordsEditorComponent {
  config = input.required<StopWordsDomain>();
  configChange = output<StopWordsDomain>();

  newWord = '';

  addWord() {
    if (!this.newWord.trim()) return;
    const current = this.config();
    const updated = {
      ...current,
      words: [...current.words, this.newWord.trim()],
    };
    this.configChange.emit(updated);
    this.newWord = '';
  }

  removeWord(index: number) {
    const current = this.config();
    const updated = {
      ...current,
      words: current.words.filter((_, i) => i !== index),
    };
    this.configChange.emit(updated);
  }
}
