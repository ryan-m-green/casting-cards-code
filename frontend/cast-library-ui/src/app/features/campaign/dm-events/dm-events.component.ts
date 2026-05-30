import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { environment } from '../../../../environments/environment';
import { NoteDestinationPickerComponent } from '../../../shared/components/note-destination-picker/note-destination-picker.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { CampaignPlayer } from '../../../shared/models/campaign.model';
import { TimeOfDay } from '../../../shared/models/time-of-day.model';

type EventsTab = 'events' | 'create-events' | 'create-handout';
type DestType = 'cast' | 'faction' | 'campaign' | 'sublocation' | 'location' | 'player' | 'none' | 'time-of-day';

interface LinkedItem {
  entityType: string;
  entityId: string;
  entityName: string;
  todPositionPercent?: number | null;
}

interface CampaignEvent {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  linkedEntities: LinkedItem[];
  visibleToPlayers: boolean;
  sortOrder: number;
  createdAt: string;
  imageUrl?: string;
  todPositionPercent: number | null;
  archived: boolean;
}

@Component({
  selector: 'app-dm-events',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteDestinationPickerComponent, LockIconComponent],
  templateUrl: './dm-events.component.html',
  styleUrl: './dm-events.component.scss',
})
export class DmEventsComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private shellSvc = inject(CampaignShellService);
  private http     = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  campaignId = '';

  activeTab = signal<EventsTab>('events');

  // Events list
  events        = signal<CampaignEvent[]>([]);
  loadingEvents = signal(false);
  expandedId    = signal<string | null>(null);

  // Inline edit
  editingId        = signal<string | null>(null);
  editTitle        = signal('');
  editDraft        = signal('');
  editDestType     = signal<DestType | null>(null);
  editEntityId     = signal('');
  editLinkedEntities = signal<LinkedItem[]>([]);
  editTodPositionPercent = signal<number | null>(null);
  editFile         = signal<File | null>(null);
  editPreviewUrl   = signal<string | null>(null);
  editSaving       = signal(false);
  editSaveError    = signal<string | null>(null);
  editSaveSuccess  = signal(false);
  autoSaveStatus   = signal<'idle' | 'saving' | 'saved'>('idle');
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  // Delete confirm state
  confirmDeleteId  = signal<string | null>(null);
  deleting         = signal(false);

  // Archive state
  archiving        = signal(false);

  // Filter state — empty array = show all (persisted to localStorage per campaign)
  typeFilters       = signal<string[]>([]);
  visibilityFilters = signal<string[]>([]);

  private filterStorageKey(suffix: string): string {
    return `dm-events-filter-${this.campaignId}-${suffix}`;
  }

  private loadFilters(): void {
    try {
      const types = localStorage.getItem(this.filterStorageKey('types'));
      const vis   = localStorage.getItem(this.filterStorageKey('visibility'));
      if (types) this.typeFilters.set(JSON.parse(types));
      if (vis)   this.visibilityFilters.set(JSON.parse(vis));
    } catch { /* ignore parse errors */ }
  }

  filteredEvents = computed(() => {
    const types = this.typeFilters();
    const vis   = this.visibilityFilters();
    return this.events().filter(ev => {
      if (types.length > 0) {
        const effectiveType = ev.imageUrl ? 'handout' : (ev.linkedEntities.length > 0 ? ev.linkedEntities[0].entityType : 'none');
        if (!types.includes(effectiveType)) return false;
      }
      if (vis.length > 0) {
        const isUnlocked = ev.visibleToPlayers;
        if (!((vis.includes('unlocked') && isUnlocked) || (vis.includes('locked') && !isUnlocked))) return false;
      }
      return true;
    });
  });

  hasUnlockedEventsToArchive = computed(() => {
    return this.events().some(ev => ev.visibleToPlayers && ev.linkedEntities.length > 0);
  });

  toggleTypeFilter(type: string) {
    const current = this.typeFilters();
    const next = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    this.typeFilters.set(next);
    localStorage.setItem(this.filterStorageKey('types'), JSON.stringify(next));
  }

  toggleVisibilityFilter(v: string) {
    const current = this.visibilityFilters();
    const next = current.includes(v) ? current.filter(f => f !== v) : [...current, v];
    this.visibilityFilters.set(next);
    localStorage.setItem(this.filterStorageKey('visibility'), JSON.stringify(next));
  }

  // Drag state
  draggingIndex = signal<number | null>(null);
  dropLineIndex = signal<number | null>(null);

  @ViewChild('evList') evListRef!: ElementRef<HTMLElement>;

  // Create event form
  eventTitle = signal('');
  eventBody  = signal('');
  destType   = signal<DestType>('none');
  entityId   = signal('');
  linkedEntities = signal<LinkedItem[]>([]);
  todPositionPercent = signal<number | null>(null);
  saving     = signal(false);
  saveError  = signal<string | null>(null);
  saveSuccess = signal(false);

  // Create handout form
  handoutTitle      = signal('');
  handoutBody       = signal('');
  handoutFile       = signal<File | null>(null);
  handoutPreviewUrl = signal<string | null>(null);
  handoutUploading  = signal(false);
  handoutError      = signal<string | null>(null);
  handoutSuccess    = signal(false);
  handoutDestType   = signal<DestType>('none');
  handoutEntityId   = signal('');
  handoutLinkedEntities = signal<LinkedItem[]>([]);
  handoutTodPositionPercent = signal<number | null>(null);

  canUploadHandout = computed(() => {
    const title = this.handoutTitle();
    const file  = this.handoutFile();
    const d     = this.handoutDestType();
    const eId   = this.handoutEntityId();
    const linked = this.handoutLinkedEntities();
    if (!title.trim() || !file) return false;
    const needsEntity = d === 'cast' || d === 'faction' || d === 'location' || d === 'sublocation' || d === 'player';
    if (needsEntity && !eId && linked.length === 0) return false;
    return true;
  });

  onHandoutDestTypeChange(value: string) {
    this.handoutDestType.set(value as DestType);
    this.handoutEntityId.set('');
  }

  // Campaign data from shell (already loaded by the shell component)
  locations = computed(() => this.shellSvc.campaign()?.locations ?? []);
  sublocations = computed(() => (this.shellSvc.campaign()?.sublocations ?? []).filter(s => !s.isPartyAnchor));
  casts = computed(() => this.shellSvc.campaign()?.casts ?? []);
  factions = computed(() => this.shellSvc.campaign()?.factions ?? []);
  players = computed(() => this.shellSvc.campaign()?.players ?? []);
  tod = computed(() => this.shellSvc.campaign()?.timeOfDay ?? null);

  canSave = computed(() => {
    const title = this.eventTitle();
    const body  = this.eventBody();
    const d     = this.destType();
    const eId   = this.entityId();
    if (!title.trim() || !body.trim()) return false;
    const needsEntity = d === 'cast' || d === 'faction' || d === 'location' || d === 'sublocation' || d === 'player';
    if (needsEntity && !eId && this.linkedEntities().length === 0) return false;
    return true;
  });

  setTab(tab: EventsTab) {
    this.activeTab.set(tab);
    if (tab === 'events') this.loadEvents();
  }

  onDestTypeChange(value: string) {
    this.destType.set(value as DestType);
    this.entityId.set('');
    if (value !== 'time-of-day') this.todPositionPercent.set(null);
  }

  ngOnDestroy() {
    clearTimeout(this.saveTimer);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId = id;
    this.shellSvc.setTitleContext({ pageType: 'gm-events', campaignId: id, baseRoute: '/campaign', location: null }, '56px');
    this.loadFilters();
    this.loadEvents();
  }

  loadEvents() {
    this.loadingEvents.set(true);
    this.http.get<CampaignEvent[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/events`)
      .subscribe({
        next:  data => { this.events.set(data); this.loadingEvents.set(false); },
        error: ()   => { this.loadingEvents.set(false); },
      });
  }

  toggleExpand(id: string) {
    if (this.editingId() !== null) return;
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      this.editingId.set(null);
    } else {
      this.expandedId.set(id);
    }
  }

  toggleEdit(ev: CampaignEvent, domEvent: Event) {
    domEvent.stopPropagation();
    if (this.editingId() === ev.id) {
      this._clearEditState();
    } else {
      this.editingId.set(ev.id);
      this.editTitle.set(ev.title);
      this.editDraft.set(ev.body);
      this.editLinkedEntities.set(ev.linkedEntities);
      const firstLinked = ev.linkedEntities.length > 0 ? ev.linkedEntities[0] : null;
      this.editDestType.set((firstLinked?.entityType as DestType) ?? 'none');
      this.editEntityId.set(firstLinked?.entityId ?? '');
      this.editTodPositionPercent.set(firstLinked?.todPositionPercent ?? null);
      this.editFile.set(null);
      const prev = this.editPreviewUrl();
      if (prev) URL.revokeObjectURL(prev);
      this.editPreviewUrl.set(ev.imageUrl ?? null);
      this.editSaveError.set(null);
      this.editSaveSuccess.set(false);
    }
  }

  private _clearEditState() {
    this.editingId.set(null);
    this.editTitle.set('');
    this.editDraft.set('');
    this.editDestType.set(null);
    this.editEntityId.set('');
    this.editTodPositionPercent.set(null);
    this.editFile.set(null);
    const prev = this.editPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.editPreviewUrl.set(null);
    this.editSaving.set(false);
    this.editSaveError.set(null);
    this.editSaveSuccess.set(false);
  }

  onEditDestTypeChange(value: string) {
    this.editDestType.set(value as DestType);
    this.editEntityId.set('');
    if (value !== 'time-of-day') this.editTodPositionPercent.set(null);
  }

  onEditFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const prev = this.editPreviewUrl();
    // Only revoke if it was a blob URL (not a remote http URL)
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.editFile.set(file);
    this.editPreviewUrl.set(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  }

  // Scene body autosave (kept for backward compatibility within scene edit mode)
  onEditInput(ev: CampaignEvent, domEvent: Event) {
    const value = (domEvent.target as HTMLTextAreaElement).value;
    this.editDraft.set(value);
  }

  saveEditDetails(ev: CampaignEvent) {
    if (this.editSaving()) return;
    const title      = this.editTitle().trim();
    const destType   = this.editDestType();
    if (!title || !destType) return;

    const linkedEntities = this.editLinkedEntities();
    // Prevent saving if no triggers selected and destType is not 'none'
    if (destType !== 'none' && linkedEntities.length === 0) {
      this.editSaveError.set('Please select at least one trigger.');
      return;
    }

    this.editSaving.set(true);
    this.editSaveError.set(null);

    const resolvedTodPercent = destType === 'time-of-day' ? this.editTodPositionPercent() : null;

    const payload = {
      title,
      body: this.editDraft(),
      linkedEntities,
      todPositionPercent: resolvedTodPercent,
    };

    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${ev.id}/details`,
      payload
    ).subscribe({
      next: () => {
        const file = this.editFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          this.http.post(
            `${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${ev.id}/handout-image`,
            formData
          ).subscribe({
            next: (res: any) => {
              this.events.update(evs => evs.map(e => e.id === ev.id
                ? { ...e, title, body: this.editDraft(), linkedEntities, todPositionPercent: resolvedTodPercent, imageUrl: res.imageUrl }
                : e));
              this._finishEditSave(ev.id);
            },
            error: () => {
              this.events.update(evs => evs.map(e => e.id === ev.id
                ? { ...e, title, body: this.editDraft(), linkedEntities, todPositionPercent: resolvedTodPercent }
                : e));
              this.editSaving.set(false);
              this.editSaveError.set('Details saved but image upload failed.');
            },
          });
        } else {
          this.events.update(evs => evs.map(e => e.id === ev.id
            ? { ...e, title, body: this.editDraft(), linkedEntities, todPositionPercent: resolvedTodPercent }
            : e));
          this._finishEditSave(ev.id);
        }
      },
      error: (err) => {
        this.editSaving.set(false);
        const raw = err?.error;
        this.editSaveError.set(typeof raw === 'string' && raw.length ? raw : 'Failed to save. Please try again.');
      },
    });
  }

  private _finishEditSave(eventId: string) {
    this.editSaving.set(false);
    this.editSaveSuccess.set(true);
    setTimeout(() => {
      this.editSaveSuccess.set(false);
      this._clearEditState();
    }, 1500);
  }

  requestDelete(eventId: string, domEvent: Event) {
    domEvent.stopPropagation();
    this.confirmDeleteId.set(eventId);
  }

  cancelDelete(domEvent: Event) {
    domEvent.stopPropagation();
    this.confirmDeleteId.set(null);
  }

  confirmDelete(eventId: string, domEvent: Event) {
    domEvent.stopPropagation();
    if (this.deleting()) return;
    this.deleting.set(true);
    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${eventId}`
    ).subscribe({
      next: () => {
        this.events.update(evs => evs.filter(e => e.id !== eventId));
        this.confirmDeleteId.set(null);
        this.deleting.set(false);
        if (this.expandedId() === eventId) this.expandedId.set(null);
        if (this.editingId() === eventId) this._clearEditState();
      },
      error: () => {
        this.deleting.set(false);
      },
    });
  }

  toggleVisibility(event: CampaignEvent, domEvent: Event) {
    domEvent.stopPropagation();

    const next = !event.visibleToPlayers;
    const entityVisibilities = event.linkedEntities.map(le => ({
      entityType: le.entityType,
      entityId: le.entityId,
      todPositionPercent: le.todPositionPercent,
      isVisible: next
    }));

    // Add campaign visibility unless the event is exclusively time-of-day
    const isTimeOfDayOnly = event.linkedEntities.length === 1 && event.linkedEntities[0].entityType === 'time-of-day';
    if (!isTimeOfDayOnly) {
      entityVisibilities.push({
        entityType: 'campaign-event',
        entityId: event.id,
        todPositionPercent: null,
        isVisible: next
      });
    }

    const body = { entityVisibilities };
    
    this.http.patch(`${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${event.id}/visibility`, body)
      .subscribe({
        next: () => {
          this.events.update(evs => evs.map(e => e.id === event.id ? { ...e, visibleToPlayers: next } : e));
        },
      });
  }

  entityNameFor(event: CampaignEvent): string {
    if (event.linkedEntities.length === 0) return 'GM Note';
    if (event.linkedEntities.length > 1) return 'Multitrigger';
    const first = event.linkedEntities[0];
    if (first.entityType === 'campaign') return 'Campaign';
    if (first.entityType === 'time-of-day') return this.getTimeSliceName(event.todPositionPercent);
    const id = first.entityId;
    if (!id) return '';
    if (first.entityType === 'cast')        return this.casts().find(c => c.instanceId === id)?.name ?? id;
    if (first.entityType === 'location')    return this.locations().find(l => l.instanceId === id)?.name ?? id;
    if (first.entityType === 'sublocation') return this.sublocations().find(s => s.instanceId === id)?.name ?? id;
    if (first.entityType === 'faction')     return this.factions().find(f => f.factionInstanceId === id)?.name ?? id;
    if (first.entityType === 'player')      return this.players().find(p => p.userId === id)?.displayName ?? id;
    return '';
  }

  groupedTriggers(event: CampaignEvent): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const item of event.linkedEntities) {
      if (!groups[item.entityType]) {
        groups[item.entityType] = [];
      }
      let name = item.entityName;
      if (!name && item.entityId) {
        const id = item.entityId;
        if (item.entityType === 'cast')        name = this.casts().find(c => c.instanceId === id)?.name ?? id;
        else if (item.entityType === 'location')    name = this.locations().find(l => l.instanceId === id)?.name ?? id;
        else if (item.entityType === 'sublocation') name = this.sublocations().find(s => s.instanceId === id)?.name ?? id;
        else if (item.entityType === 'faction')     name = this.factions().find(f => f.factionInstanceId === id)?.name ?? id;
        else if (item.entityType === 'player')      name = this.players().find(p => p.userId === id)?.displayName ?? id;
        else if (item.entityType === 'campaign')   name = 'Campaign';
        else name = id;
      }
      groups[item.entityType].push(name || item.entityId);
    }
    return groups;
  }

  private getTimeSliceName(todPositionPercent: number | null): string {
    const tod = this.tod();
    if (!tod || todPositionPercent === null) return 'Time of Day';
    const slice = tod.slices.find(s => todPositionPercent >= s.startPercent && todPositionPercent < s.endPercent);
    return slice?.label ?? 'Time of Day';
  }

  getIconForType(type: string): SafeHtml {
    const icons: Record<string, string> = {
      'cast': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      'faction': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      'location': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
      'sublocation': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      'player': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
      'time-of-day': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
      'campaign': `<svg viewBox="0 0 24 24" fill="none" stroke="#e94560" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[type] || icons['campaign']);
  }

  onDragStart(index: number, event: DragEvent) {
    if (this.editingId() !== null) { event.preventDefault(); return; }
    this.draggingIndex.set(index);
    event.dataTransfer!.effectAllowed = 'move';
  }

  // ── Touch drag (same pattern as TimeOfDayBarComponent) ──────────────────────

  onHandleTouchStart(index: number, event: TouchEvent) {
    if (this.editingId() !== null) return;
    event.preventDefault(); // prevent scroll while dragging
    this.draggingIndex.set(index);
  }

  @HostListener('document:touchmove', ['$event'])
  onDocTouchMove(event: TouchEvent) {
    if (this.draggingIndex() === null) return;
    event.preventDefault();
    const touch = event.touches[0];
    this.updateDropLineFromY(touch.clientY);
  }

  @HostListener('document:touchend')
  @HostListener('document:touchcancel')
  onDocTouchEnd() {
    if (this.draggingIndex() === null) return;
    this.commitDrop();
  }

  onItemDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.dropLineIndex.set(event.clientY < rect.top + rect.height / 2 ? index : index + 1);
  }

  private updateDropLineFromY(clientY: number) {
    const list = this.evListRef?.nativeElement;
    if (!list) return;
    const items = Array.from(list.querySelectorAll<HTMLElement>('.ev-item'));
    let target = items.length; // default: after last
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) { target = i; break; }
    }
    this.dropLineIndex.set(target);
  }

  onListDragLeave(event: DragEvent) {
    const list = (event.currentTarget as HTMLElement);
    const rect = list.getBoundingClientRect();
    if (
      event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top  || event.clientY > rect.bottom
    ) {
      this.dropLineIndex.set(null);
    }
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.commitDrop();
  }

  private commitDrop() {
    const from = this.draggingIndex();
    const to   = this.dropLineIndex();
    if (from === null || to === null || to === from || to === from + 1) {
      this.resetDrag(); return;
    }
    const list = [...this.events()];
    const insertAt = to > from ? to - 1 : to;
    const [moved] = list.splice(from, 1);
    list.splice(insertAt, 0, moved);
    this.events.set(list);
    this.http.patch(`${environment.apiUrl}/api/campaigns/${this.campaignId}/events/reorder`, { eventIds: list.map(e => e.id) })
      .subscribe();
    this.resetDrag();
  }

  onDragEnd() {
    this.resetDrag();
  }

  private resetDrag() {
    this.draggingIndex.set(null);
    this.dropLineIndex.set(null);
  }

  saveEvent() {
    if (!this.canSave()) return;
    const d   = this.destType();
    let linkedEntities = this.linkedEntities();
    let todPct = d === 'time-of-day' ? this.todPositionPercent() : null;

    // For time-of-day, automatically add it to linkedEntities if not already present
    if (d === 'time-of-day' && !linkedEntities.some(e => e.entityType === 'time-of-day')) {
      let entityName = 'Time of Day';
      const tod = this.tod();
      if (todPct !== null && tod) {
        const slice = tod.slices.find(s => todPct! >= s.startPercent && todPct! < s.endPercent);
        entityName = slice?.label ?? 'Time of Day';
      }
      linkedEntities = [...linkedEntities, { entityType: 'time-of-day', entityId: this.campaignId, entityName, todPositionPercent: todPct }];
    }

    // Extract todPositionPercent from time-of-day linked entity if present
    const timeOfDayEntity = linkedEntities.find(e => e.entityType === 'time-of-day');
    if (timeOfDayEntity?.todPositionPercent !== null && timeOfDayEntity?.todPositionPercent !== undefined) {
      todPct = timeOfDayEntity.todPositionPercent;
    }

    // Determine visibility: if "none" or no linked entities, not visible to players
    // Time-of-day is not visible to players
    const hasLinked = linkedEntities.length > 0 || this.entityId();
    const isVisibleToPlayers = d !== 'none' && d !== 'time-of-day' && hasLinked;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/events`,
      { title: this.eventTitle().trim(), body: this.eventBody().trim(), linkedEntities, todPositionPercent: todPct, isVisibleToPlayers }
    ).subscribe({
      next: () => {
        this.eventTitle.set('');
        this.eventBody.set('');
        this.destType.set('none');
        this.entityId.set('');
        this.todPositionPercent.set(null);
        this.linkedEntities.set([]);
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 3000);
        this.loadEvents();
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to save event. Please try again.');
      },
    });
  }

  onHandoutFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    const prev = this.handoutPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);

    const isImage = file.type.startsWith('image/');
    this.handoutFile.set(file);
    this.handoutPreviewUrl.set(isImage ? URL.createObjectURL(file) : null);
  }

  uploadHandout() {
    if (!this.canUploadHandout()) return;

    this.handoutUploading.set(true);
    this.handoutError.set(null);
    this.handoutSuccess.set(false);

    const linkedEntities = this.handoutLinkedEntities();
    
    const payload: { title: string; body?: string; linkedEntities: LinkedItem[] } = {
      title: this.handoutTitle().trim(),
      linkedEntities,
    };
    const body = this.handoutBody().trim();
    if (body) payload.body = body;

    this.http.post<{ id: string }>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/events/handout`,
      payload
    ).subscribe({
      next: (created) => {
        const file = this.handoutFile();
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          this.http.post(
            `${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${created.id}/handout-image`,
            formData
          ).subscribe({
            next: () => this._resetHandoutForm(),
            error: (err) => {
              // Event was created but image upload failed — still reload
              this._resetHandoutForm();
              const raw = err?.error;
              const msg = typeof raw === 'string' && raw.length > 0 ? raw : 'Handout saved but image upload failed.';
              this.handoutError.set(msg);
            },
          });
        } else {
          this._resetHandoutForm();
        }
      },
      error: (err) => {
        this.handoutUploading.set(false);
        const raw = err?.error;
        const msg = typeof raw === 'string' && raw.length > 0
          ? raw
          : 'Failed to save handout. Please try again.';
        this.handoutError.set(msg);
      },
    });
  }

  private _resetHandoutForm() {
    const prev = this.handoutPreviewUrl();
    if (prev) URL.revokeObjectURL(prev);
    this.handoutTitle.set('');
    this.handoutBody.set('');
    this.handoutFile.set(null);
    this.handoutPreviewUrl.set(null);
    this.handoutDestType.set('none');
    this.handoutEntityId.set('');
    this.handoutUploading.set(false);
    this.handoutSuccess.set(true);
    setTimeout(() => this.handoutSuccess.set(false), 3000);
    this.loadEvents();
  }

  archiveClicked() {
    if (this.archiving() || !this.hasUnlockedEventsToArchive()) return;
    
    this.archiving.set(true);
    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/events/archive`,
      {}
    ).subscribe({
      next: (res: any) => {
        this.archiving.set(false);
        this.loadEvents();
      },
      error: () => {
        this.archiving.set(false);
      },
    });
  }
}
