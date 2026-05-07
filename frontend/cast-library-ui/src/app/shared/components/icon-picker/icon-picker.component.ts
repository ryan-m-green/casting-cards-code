import { Component, OnInit, output, input, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type IconManifest = Record<string, string[]>;
type SearchResult = { path: string; filename: string; label: string };

type ViewState = 'categories' | 'icons';

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './icon-picker.component.html',
  styleUrl: './icon-picker.component.scss'
})
export class IconPickerComponent implements OnInit {
  iconSelected = output<string>();
  selectedIcon  = input<string | null>(null);

  private http = inject(HttpClient);

  manifest = signal<IconManifest>({});
  view      = signal<ViewState>('categories');
  searchQuery = signal('');

  activeCategory = signal<string | null>(null);

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
    this.activeCategory.set(cat);
    this.view.set('icons');
  }

  backToCategories(): void {
    this.activeCategory.set(null);
    this.view.set('categories');
  }

  selectIcon(filename: string): void {
    const cat = this.activeCategory()!;
    this.iconSelected.emit(`/icons/${cat}/${filename}`);
  }

  selectSearchResult(result: SearchResult): void {
    this.iconSelected.emit(result.path);
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  displayName(name: string): string {
    return name.replace(/ and /gi, ' & ');
  }

  iconLabel(filename: string): string {
    return filename.replace(/\.svg$/, '').replace(/_/g, ' ');
  }
}
