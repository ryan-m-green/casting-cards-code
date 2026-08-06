import { Component, OnInit, output, input, model, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';

type IconManifest = Record<string, string[]>;
type SearchResult = { path: string; filename: string; label: string };
type ViewState = 'categories' | 'icons';

@Component({
  selector: 'cc-symbol-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, CcTextboxComponent],
  templateUrl: './cc-symbol-picker.component.html',
  styleUrl: './cc-symbol-picker.component.scss',
})
export class CcSymbolPickerComponent implements OnInit {
  readonly iconSelected = output<string>();
  readonly selectedIcon = model<string | null>(null);
  readonly context = input<'journal' | 'campaign'>('journal');
  readonly disabled = input<boolean>(false);

  private http = inject(HttpClient);

  manifest = signal<IconManifest>({});
  view = signal<ViewState>('categories');
  searchQuery = signal('');

  activeCategory = signal<string | null>(null);
  currentPage = signal<number>(1);
  readonly itemsPerPage = 12; // Mobile-friendly: 3-4 rows across devices

  searchResults = computed<SearchResult[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    const results: SearchResult[] = [];
    const m = this.manifest();
    for (const cat of Object.keys(m)) {
      for (const file of m[cat]) {
        const label = file.replace(/\.svg$/, '').replace(/_/g, ' ');
        if (label.toLowerCase().includes(q)) {
          results.push({ path: `/icons/${cat}/${file}`, filename: file, label });
        }
      }
    }
    return results;
  });

  isCampaignContext = computed(() => this.context() === 'campaign');

  paginatedSearchResults = computed<SearchResult[]>(() => {
    const results = this.searchResults();
    const page = this.currentPage();
    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return results.slice(start, end);
  });

  paginatedIcons = computed<string[]>(() => {
    const icons = this.icons;
    const page = this.currentPage();
    const start = (page - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return icons.slice(start, end);
  });

  totalSearchPages = computed(() => Math.ceil(this.searchResults().length / this.itemsPerPage));
  totalIconPages = computed(() => Math.ceil(this.icons.length / this.itemsPerPage));

  get categories(): string[] {
    return Object.keys(this.manifest());
  }

  get icons(): string[] {
    const cat = this.activeCategory();
    if (!cat) return [];
    return this.manifest()[cat] ?? [];
  }

  ngOnInit(): void {
    this.http.get<IconManifest>('/icons/manifest.json').subscribe(m => {
      this.manifest.set(m);
    });
  }

  selectCategory(cat: string): void {
    if (this.disabled()) return;
    this.activeCategory.set(cat);
    this.view.set('icons');
    this.currentPage.set(1);
  }

  backToCategories(): void {
    if (this.disabled()) return;
    this.activeCategory.set(null);
    this.view.set('categories');
  }

  selectIcon(filename: string): void {
    if (this.disabled()) return;
    const cat = this.activeCategory()!;
    const path = `/icons/${cat}/${filename}`;
    this.selectedIcon.set(path);
    this.iconSelected.emit(path);
  }

  selectSearchResult(result: SearchResult): void {
    if (this.disabled()) return;
    this.selectedIcon.set(result.path);
    this.iconSelected.emit(result.path);
  }

  onSearch(query: string): void {
    if (this.disabled()) return;
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  clearSearch(): void {
    if (this.disabled()) return;
    this.searchQuery.set('');
  }

  clearSymbol(): void {
    if (this.disabled()) return;
    this.selectedIcon.set(null);
    this.iconSelected.emit('');
  }

  displayName(name: string): string {
    return name.replace(/ and /gi, ' & ');
  }

  iconLabel(filename: string): string {
    return filename.replace(/\.svg$/, '').replace(/_/g, ' ');
  }

  nextPage(): void {
    if (this.disabled()) return;
    const totalPages = this.searchQuery() ? this.totalSearchPages() : this.totalIconPages();
    if (this.currentPage() < totalPages) {
      this.currentPage.update(page => page + 1);
    }
  }

  previousPage(): void {
    if (this.disabled()) return;
    if (this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  goToPage(page: number): void {
    if (this.disabled()) return;
    const totalPages = this.searchQuery() ? this.totalSearchPages() : this.totalIconPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage.set(page);
    }
  }
}