import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CampaignShellService } from '../../../core/campaign-shell.service';
import { environment } from '../../../../environments/environment';
import { NoteDestinationPickerComponent } from '../../../shared/components/note-destination-picker/note-destination-picker.component';
import { LockIconComponent } from '../../../shared/components/lock-icon/lock-icon.component';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSublocationInstance } from '../../../shared/models/sublocation.model';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignFactionInstance } from '../../../shared/models/faction.model';
import { CampaignPlayer } from '../../../shared/models/campaign.model';

type EventsTab = 'events' | 'create-events' | 'create-handout';
type DestType = 'cast' | 'faction' | 'campaign' | 'sublocation' | 'location' | 'player';

interface CampaignEvent {
  id: string;
  campaignId: string;
  title: string;
  body: string;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
  visibleToPlayers: boolean;
  sortOrder: number;
  createdAt: string;
  imageUrl?: string;
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
  editFile         = signal<File | null>(null);
  editPreviewUrl   = signal<string | null>(null);
  editSaving       = signal(false);
  editSaveError    = signal<string | null>(null);
  editSaveSuccess  = signal(false);
  autoSaveStatus   = signal<'idle' | 'saving' | 'saved'>('idle');
  private saveTimer: ReturnType<typeof setTimeout> | undefined;

  // Per-event "also unlock card" toggle (defaults to true)
  unlockCardMap = signal<Record<string, boolean>>({});

  getUnlockCard(eventId: string): boolean {
    const val = this.unlockCardMap()[eventId];
    return val === undefined ? true : val;
  }

  setUnlockCard(eventId: string, value: boolean) {
    this.unlockCardMap.update(m => ({ ...m, [eventId]: value }));
  }

  // Delete confirm state
  confirmDeleteId  = signal<string | null>(null);
  deleting         = signal(false);

  // Filter state — empty array = show all
  typeFilters       = signal<string[]>([]);
  visibilityFilters = signal<string[]>([]);

  filteredEvents = computed(() => {
    const types = this.typeFilters();
    const vis   = this.visibilityFilters();
    return this.events().filter(ev => {
      if (types.length > 0) {
        const effectiveType = ev.imageUrl ? 'handout' : (ev.linkedEntityType ?? 'campaign');
        if (!types.includes(effectiveType)) return false;
      }
      if (vis.length > 0) {
        const isUnlocked = ev.visibleToPlayers;
        if (!((vis.includes('unlocked') && isUnlocked) || (vis.includes('locked') && !isUnlocked))) return false;
      }
      return true;
    });
  });

  toggleTypeFilter(type: string) {
    const current = this.typeFilters();
    this.typeFilters.set(
      current.includes(type) ? current.filter(t => t !== type) : [...current, type]
    );
  }

  toggleVisibilityFilter(v: string) {
    const current = this.visibilityFilters();
    this.visibilityFilters.set(
      current.includes(v) ? current.filter(f => f !== v) : [...current, v]
    );
  }

  // Drag state
  draggingIndex = signal<number | null>(null);
  dropLineIndex = signal<number | null>(null);

  @ViewChild('evList') evListRef!: ElementRef<HTMLElement>;

  // Create event form
  eventTitle = signal('');
  eventBody  = signal('');
  destType   = signal<DestType | null>(null);
  entityId   = signal('');
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
  handoutDestType   = signal<DestType | null>(null);
  handoutEntityId   = signal('');

  canUploadHandout = computed(() => {
    const title = this.handoutTitle();
    const file  = this.handoutFile();
    const d     = this.handoutDestType();
    const eId   = this.handoutEntityId();
    if (!title.trim() || !file) return false;
    if (!d) return false;
    const needsEntity = d === 'cast' || d === 'faction' || d === 'location' || d === 'sublocation' || d === 'player';
    if (needsEntity && !eId) return false;
    return true;
  });

  onHandoutDestTypeChange(value: string) {
    this.handoutDestType.set(value as DestType);
    this.handoutEntityId.set('');
  }

  // Campaign data from shell (already loaded by the shell component)
  get locations(): CampaignLocationInstance[] {
    return this.shellSvc.campaign()?.locations ?? [];
  }
  get sublocations(): CampaignSublocationInstance[] {
    return (this.shellSvc.campaign()?.sublocations ?? []).filter(s => !s.isPartyAnchor);
  }
  get casts(): CampaignCastInstance[] {
    return this.shellSvc.campaign()?.casts ?? [];
  }
  get factions(): CampaignFactionInstance[] {
    return this.shellSvc.campaign()?.factions ?? [];
  }
  get players(): CampaignPlayer[] {
    return this.shellSvc.campaign()?.players ?? [];
  }

  canSave = computed(() => {
    const title = this.eventTitle();
    const body  = this.eventBody();
    const d     = this.destType();
    const eId   = this.entityId();
    if (!title.trim() || !body.trim()) return false;
    if (!d) return false;
    const needsEntity = d === 'cast' || d === 'faction' || d === 'location' || d === 'sublocation' || d === 'player';
    if (needsEntity && !eId) return false;
    return true;
  });

  setTab(tab: EventsTab) {
    this.activeTab.set(tab);
    if (tab === 'events') this.loadEvents();
  }

  onDestTypeChange(value: string) {
    this.destType.set(value as DestType);
    this.entityId.set('');
  }

  ngOnDestroy() {
    clearTimeout(this.saveTimer);
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.campaignId = id;
    this.shellSvc.setTitleContext({ pageType: 'gm-events', campaignId: id, baseRoute: '/campaign', location: null }, '56px');
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
      this.editDestType.set((ev.linkedEntityType as DestType) ?? null);
      this.editEntityId.set(ev.linkedEntityId ?? '');
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
    const entityId   = this.editEntityId();
    if (!title || !destType) return;

    this.editSaving.set(true);
    this.editSaveError.set(null);

    const payload = {
      title,
      body:             this.editDraft(),
      linkedEntityType: destType,
      linkedEntityId:   entityId || undefined,
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
                ? { ...e, title, body: this.editDraft(), linkedEntityType: destType, linkedEntityId: entityId || null, imageUrl: res.imageUrl }
                : e));
              this._finishEditSave(ev.id);
            },
            error: () => {
              this.events.update(evs => evs.map(e => e.id === ev.id
                ? { ...e, title, body: this.editDraft(), linkedEntityType: destType, linkedEntityId: entityId || null }
                : e));
              this.editSaving.set(false);
              this.editSaveError.set('Details saved but image upload failed.');
            },
          });
        } else {
          this.events.update(evs => evs.map(e => e.id === ev.id
            ? { ...e, title, body: this.editDraft(), linkedEntityType: destType, linkedEntityId: entityId || null }
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
    this.http.patch(`${environment.apiUrl}/api/campaigns/${this.campaignId}/events/${event.id}/visibility`, { isVisibleToPlayers: next })
      .subscribe({
        next: () => {
          event.visibleToPlayers = next;
          if (next && event.linkedEntityId && event.linkedEntityType && this.getUnlockCard(event.id)) {
            this._unlockLinkedEntity(event.linkedEntityType, event.linkedEntityId);
          }
        },
      });
  }

  private _unlockLinkedEntity(entityType: string, entityId: string) {
    const urlMap: Record<string, string> = {
      cast:        `${environment.apiUrl}/api/campaigns/${this.campaignId}/casts/${entityId}/visibility`,
      location:    `${environment.apiUrl}/api/campaigns/${this.campaignId}/locations/${entityId}/visibility`,
      sublocation: `${environment.apiUrl}/api/campaigns/${this.campaignId}/sublocations/${entityId}/visibility`,
      faction:     `${environment.apiUrl}/api/campaigns/${this.campaignId}/factions/${entityId}/visibility`,
    };
    const url = urlMap[entityType];
    if (!url) return;

    this.http.patch(url, { isVisibleToPlayers: true }).subscribe({
      next: () => {
        this.shellSvc.updateCampaign(c => {
          if (!c) return c;
          if (entityType === 'cast') {
            return { ...c, casts: c.casts.map(ca => ca.instanceId === entityId ? { ...ca, isVisibleToPlayers: true } : ca) };
          }
          if (entityType === 'location') {
            return { ...c, locations: c.locations.map(l => l.instanceId === entityId ? { ...l, isVisibleToPlayers: true } : l) };
          }
          if (entityType === 'sublocation') {
            return { ...c, sublocations: c.sublocations.map(s => s.instanceId === entityId ? { ...s, isVisibleToPlayers: true } : s) };
          }
          if (entityType === 'faction') {
            return { ...c, factions: c.factions.map(f => f.factionInstanceId === entityId ? { ...f, isVisibleToPlayers: true } : f) };
          }
          return c;
        });
      },
    });
  }

  entityNameFor(event: CampaignEvent): string {
    if (!event.linkedEntityType || event.linkedEntityType === 'campaign') return 'Campaign';
    const id = event.linkedEntityId;
    if (!id) return '';
    if (event.linkedEntityType === 'cast')        return this.casts.find(c => c.instanceId === id)?.name ?? id;
    if (event.linkedEntityType === 'location')    return this.locations.find(l => l.instanceId === id)?.name ?? id;
    if (event.linkedEntityType === 'sublocation') return this.sublocations.find(s => s.instanceId === id)?.name ?? id;
    if (event.linkedEntityType === 'faction')     return this.factions.find(f => f.factionInstanceId === id)?.name ?? id;
    if (event.linkedEntityType === 'player')      return this.players.find(p => p.userId === id)?.displayName ?? id;
    return '';
  }

  onDragStart(index: number, event: DragEvent) {
    this.draggingIndex.set(index);
    event.dataTransfer!.effectAllowed = 'move';
  }

  // ── Touch drag (same pattern as TimeOfDayBarComponent) ──────────────────────

  onHandleTouchStart(index: number, event: TouchEvent) {
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
    const d   = this.destType()!;
    const eId = this.entityId();
    const linkedEntityId   = d === 'campaign' ? this.campaignId : (eId || null);
    const linkedEntityType = d;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/events`,
      { title: this.eventTitle().trim(), body: this.eventBody().trim(), linkedEntityId, linkedEntityType }
    ).subscribe({
      next: () => {
        this.eventTitle.set('');
        this.eventBody.set('');
        this.destType.set(null);
        this.entityId.set('');
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

    const payload: { title: string; body?: string; linkedEntityType: string; linkedEntityId?: string } = {
      title:            this.handoutTitle().trim(),
      linkedEntityType: this.handoutDestType()!,
    };
    const body     = this.handoutBody().trim();
    const entityId = this.handoutEntityId();
    if (body)     payload.body             = body;
    if (entityId) payload.linkedEntityId   = entityId;

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
    this.handoutDestType.set(null);
    this.handoutEntityId.set('');
    this.handoutUploading.set(false);
    this.handoutSuccess.set(true);
    setTimeout(() => this.handoutSuccess.set(false), 3000);
    this.loadEvents();
  }
}
