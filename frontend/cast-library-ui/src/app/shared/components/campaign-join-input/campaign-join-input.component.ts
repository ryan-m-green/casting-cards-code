import { Component, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-campaign-join-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaign-join-input.component.html',
  styleUrl: './campaign-join-input.component.scss'
})
export class CampaignJoinInputComponent {
  readonly loading    = input<boolean>(false);
  readonly error      = input<string>('');
  readonly joinSubmit = output<string>();

  code = signal('');
  private wasLoading = false;

  constructor() {
    effect(() => {
      const isLoading = this.loading();
      if (this.wasLoading && !isLoading && !this.error()) {
        this.code.set('');
      }
      this.wasLoading = isLoading;
    });
  }

  submit() {
    const code = this.code().trim();
    if (!code || this.loading()) return;
    this.joinSubmit.emit(code);
  }
}
