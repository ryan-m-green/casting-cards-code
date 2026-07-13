import {
  Component, Input, Output, EventEmitter, signal, inject, OnInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SessionContextService } from '../../../core/session-context.service';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';

@Component({
  selector: 'app-player-faction-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-faction-notes.component.html',
  styleUrl: './player-faction-notes.component.scss',
})
export class PlayerFactionNotesComponent implements OnInit, OnDestroy {
  @Input() campaignId!: string;
  @Input() set notesText(value: string) {
    this._notesText = value;
  }
  get notesText(): string { return this._notesText; }
  private _notesText = '';

  @Input() saving = false;

  @Output() notesChange = new EventEmitter<string>();

  private hub = inject(CampaignHubService);
  private sessionContext = inject(SessionContextService);
  isSessionActive = signal(false);
  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.sessionContext.getActiveSession(this.campaignId).subscribe(session => {
        this.isSessionActive.set(session !== null);
      })
    );

    // Subscribe to session started event to update active state
    this.subscriptions.push(
      this.hub.sessionStarted$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(true);
        }
      })
    );

    // Subscribe to session ended event to update active state
    this.subscriptions.push(
      this.hub.sessionEnded$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(false);
        }
      })
    );

    // Subscribe to session cancelled event to update active state
    this.subscriptions.push(
      this.hub.sessionCancelled$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(false);
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onNotesInput(value: string) {
    if (!this.isSessionActive()) return;
    this._notesText = value;
    this.notesChange.emit(value);
  }
}
