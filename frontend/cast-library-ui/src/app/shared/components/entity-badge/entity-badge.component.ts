import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LinkedEntityTrigger } from '../../models/chronicle.model';
import { TimeOfDay, TimeOfDaySlice } from '../../models/time-of-day.model';

@Component({
  selector: 'app-entity-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './entity-badge.component.html',
  styleUrls: ['./entity-badge.component.scss']
})
export class EntityBadgeComponent {
  @Input() entities: LinkedEntityTrigger[] = [];
  @Input() timeOfDay: TimeOfDay | null = null;

  get filteredEntities(): LinkedEntityTrigger[] {
    return this.entities.filter(e => e.entityType.toLowerCase() !== 'time-of-day');
  }

  getBadgeClass(entityType: string): string {
    const typeMap: { [key: string]: string } = {
      'cast': 'entity-badge--cast',
      'location': 'entity-badge--location',
      'sublocation': 'entity-badge--sublocation',
      'faction': 'entity-badge--faction',
      'campaign': 'entity-badge--campaign',
      'player': 'entity-badge--player',
      'campaign-handout': 'entity-badge--handout'
    };

    return typeMap[entityType.toLowerCase()] || 'entity-badge--cast';
  }

  getIconForType(entityType: string): string {
    const type = entityType.toLowerCase();
    const icons: Record<string, string> = {
      cast: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      faction: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      location: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      sublocation: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      player: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      campaign: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      handout: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>'
    };
    return icons[type] || icons['cast'];
  }

  hasTimeOfDayTrigger(): boolean {
    return this.entities && this.entities.some(e => e.entityType.toLowerCase() === 'time-of-day');
  }

  getSliceGradient(currentSlice: TimeOfDaySlice, nextSlice: TimeOfDaySlice): string {
    return `linear-gradient(to right, ${currentSlice.color} 0%, ${nextSlice.color} 100%)`;
  }

  getTodSliceName(): string {
    const timeOfDayEntity = this.entities.find(e => e.entityType.toLowerCase() === 'time-of-day');
    return timeOfDayEntity?.entityName ?? '';
  }

  getCursorPosition(): number | null {
    const sliceName = this.getTodSliceName();
    if (!sliceName || !this.timeOfDay) return null;
    
    const slice = this.timeOfDay.slices.find(s => s.label === sliceName);
    if (!slice) return null;
    
    // Position cursor in the middle of the slice
    return (slice.startPercent + slice.endPercent) / 2;
  }
}
