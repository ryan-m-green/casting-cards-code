import { Component, computed, input, signal, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CcTextboxComponent } from '../../Shared/cc-textbox/cc-textbox.component';
import { KeywordListService } from '../../../../core/keyword-list.service';

@Component({
  selector: 'cc-keyword-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent],
  templateUrl: './cc-keyword-editor.component.html',
  styleUrl: './cc-keyword-editor.component.scss',
})
export class CcKeywordEditorComponent implements OnInit {
  readonly cardType = input<string>('cast');
  readonly label = input<string>('Keywords');

  private keywordList = inject(KeywordListService);

  /**
   * The list is the service's, not this editor's: a library's keyword bar reads the same one, so
   * a keyword added or removed here is a chip there (see cc-keyword-filters), and neither has to be
   * reloaded to see the other's work.
   */
  readonly keywords = computed(() => this.keywordList.list(this.cardType())());

  isOpen = signal(false);
  confirmingKeyword = signal<string | null>(null);
  deleting = signal(false);
  newKeyword = signal('');
  adding = signal(false);

  ngOnInit() {
    /* Reads the card type the caller bound — which a constructor cannot yet see — and fetches the
       list the first time it is asked for. */
    this.keywordList.load(this.cardType());
  }

  toggle(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) this.confirmingKeyword.set(null);
  }

  addKeyword(): void {
    const raw = this.newKeyword().trim();
    if (!raw || this.adding()) return;
    this.adding.set(true);

    this.keywordList.add(this.cardType(), raw).subscribe({
      next: () => {
        this.newKeyword.set('');
        this.adding.set(false);
      },
      error: () => {
        this.adding.set(false);
      },
    });
  }

  startDelete(keyword: string): void {
    this.confirmingKeyword.set(keyword);
  }

  cancelDelete(): void {
    this.confirmingKeyword.set(null);
  }

  confirmDelete(keyword: string): void {
    if (this.deleting()) return;
    this.deleting.set(true);

    this.keywordList.remove(this.cardType(), keyword).subscribe({
      next: () => {
        this.confirmingKeyword.set(null);
        this.deleting.set(false);
      },
      error: () => {
        this.deleting.set(false);
      },
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!(event.target as HTMLElement).closest('cc-keyword-editor')) {
      this.isOpen.set(false);
      this.confirmingKeyword.set(null);
    }
  }
}
