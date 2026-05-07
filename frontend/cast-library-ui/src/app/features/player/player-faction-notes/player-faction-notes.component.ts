import {
  Component, Input, Output, EventEmitter, signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-player-faction-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-faction-notes.component.html',
  styleUrl: './player-faction-notes.component.scss',
})
export class PlayerFactionNotesComponent {
  @Input() set notesText(value: string) {
    this._notesText = value;
  }
  get notesText(): string { return this._notesText; }
  private _notesText = '';

  @Input() saving = false;

  @Output() notesChange = new EventEmitter<string>();

  onNotesInput(value: string) {
    this._notesText = value;
    this.notesChange.emit(value);
  }
}
