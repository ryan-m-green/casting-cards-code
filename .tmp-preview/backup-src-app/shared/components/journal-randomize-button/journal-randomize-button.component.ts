import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { JournalRandomizeService } from '../../services/journal-randomize.service';

@Component({
  selector: 'app-journal-randomize-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './journal-randomize-button.component.html',
  styleUrl: './journal-randomize-button.component.scss'
})
export class JournalRandomizeButtonComponent {
  @Input() randomizeGroupId: string = '';

  private randomizeService = inject(JournalRandomizeService);

  onRandomize(): void {
    if (this.randomizeGroupId) {
      this.randomizeService.triggerRandomize(this.randomizeGroupId);
    }
  }
}
