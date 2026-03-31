import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-secret-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './secret-modal.component.html',
  styleUrl: './secret-modal.component.scss'
})
export class SecretModalComponent {
  @Input() visible = false;
  @Input() content = '';
  @Input() title = 'Edit Secret';
  @Output() saved   = new EventEmitter<string>();
  @Output() closed  = new EventEmitter<void>();

  draft = '';

  ngOnChanges() { this.draft = this.content; }

  save()  { this.saved.emit(this.draft); this.closed.emit(); }
  close() { this.closed.emit(); }
}
