import {
  Component, Input, Output, EventEmitter, signal, computed,
  HostListener, ElementRef, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keyword-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyword-input.component.html',
  styleUrl: './keyword-input.component.scss'
})
export class KeywordInputComponent {
  @Input() set keywords(val: string[]) { this._keywords.set(val ?? []); }
  @Input() set allDmKeywords(val: string[]) { this._allDmKeywords.set(val ?? []); }
  @Output() keywordsChanged = new EventEmitter<string[]>();

  @ViewChild('inputEl') inputElRef!: ElementRef<HTMLInputElement>;

  readonly inputValue  = signal('');
  readonly showDropdown = signal(false);

  private readonly _keywords      = signal<string[]>([]);
  private readonly _allDmKeywords = signal<string[]>([]);

  readonly currentKeywords = this._keywords.asReadonly();

  readonly suggestions = computed(() => {
    const q = this.inputValue().trim().toLowerCase();
    if (!q) return [];
    const existing = new Set(this._keywords().map(k => k.toLowerCase()));
    return this._allDmKeywords()
      .filter(k => k.toLowerCase().includes(q) && !existing.has(k.toLowerCase()))
      .slice(0, 8);
  });

  onInput(value: string) {
    this.inputValue.set(value);
    this.showDropdown.set(value.trim().length > 0);
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      this.commitInput();
    } else if (event.key === 'Escape') {
      this.showDropdown.set(false);
    }
  }

  selectSuggestion(keyword: string) {
    this.inputValue.set(keyword);
    this.showDropdown.set(false);
    // Focus input so the DM can confirm or keep typing
    setTimeout(() => this.inputElRef?.nativeElement?.focus(), 0);
  }

  commitInput() {
    const val = this.inputValue().trim().replace(/,$/, '').trim();
    if (!val) return;
    this.addKeyword(val);
    this.inputValue.set('');
    this.showDropdown.set(false);
  }

  addKeyword(keyword: string) {
    const lower = keyword.toLowerCase();
    const current = this._keywords();
    if (current.some(k => k.toLowerCase() === lower)) return;
    const updated = [...current, lower];
    this._keywords.set(updated);
    this.keywordsChanged.emit(updated);
  }

  removeKeyword(keyword: string) {
    const updated = this._keywords().filter(k => k !== keyword);
    this._keywords.set(updated);
    this.keywordsChanged.emit(updated);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const el = (event.target as HTMLElement);
    if (!el.closest('.keyword-input-wrapper')) {
      this.showDropdown.set(false);
    }
  }
}
