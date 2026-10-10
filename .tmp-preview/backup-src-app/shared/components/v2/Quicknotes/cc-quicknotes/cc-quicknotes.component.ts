import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { CampaignShellService } from '../../../../../core/campaign-shell.service';
import { CampaignGridLoadService } from '../../../../../core/campaign-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/grid-area-mark.service';
import { buildQuicknoteChronicleRequest } from '../../../../../core/quicknote-chronicle.mapper';
import { CardLink, CardLinkWriter } from '../../../../models/card-link.model';
import { QuicknoteQueueItem } from '../../../../models/quicknote-queue.model';
import { CcToggleSwitchComponent } from '../../Shared/cc-toggle-switch/cc-toggle-switch.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';
import { CcCardLinkerComponent } from '../../Shared/cc-card-linker/cc-card-linker.component';

const NOTICE_MS = 3000;

@Component({
  selector: 'cc-quicknotes',
  standalone: true,
  imports: [CommonModule, CcToggleSwitchComponent, CcDeleteButtonComponent, CcEditButtonComponent, CcCardLinkerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-quicknotes.component.html',
  styleUrl: './cc-quicknotes.component.scss'
})
export class CcQuicknotesComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private gridLoad = inject(CampaignGridLoadService);
  shellSvc = inject(CampaignShellService);

  private readonly mark = publishGridAreaMark('top-left', 'content', {
    title: () => ['Quicknotes'],
    icon: { path: '/old_paper_document_feather_pen.svg', width: 44, height: 44 },
  });

  readonly campaignId = input.required<string>();

  readonly portalColor = input<string>('#6e28d0');

  noteArea = viewChild<ElementRef<HTMLTextAreaElement>>('noteArea');

  items = signal<QuicknoteQueueItem[]>([]);
  loading = signal(true);
  draft = signal('');
  saving = signal(false);
  error = signal('');
  notice = signal('');

  editingId = signal<string | null>(null);
  editDraft = signal('');

  workingId = signal<string | null>(null);

  sendingId = signal<string | null>(null);

  readonly isDm = this.shellSvc.isDm;

  readonly count = computed(() => this.items().length);

  private subscriptions: Subscription[] = [];
  private loadedOnce = false;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.campaignId();
      if (!id || this.loadedOnce) return;
      this.loadedOnce = true;
      this.loadQueue(id);
    });
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.hub.on('QuickNoteQueued', 'cc-quicknotes', event => {
        if (event?.campaignId !== this.campaignId()) return;
        this.loadQueue(this.campaignId(), true);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  busy(item: QuicknoteQueueItem): boolean {
    return this.workingId() === item.id || this.sendingId() === item.id;
  }

  isShared(item: QuicknoteQueueItem): boolean {
    return this.isDm() ? item.visibleToPlayers : true;
  }

  addNote(): void {
    const content = this.draft().trim();
    const campaignId = this.campaignId();
    if (!content || !campaignId || this.saving()) return;

    this.saving.set(true);
    this.error.set('');

    this.http.post<QuicknoteQueueItem>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/quicknote-queue`,
      { content, linkedEntities: [], visibleToPlayers: true }
    ).subscribe({
      next: saved => {
        this.saving.set(false);
        this.items.update(list => [this.asQueueItem(saved), ...list]);
        this.draft.set('');
        this.noteArea()?.nativeElement.focus();
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not add that note.');
      },
    });
  }

  startEdit(item: QuicknoteQueueItem): void {
    this.editingId.set(item.id);
    this.editDraft.set(item.content);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  saveEdit(item: QuicknoteQueueItem): void {
    const content = this.editDraft().trim();
    if (!content || this.busy(item)) return;

    this.workingId.set(item.id);
    this.error.set('');

    this.http.put<QuicknoteQueueItem>(
      this.queueUrl(item.id),
      { content, linkedEntities: item.linkedEntities, visibleToPlayers: item.visibleToPlayers }
    ).subscribe({
      next: saved => {
        this.replace(saved);
        this.workingId.set(null);
        this.cancelEdit();
      },
      error: () => {
        this.workingId.set(null);
        this.error.set('Could not save that note.');
      },
    });
  }

  onVisibilityChange(item: QuicknoteQueueItem, visibleToPlayers: boolean): void {
    if (!this.isDm() || this.busy(item)) return;

    const previous = item.visibleToPlayers;
    this.replace({ ...item, visibleToPlayers });
    this.workingId.set(item.id);
    this.error.set('');

    this.http.put<QuicknoteQueueItem>(
      this.queueUrl(item.id),
      { content: item.content, linkedEntities: item.linkedEntities, visibleToPlayers }
    ).subscribe({
      next: saved => {
        this.replace(saved);
        this.workingId.set(null);
      },
      error: () => {
        this.replace({ ...item, visibleToPlayers: previous });
        this.workingId.set(null);
        this.error.set('Could not change who that note reaches.');
      },
    });
  }

  deleteNote(item: QuicknoteQueueItem): void {
    if (this.busy(item)) return;

    this.workingId.set(item.id);
    this.error.set('');

    this.http.delete(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/quicknote-queue/${item.id}`
    ).subscribe({
      next: () => {
        this.items.update(list => list.filter(current => current.id !== item.id));
        this.workingId.set(null);
        if (this.editingId() === item.id) this.cancelEdit();
      },
      error: () => {
        this.workingId.set(null);
        this.error.set('Could not delete that note.');
      },
    });
  }

  readonly saveLinkedCards: CardLinkWriter = (cards, subject) => {
    const item = this.items().find(current => current.id === subject.subjectId);
    if (!item) return throwError(() => new Error('That note is no longer waiting.'));

    return this.http.put<QuicknoteQueueItem>(this.queueUrl(item.id), {
      content: item.content,
      linkedEntities: cards,
      visibleToPlayers: item.visibleToPlayers,
    }).pipe(map(saved => saved.linkedEntities ?? cards));
  };

  onLinkedCardsChange(itemId: string, cards: CardLink[]): void {
    this.items.update(list => list.map(current =>
      current.id === itemId ? { ...current, linkedEntities: cards } : current));
  }

  sendToChronicle(item: QuicknoteQueueItem): void {
    if (this.busy(item)) return;

    this.sendingId.set(item.id);
    this.error.set('');

    this.http.post(
      `${environment.apiUrl}/api/campaigns/${this.campaignId()}/chronicles`,
      buildQuicknoteChronicleRequest(item, this.isDm())
    ).subscribe({
      next: () => {
        this.sendingId.set(null);
        this.items.update(list => list.filter(current => current.id !== item.id));
        if (this.editingId() === item.id) this.cancelEdit();
        this.showNotice('Sent to the chronicles.');
      },
      error: () => {
        this.sendingId.set(null);
        this.error.set('Could not send that note to the chronicles.');
      },
    });
  }

  private showNotice(message: string): void {
    this.notice.set(message);
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.set(''), NOTICE_MS);
  }

  private loadQueue(campaignId: string, silent = false): void {
    if (!campaignId) return;
    if (!silent) this.loading.set(true);

    this.http.get<QuicknoteQueueItem[]>(
      `${environment.apiUrl}/api/campaigns/${campaignId}/quicknote-queue`
    ).pipe(catchError(() => of([] as QuicknoteQueueItem[])))
      .subscribe(items => {
        this.items.set((items ?? []).map(item => this.asQueueItem(item)));
        this.loading.set(false);
        this.gridLoad.report('top-left', 'content');
      });
  }

  private replace(item: QuicknoteQueueItem): void {
    this.items.update(list => list.map(current => current.id === item.id ? this.asQueueItem(item) : current));
  }

  private asQueueItem(item: QuicknoteQueueItem): QuicknoteQueueItem {
    return {
      ...item,
      content: item.content ?? '',
      linkedEntities: item.linkedEntities ?? [],
      visibleToPlayers: item.visibleToPlayers ?? true,
    };
  }

  private queueUrl(itemId: string): string {
    return `${environment.apiUrl}/api/campaigns/${this.campaignId()}/quicknote-queue/${itemId}`;
  }
}
