import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { SessionService } from '../../../core/session.service';
import { environment } from '../../../../environments/environment';
import { NoteDestinationPickerComponent } from '../../../shared/components/note-destination-picker/note-destination-picker.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { StorylineFilterBarComponent } from '../../../shared/components/storyline-filter-bar/storyline-filter-bar.component';
import { EntityBadgeComponent } from '../../../shared/components/entity-badge/entity-badge.component';
import { ChroniclesTimelineComponent } from '../../../shared/components/chronicles-timeline/chronicles-timeline.component';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { CampaignPlayer } from '../../../shared/models/campaign.model';
import { TimeOfDay } from '../../../shared/models/time-of-day.model';
import { Session } from '../../../shared/models/session.model';
import { ChroniclesResponse, ChronicleSession, ChronicleItem } from '../../../shared/models/chronicle.model';
import { CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';

type EventsTab = 'events' | 'create-events' | 'create-handout' | 'chronicles';
type DestType = 'cast' | 'faction' | 'campaign' | 'sublocation' | 'location' | 'player' | 'none' | 'time-of-day';

interface LinkedItem {
  entityType: string | null;
  entityId: string;
  entityName: string | null;
  todPositionPercent?: number | null;
}

interface CampaignEvent {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  linkedEntities: LinkedItem[];
  visibleToPlayers: boolean;
  markedForArchive: boolean;
  sortOrder: number;
  createdAt: string;
  imageUrl?: string;
  todPositionPercent: number | null;
  archived: boolean;
  sceneType: string;
}

@Component({
  selector: 'app-dm-events',
  standalone: true,
  imports: [CommonModule, FormsModule, NoteDestinationPickerComponent, LockIconComponent, StorylineFilterBarComponent, ChroniclesTimelineComponent],
  templateUrl: './dm-events.component.html',
  styleUrl: './dm-events.component.scss',
})
export class DmEventsComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private shellSvc = inject(CampaignShellService);
  private http     = inject(HttpClient);
  sanitizer = inject(DomSanitizer);
  private sessionService = inject(SessionService);

  campaignId = '';

  activeTab = signal<EventsTab>('events');

  // Events list
  events        = signal<CampaignEvent[]>([]);
  loadingEvents = signal(false);
  expandedIds   = signal<Set<string>>(new Set());

  // Inline edit
  editingId        = signal<string | null>(null);
  editTitle        = signal('');
  editDraft        = signal('');
  editSceneType    = signal<'campaign-event' | 'campaign-handout'>('campaign-event');
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

  
  // Session state
  activeSession    = signal<Session | null>(null);
  totalSessionCount = signal(0);
  loadingSession   = signal(false);
  startingSession  = signal(false);
  endingSession    = signal(false);
  showStartSessionConfirm = signal(false);
  endSessionPanelOpen = signal(false);
  endSessionPanelClosing = signal(false);
  endSessionPanelAnimating = signal(false);
  alternateTitle = signal('');
  private readonly PANEL_SLIDE_DURATION = 260;

  // Filter state — empty array = show all (persisted to localStorage per campaign)
  typeFilters       = signal<string[]>([]);
  visibilityFilters = signal<string[]>([]);

  // Chronicles state
  chronicles       = signal<ChroniclesResponse | null>(null);
  loadingChronicles = signal(false);
  chroniclesPage   = signal(1);
  chroniclesSearchQuery = signal('');
  chroniclesTypeFilters = signal<string[]>([]);
  expandedSessionIds = signal<Set<string>>(new Set());
  chronicleEditingId = signal<string | null>(null);
  chronicleEditTitle = signal('');
  chronicleEditBody = signal('');
  chronicleSaving = signal(false);
  chronicleSaveError = signal<string | null>(null);
  chronicleEditSessionId = signal('');
  chronicleEditSortOrder = signal(0);

  sessionOptions = computed<CampaignDropdownOption[]>(() => {
    const chrons = this.chronicles();
    if (!chrons || !chrons.sessions) return [];
    return chrons.sessions.map(s => ({
      value: s.sessionId,
      label: `Session ${s.sessionNumber}${s.alternateTitle ? ' - ' + s.alternateTitle : ''}`
    }));
  });

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
        let effectiveType: string;
        const linkedEntityType = ev.linkedEntities.length > 0 ? ev.linkedEntities[0].entityType ?? 'none' : 'none';
        if (linkedEntityType === 'campaign') {
          effectiveType = 'campaign-event';
        } else if (ev.sceneType === 'campaign-handout') {
          effectiveType = 'campaign-handout';
        } else if (ev.imageUrl) {
          effectiveType = 'handout';
        } else {
          effectiveType = linkedEntityType;
        }
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

  onEventsTypeFilterChange(filters: string[]) {
    this.typeFilters.set(filters);
    localStorage.setItem(this.filterStorageKey('types'), JSON.stringify(filters));
  }

  onEventsVisibilityFilterChange(filters: string[]) {
    this.visibilityFilters.set(filters);
    localStorage.setItem(this.filterStorageKey('visibility'), JSON.stringify(filters));
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

  readonly allUsedEntities = computed<LinkedItem[]>(() => {
    const allItems: LinkedItem[] = [];
    for (const ev of this.events()) {
      allItems.push(...ev.linkedEntities.filter(le => le.entityType !== 'time-of-day' && le.entityType !== 'player'));
    }
    return allItems;
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
    if (tab === 'chronicles') this.loadChronicles();
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
    this.loadActiveSession();
    this.loadSessionCount();
  }

  loadEvents() {
    this.loadingEvents.set(true);
    this.http.get<CampaignEvent[]>(`${environment.apiUrl}/api/campaigns/${this.campaignId}/events`)
      .subscribe({
        next:  data => { this.events.set(data); this.loadingEvents.set(false); },
        error: ()   => { this.loadingEvents.set(false); },
      });
  }

  loadActiveSession() {
    this.loadingSession.set(true);
    this.sessionService.getActiveSession(this.campaignId).subscribe({
      next:  session => {
        this.activeSession.set(session);
        this.loadingSession.set(false);
      },
      error: () => { this.loadingSession.set(false); },
    });
  }

  loadSessionCount() {
    this.sessionService.getSessionCount(this.campaignId).subscribe({
      next:  count => {
        this.totalSessionCount.set(count);
      },
      error: () => {},
    });
  }

  toggleExpand(id: string) {
    if (this.editingId() !== null) return;
    const current = new Set(this.expandedIds());
    if (current.has(id)) {
      current.delete(id);
      this.editingId.set(null);
    } else {
      current.add(id);
    }
    this.expandedIds.set(current);
  }

  toggleEdit(ev: CampaignEvent, domEvent: Event) {
    domEvent.stopPropagation();
    if (this.editingId() === ev.id) {
      this._clearEditState();
    } else {
      this.editingId.set(ev.id);
      this.editTitle.set(ev.title);
      this.editDraft.set(ev.body);
      this.editSceneType.set((ev.sceneType as 'campaign-event' | 'campaign-handout') ?? 'campaign-event');
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

  onEditSceneTypeChange(value: 'campaign-event' | 'campaign-handout') {
    this.editSceneType.set(value);
    if (value === 'campaign-event') {
      const prev = this.editPreviewUrl();
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      this.editPreviewUrl.set(null);
      this.editFile.set(null);
    }
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
      sceneType: this.editSceneType(),
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
                ? { ...e, title, body: this.editDraft(), sceneType: this.editSceneType(), linkedEntities, todPositionPercent: resolvedTodPercent, imageUrl: res.imageUrl, visibleToPlayers: e.visibleToPlayers }
                : e));
              this._finishEditSave(ev.id);
            },
            error: () => {
              this.events.update(evs => evs.map(e => e.id === ev.id
                ? { ...e, title, body: this.editDraft(), sceneType: this.editSceneType(), linkedEntities, todPositionPercent: resolvedTodPercent, visibleToPlayers: e.visibleToPlayers }
                : e));
              this.editSaving.set(false);
              this.editSaveError.set('Details saved but image upload failed.');
            },
          });
        } else {
          const shouldClearImage = ev.sceneType === 'campaign-handout' && this.editSceneType() === 'campaign-event';
          this.events.update(evs => evs.map(e => e.id === ev.id
            ? { ...e, title, body: this.editDraft(), sceneType: this.editSceneType(), linkedEntities, todPositionPercent: resolvedTodPercent, imageUrl: shouldClearImage ? undefined : e.imageUrl, visibleToPlayers: e.visibleToPlayers }
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
        const current = new Set(this.expandedIds());
        current.delete(eventId);
        this.expandedIds.set(current);
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

    const isGmOnlyCampaignEvent = event.linkedEntities.length === 0 
      && event.sceneType === 'campaign-event';

    if (!isGmOnlyCampaignEvent) {
      entityVisibilities.push({
        entityType: event.sceneType,
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

  toggleArchiveMark(event: CampaignEvent, domEvent: Event) {
    domEvent.stopPropagation();

    const next = !event.markedForArchive;

    this.http.patch(`${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${event.id}/archive-mark`, next)
      .subscribe({
        next: () => {
          this.events.update(evs => evs.map(e => e.id === event.id ? { ...e, markedForArchive: next } : e));
        },
      });
  }

  entityNameFor(event: CampaignEvent): string {
    if (event.sceneType === 'campaign-handout') return 'GM Handout';
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
      const type = item.entityType ?? 'unknown';
      if (!groups[type]) {
        groups[type] = [];
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
      groups[type].push(name || item.entityId);
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

    const isVisibleToPlayers = false;

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

  requestStartSession() {
    this.showStartSessionConfirm.set(true);
  }

  cancelStartSession() {
    this.showStartSessionConfirm.set(false);
  }

  confirmStartSession() {
    if (this.startingSession()) return;
    this.startingSession.set(true);
    this.showStartSessionConfirm.set(false);

    this.sessionService.startSession(this.campaignId).subscribe({
      next: (session) => {
        this.activeSession.set(session);
        this.loadSessionCount();
        this.startingSession.set(false);
      },
      error: () => {
        this.startingSession.set(false);
      },
    });
  }

  getNextSessionNumber(): number {
    const active = this.activeSession();
    if (active) {
      return active.sessionNumber;
    }
    // No active session: use total count + 1 (defaults to 1 if count is 0)
    return this.totalSessionCount() + 1;
  }

  requestEndSession() {
    if (this.endSessionPanelOpen() && !this.endSessionPanelClosing()) {
      this.endSessionPanelClosing.set(true);
      setTimeout(() => {
        this.endSessionPanelOpen.set(false);
        this.endSessionPanelClosing.set(false);
        this.alternateTitle.set('');
      }, this.PANEL_SLIDE_DURATION);
    } else if (!this.endSessionPanelOpen()) {
      this.alternateTitle.set('');
      this.endSessionPanelOpen.set(true);
      this.endSessionPanelAnimating.set(true);
      setTimeout(() => {
        this.endSessionPanelAnimating.set(false);
      }, this.PANEL_SLIDE_DURATION);
    }
  }

  cancelEndSession() {
    this.endSessionPanelClosing.set(true);
    setTimeout(() => {
      this.endSessionPanelOpen.set(false);
      this.endSessionPanelClosing.set(false);
      this.alternateTitle.set('');
    }, this.PANEL_SLIDE_DURATION);
  }

  confirmEndSession() {
    if (this.endingSession()) return;
    this.endingSession.set(true);
    this.endSessionPanelClosing.set(true);

    const currentDay = this.tod()?.daysPassed ?? 0;
    
    this.sessionService.endSession(this.campaignId, currentDay, this.alternateTitle()).subscribe({
      next: () => {
        this.activeSession.set(null);
        this.loadSessionCount();
        this.endingSession.set(false);
        this.loadEvents();
        this.loadChronicles();
        setTimeout(() => {
          this.endSessionPanelOpen.set(false);
          this.endSessionPanelClosing.set(false);
          this.alternateTitle.set('');
        }, this.PANEL_SLIDE_DURATION);
      },
      error: () => {
        this.endingSession.set(false);
        this.endSessionPanelClosing.set(false);
      },
    });
  }

  // Chronicles methods
  loadChronicles(searchQuery?: string, typeFilters?: string[]) {
    this.chronicles.set(null);
    this.loadingChronicles.set(true);
    const params = new URLSearchParams({
      pageNumber: this.chroniclesPage().toString(),
      pageSize: '5'
    });

    const actualSearchQuery = searchQuery ?? this.chroniclesSearchQuery();
    const actualTypeFilters = typeFilters ?? this.chroniclesTypeFilters();

    if (actualSearchQuery) {
      params.append('searchQuery', actualSearchQuery);
    }

    actualTypeFilters.forEach(filter => {
      params.append('typeFilters', filter);
    });

    this.http.get<ChroniclesResponse>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/sessions-paged?${params}`
    ).subscribe({
      next: (response) => {
        this.chronicles.set(response);
        // Initialize all sessions as expanded
        const allSessionIds = new Set(response.sessions.map(s => s.sessionId));
        this.expandedSessionIds.set(allSessionIds);
        this.loadingChronicles.set(false);
      },
      error: () => {
        this.loadingChronicles.set(false);
      }
    });
  }

  onChronicleSearch(payload: { query: string; filters: string[] }) {
    this.chroniclesSearchQuery.set(payload.query);
    this.chroniclesTypeFilters.set(payload.filters);
    this.chroniclesPage.set(1);
    this.loadChronicles(payload.query, payload.filters);
  }

  onChronicleReset() {
    this.chroniclesSearchQuery.set('');
    this.chroniclesTypeFilters.set([]);
    this.chroniclesPage.set(1);
    this.loadChronicles();
  }

  onChronicleTypeFilterChange(filters: string[]) {
    this.chroniclesTypeFilters.set(filters);
    this.chroniclesPage.set(1);
    this.loadChronicles(this.chroniclesSearchQuery(), filters);
  }

  chronicleNextPage() {
    const current = this.chroniclesPage();
    const total = this.chronicles()?.totalPages ?? 1;
    if (current < total) {
      this.chroniclesPage.set(current + 1);
      this.loadChronicles();
    }
  }

  chroniclePrevPage() {
    const current = this.chroniclesPage();
    if (current > 1) {
      this.chroniclesPage.set(current - 1);
      this.loadChronicles();
    }
  }

  toggleSessionExpand(sessionId: string) {
    const current = new Set(this.expandedSessionIds());
    if (current.has(sessionId)) {
      current.delete(sessionId);
    } else {
      current.add(sessionId);
    }
    this.expandedSessionIds.set(current);
  }

  openChronicleEdit(chronicle: ChronicleItem) {
    this.chronicleEditingId.set(chronicle.id);
    this.chronicleEditTitle.set(chronicle.title);
    this.chronicleEditBody.set(chronicle.body);
    this.chronicleSaveError.set(null);

    // Find the session and sort order from the chronicles structure
    const chrons = this.chronicles();
    if (chrons && chrons.sessions) {
      for (const session of chrons.sessions) {
        const index = session.chronicles.findIndex(c => c.id === chronicle.id);
        if (index !== -1) {
          this.chronicleEditSessionId.set(session.sessionId);
          this.chronicleEditSortOrder.set(index + 1);
          break;
        }
      }
    }
  }

  closeChronicleEdit() {
    this.chronicleEditingId.set(null);
    this.chronicleEditTitle.set('');
    this.chronicleEditBody.set('');
    this.chronicleEditSessionId.set('');
    this.chronicleEditSortOrder.set(0);
    this.chronicleSaveError.set(null);
  }

  saveChronicleEdit(id: string) {
    if (!this.chronicleEditTitle().trim()) {
      this.chronicleSaveError.set('Title is required');
      return;
    }

    this.chronicleSaving.set(true);
    this.chronicleSaveError.set(null);

    this.http.patch(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/${id}`,
      {
        title: this.chronicleEditTitle(),
        body: this.chronicleEditBody(),
        sessionId: this.chronicleEditSessionId(),
        sortOrder: this.chronicleEditSortOrder()
      }
    ).subscribe({
      next: () => {
        this.chronicleSaving.set(false);
        this.closeChronicleEdit();
        this.loadChronicles();
      },
      error: () => {
        this.chronicleSaving.set(false);
        this.chronicleSaveError.set('Failed to save chronicle');
      }
    });
  }

  onChronicleSessionChange(sessionId: string) {
    this.chronicleEditSessionId.set(sessionId);
  }

  onChronicleSortOrderChange(sortOrder: number) {
    this.chronicleEditSortOrder.set(sortOrder);
  }

  deleteSession(sessionId: string) {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/chronicles/sessions/${sessionId}`
    ).subscribe({
      next: () => {
        this.loadChronicles();
      },
      error: () => {
        alert('Failed to delete session');
      }
    });
  }

  formatSessionDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatInGameDays(days: number[]): string {
    if (days.length === 0) return '';
    if (days.length === 1) return `In-Game Day ${days[0]}`;
    const sorted = [...days].sort((a, b) => a - b);
    return `In-Game Days ${sorted.join(', ')}`;
  }

  get unlockedEventsForArchive(): CampaignEvent[] {
    return this.events().filter(ev => {
      const isUnlockedOrMarked = ev.visibleToPlayers || ev.markedForArchive;
      const isGmNote = ev.sceneType === 'campaign-event' && ev.linkedEntities.length === 0;
      return isUnlockedOrMarked && !isGmNote;
    });
  }

  get gmNotesForArchive(): CampaignEvent[] {
    return this.events().filter(ev => {
      const isUnlockedOrMarked = ev.visibleToPlayers || ev.markedForArchive;
      const isGmNote = ev.sceneType === 'campaign-event' && ev.linkedEntities.length === 0;
      return isUnlockedOrMarked && isGmNote;
    });
  }
}
