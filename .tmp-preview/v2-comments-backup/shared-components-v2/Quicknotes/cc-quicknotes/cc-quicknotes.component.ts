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
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../../../environments/environment';
import { CampaignHubService } from '../../../../../core/hub/campaign-hub.service';
import { V2CampaignShellService } from '../../../../../core/v2-campaign-shell.service';
import { V2GridLoadService } from '../../../../../core/v2-grid-load.service';
import { publishGridAreaMark } from '../../../../../core/v2-grid-area-mark.service';
import { buildQuicknoteChronicleRequest } from '../../../../../core/quicknote-chronicle.mapper';
import { QuicknoteQueueItem } from '../../../../models/quicknote-queue.model';
import { CcToggleSwitchComponent } from '../../Shared/cc-toggle-switch/cc-toggle-switch.component';
import { CcDeleteButtonComponent } from '../../Shared/cc-delete-button/cc-delete-button.component';
import { CcEditButtonComponent } from '../../Shared/cc-edit-button/cc-edit-button.component';

/** How long the area's word on a note just sent stays up, in ms. */
const NOTICE_MS = 3000;

/**
 * cc-quicknotes
 *
 * The top-left area of the campaign grid: the quicknotes a viewer keeps for themselves, and the
 * queue of what is still waiting to be linked up and sent to the campaign chronicles.
 *
 * A note is written in the box at the top and lands in the queue below it — the viewer's own queue,
 * their own line, read and written per user (see QuicknoteQueueController). From its line in the
 * queue a note is linked to the campaign's cards (see `cc-note-association-picker`, raised in the
 * shell's right drawer) and then sent to the chronicles: it goes as a player-note entry carrying its
 * cards as the entry's participants, and leaves the queue, which is what is still waiting.
 *
 * The area answers to both roles. A DM's own notes are their own to read and share — the switch on
 * a line says whether the note reaches the chronicles in the open or as a GM-only entry — while a
 * player's note always arrives in the open, which is as much as the chronicles' own API allows them
 * (see CampaignChroniclesController.AddToChronicle).
 *
 * Nothing here keeps the old quicknotes bar's session rule: a chronicle entry belongs to a date of
 * its own, so notes may be written whether or not a session is running.
 */
@Component({
  selector: 'cc-quicknotes',
  standalone: true,
  imports: [CommonModule, CcToggleSwitchComponent, CcDeleteButtonComponent, CcEditButtonComponent],
  /**
   * OnPush: the queue and what is drawn from it are signals, so the panel is redrawn when one of
   * them moves — a note queued on another screen, say (see `quickNoteQueued`) — and not on every
   * check the page takes.
   */
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-quicknotes.component.html',
  styleUrl: './cc-quicknotes.component.scss'
})
export class CcQuicknotesComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private hub = inject(CampaignHubService);
  private gridLoad = inject(V2GridLoadService);
  shellSvc = inject(V2CampaignShellService);

  /**
   * What the top-left area is known by — the heading written over it, and the mark it wears on the
   * radial navigator — published for as long as this panel stands in the area, so the board needs no
   * list of its own to keep in step with who is standing where (see V2GridAreaMarkService).
   */
  private readonly mark = publishGridAreaMark('top-left', 'content', {
    title: () => ['Quicknotes'],
    icon: { path: '/old_paper_document_feather_pen.svg', width: 44, height: 44 },
  });

  /** The campaign whose queue this is. */
  readonly campaignId = input.required<string>();

  /** The campaign's own colour, for the bits of the area that wear it. */
  readonly portalColor = input<string>('#6e28d0');

  /** The box the note is written in, so it can be put back under the writer's hands. */
  noteArea = viewChild<ElementRef<HTMLTextAreaElement>>('noteArea');

  /** What is still waiting: newest first, as the queue reads it. */
  items = signal<QuicknoteQueueItem[]>([]);
  loading = signal(true);
  draft = signal('');
  saving = signal(false);
  error = signal('');
  notice = signal('');

  /** The note being edited in place, and the words it is being given. */
  editingId = signal<string | null>(null);
  editDraft = signal('');

  /** The note a write is in the air for, whichever write it is (edit, delete, visibility). */
  workingId = signal<string | null>(null);

  /** The note on its way to the chronicles. */
  sendingId = signal<string | null>(null);

  /** Whether the viewer is the campaign's own DM: it is their notes the visibility switch is for. */
  readonly isDm = computed(() => this.shellSvc.isDm());

  readonly count = computed(() => this.items().length);

  private subscriptions: Subscription[] = [];
  private loadedOnce = false;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The queue is this viewer's own, so the area reads it as the campaign lands.
    effect(() => {
      const id = this.campaignId();
      if (!id || this.loadedOnce) return;
      this.loadedOnce = true;
      this.loadQueue(id);
    });
  }

  ngOnInit(): void {
    // A note queued anywhere — the v1 bar, another screen of this viewer's own — is this area's
    // business too, so the queue is re-read on every word of it.
    this.subscriptions.push(
      this.hub.quickNoteQueued$.subscribe(event => {
        if (event?.campaignId !== this.campaignId()) return;
        this.loadQueue(this.campaignId(), true);
      }),

      // A link picked in the association drawer is written as it is picked, so the line behind the
      // drawer wears the hashtag straight away.
      this.shellSvc.quicknotesChanged.subscribe(campaignId => {
        if (campaignId !== this.campaignId()) return;
        this.loadQueue(campaignId, true);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
  }

  /** The note's own line is busy: its buttons stand down while a write is in the air. */
  busy(item: QuicknoteQueueItem): boolean {
    return this.workingId() === item.id || this.sendingId() === item.id;
  }

  /** Whether the note will reach the chronicles in the open. A player's always does. */
  isShared(item: QuicknoteQueueItem): boolean {
    return this.isDm() ? item.visibleToPlayers : true;
  }

  /**
   * The note in the box goes into the queue: nothing is linked to it yet, and it is in the open to
   * begin with — both of which its own line can change before it is sent on.
   */
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

  /** The line is opened for editing: its words are put in a box of their own. */
  startEdit(item: QuicknoteQueueItem): void {
    this.editingId.set(item.id);
    this.editDraft.set(item.content);
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.editDraft.set('');
  }

  /** The words the line was given are written: its links and its visibility ride along unchanged. */
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

  /**
   * The note is to reach the chronicles in the open, or as a GM-only entry. The switch is the DM's
   * alone — a player's note always arrives in the open, which is all the chronicles' own API allows
   * them (see CampaignChroniclesController.AddToChronicle) — and the line takes the new setting at
   * once, with the queue written behind it and the switch put back if the write does not land.
   */
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

  /** The note is taken out of the queue, and nothing else: nothing has been sent on yet. */
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

  /**
   * The line's own link button: the shell's right drawer is asked to open on the note, where the
   * campaign's cards are picked and hung off it as hashtags as they are picked (see
   * `cc-note-association-picker`).
   */
  openAssociations(item: QuicknoteQueueItem): void {
    this.shellSvc.openQuicknoteAssociationsDrawer({
      campaignId: this.campaignId(),
      itemId: item.id,
      content: item.content,
      visibleToPlayers: item.visibleToPlayers,
      linkedEntities: item.linkedEntities,
    });
  }

  /**
   * The note goes to the campaign chronicles through the same door the storyline's own items use
   * (see CampaignChroniclesController.AddToChronicle, content type player-note): its words stand as
   * the entry, its linked cards ride as the entry's participants, and the line's switch says whether
   * it lands in the open or as a GM-only entry.
   *
   * It leaves the queue as it lands — the queue is what is still waiting — while the chronicles keep
   * the copy.
   */
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

  /** A word on what has just happened, up for a few seconds. */
  private showNotice(message: string): void {
    this.notice.set(message);
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => this.notice.set(''), NOTICE_MS);
  }

  /**
   * Reads this viewer's own queue. The curtain over the grid waits on this area's first read as much
   * as on any other panel's (see V2GridLoadService), so the read reports itself done whether it
   * landed or failed: a queue that could not be read must not hold the whole page behind the curtain.
   */
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

  /**
   * A note comes back from a write: its own line is replaced, and only its own.
   */
  private replace(item: QuicknoteQueueItem): void {
    this.items.update(list => list.map(current => current.id === item.id ? this.asQueueItem(item) : current));
  }

  /**
   * A queue row as the area draws it.
   *
   * Every line here is drawn from the note's links and its visibility — one for its hashtags, the
   * other for its switch — so a row that arrives without them is given their own defaults rather
   * than left undefined: a server that predates those two columns (or a row written by one) would
   * otherwise hand the template something it cannot read.
   */
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
