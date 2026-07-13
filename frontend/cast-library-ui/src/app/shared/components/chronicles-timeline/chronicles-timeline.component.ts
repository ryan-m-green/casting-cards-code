import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EntityBadgeComponent } from '../entity-badge/entity-badge.component';
import { CampaignDropdownComponent } from '../campaign-dropdown/campaign-dropdown.component';
import { CampaignDropdownOption } from '../campaign-dropdown/campaign-dropdown.component';
import { ChroniclesResponse, ChronicleItem } from '../../models/chronicle.model';
import { TimeOfDay } from '../../models/time-of-day.model';

@Component({
  selector: 'app-chronicles-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule, EntityBadgeComponent, CampaignDropdownComponent],
  templateUrl: './chronicles-timeline.component.html',
  styleUrls: ['./chronicles-timeline.component.scss']
})
export class ChroniclesTimelineComponent {
  @Input() chronicles: ChroniclesResponse | null = null;
  @Input() expandedSessionIds: Set<string> = new Set();
  @Input() isDmMode: boolean = false;
  @Input() chronicleEditingId: string | null = null;
  @Input() chronicleEditTitle: string = '';
  @Input() chronicleEditBody: string = '';
  @Input() chronicleSaving: boolean = false;
  @Input() chronicleSaveError: string | null = null;
  @Input() timeOfDay: TimeOfDay | null = null;
  @Input() sessionOptions: CampaignDropdownOption[] = [];
  @Input() chronicleEditSessionId: string = '';
  @Input() chronicleEditSortOrder: number = 0;
  @Input() searchQuery: string = '';

  @Output() sessionExpand = new EventEmitter<string>();
  @Output() editChronicle = new EventEmitter<{ chronicle: ChronicleItem; sessionId: string }>();
  @Output() cancelChronicleEdit = new EventEmitter<void>();
  @Output() saveChronicleEdit = new EventEmitter<string>();
  @Output() sessionChange = new EventEmitter<string>();
  @Output() sortOrderChange = new EventEmitter<number>();
  @Output() deleteSession = new EventEmitter<string>();

  toggleSessionExpand(sessionId: string) {
    this.sessionExpand.emit(sessionId);
  }

  openChronicleEdit(chronicle: ChronicleItem, sessionId: string) {
    this.editChronicle.emit({ chronicle, sessionId });
  }

  onCancelChronicleEdit() {
    this.cancelChronicleEdit.emit();
  }

  onSaveChronicleEdit(id: string) {
    this.saveChronicleEdit.emit(id);
  }

  onSessionChange(sessionId: string) {
    this.sessionChange.emit(sessionId);
  }

  onSortOrderIncrement() {
    this.sortOrderChange.emit(this.chronicleEditSortOrder + 1);
  }

  onSortOrderDecrement() {
    if (this.chronicleEditSortOrder > 1) {
      this.sortOrderChange.emit(this.chronicleEditSortOrder - 1);
    }
  }

  onSortOrderInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);
    if (!isNaN(value) && value >= 1) {
      this.sortOrderChange.emit(value);
    }
  }


  formatSessionDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatInGameDays(days: number[]): string {
    if (!days || days.length === 0) return '';
    return days.length > 1 ? `Day ${days[0]} - ${days[days.length - 1]}` : `Day ${days[0]}`;
  }

  highlightText(text: string, query: string): string {
    if (!query || !text) return text;
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  hasPlayerNote(chronicle: ChronicleItem): boolean {
    return chronicle.linkedEntities?.some(e => e.entityType.toLowerCase() === 'player-note') ?? false;
  }
}
