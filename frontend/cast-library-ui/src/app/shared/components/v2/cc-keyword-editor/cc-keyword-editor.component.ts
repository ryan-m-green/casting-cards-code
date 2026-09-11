import { Component, input, signal, inject, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';

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

  private http = inject(HttpClient);

  keywords = signal<string[]>([]);
  isOpen = signal(false);
  confirmingKeyword = signal<string | null>(null);
  deleting = signal(false);
  newKeyword = signal('');
  adding = signal(false);

  ngOnInit() {
    this.load();
  }

  private load(): void {
    this.http.get<{ keywords: string[] }>(
      `${environment.apiUrl}/api/campaign-keywords?cardType=${this.cardType()}`
    ).subscribe(res => this.keywords.set(res.keywords ?? []));
  }

  toggle(): void {
    this.isOpen.update(v => !v);
    if (!this.isOpen()) this.confirmingKeyword.set(null);
  }

  addKeyword(): void {
    const raw = this.newKeyword().trim();
    if (!raw || this.adding()) return;
    this.adding.set(true);
    this.http.post<{ keyword: string }>(
      `${environment.apiUrl}/api/campaign-keywords`,
      { cardType: this.cardType(), keyword: raw }
    ).subscribe({
      next: res => {
        const kw = res.keyword;
        if (kw && !this.keywords().some(k => k.toLowerCase() === kw.toLowerCase())) {
          this.keywords.set([...this.keywords(), kw].sort());
        }
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
    this.http.delete(
      `${environment.apiUrl}/api/campaign-keywords/${encodeURIComponent(keyword)}?cardType=${this.cardType()}`
    ).subscribe({
      next: () => {
        this.keywords.set(this.keywords().filter(k => k !== keyword));
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
