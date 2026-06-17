import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-storyline-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './storyline-filter-bar.component.html',
  styleUrls: ['./storyline-filter-bar.component.scss']
})
export class StorylineFilterBarComponent {
  @Input() showCast = true;
  @Input() showFaction = true;
  @Input() showLocation = true;
  @Input() showSublocation = true;
  @Input() showPlayer = true;
  @Input() showCampaign = true;
  @Input() showHandout = true;
  @Input() showVisibilityFilters = false;

  @Input() activeTypeFilters: string[] = [];
  @Input() activeVisibilityFilters: string[] = [];

  @Output() typeFilterChange = new EventEmitter<string[]>();
  @Output() visibilityFilterChange = new EventEmitter<string[]>();

  @Input() debugLabel = '';

  @Input() isBackendFilter = false;
  @Input() showSearchBar = false;
  @Input() searchQuery = '';
  @Output() search = new EventEmitter<{ query: string; filters: string[] }>();
  @Output() reset = new EventEmitter<void>();

  localSearchQuery = this.searchQuery;

  toggleTypeFilter(filter: string) {
    const updated = this.activeTypeFilters.includes(filter)
      ? this.activeTypeFilters.filter(f => f !== filter)
      : [...this.activeTypeFilters, filter];
    this.typeFilterChange.emit(updated);
  }

  onSearchButtonClick() {
    this.search.emit({ query: this.localSearchQuery, filters: this.activeTypeFilters });
  }

  onSearchKeyUp(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onSearchButtonClick();
    }
  }

  onResetButtonClick() {
    this.localSearchQuery = '';
    this.reset.emit();
  }

  toggleVisibilityFilter(filter: string) {
    const updated = this.activeVisibilityFilters.includes(filter)
      ? this.activeVisibilityFilters.filter(f => f !== filter)
      : [...this.activeVisibilityFilters, filter];
    this.visibilityFilterChange.emit(updated);
  }
}
