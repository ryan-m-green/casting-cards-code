import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges,
  signal, computed, inject, ViewChild, ElementRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';
import { CampaignHubService } from '../../../core/hub/campaign-hub.service';
import { SessionContextService } from '../../../core/session-context.service';

const ALIGNMENTS: string[][] = [
  ['Lawful Good',    'Neutral Good',  'Chaotic Good'   ],
  ['Lawful Neutral', 'True Neutral',  'Chaotic Neutral'],
  ['Lawful Evil',    'Neutral Evil',  'Chaotic Evil'   ],
];

const PERCEPTION_LABELS: Record<number, string> = {
  [-5]: 'Hateful',
  [-4]: 'Hostile',
  [-3]: 'Suspicious',
  [-2]: 'Wary',
  [-1]: 'Guarded',
  0:    'Indifferent',
  1:    'Cordial',
  2:    'Warm',
  3:    'Trusting',
  4:    'Friendly',
  5:    'Devoted',
};

interface LocationGroup {
  locationId: string;
  locationName: string;
  casts: CampaignCastInstance[];
}

@Component({
  selector: 'app-player-cast-notes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './player-cast-notes.component.html',
  styleUrl: './player-cast-notes.component.scss',
})
export class PlayerCastNotesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() campaignId!: string;
  @Input() castInstance!: CampaignCastInstance;
  @Input() allCasts: CampaignCastInstance[] = [];
  @Input() allLocations: CampaignLocationInstance[] = [];
  @Input() castSecrets: CampaignSecret[] = [];

  private allCasts$    = signal<CampaignCastInstance[]>([]);
  private allLocations$ = signal<CampaignLocationInstance[]>([]);
  private hubSubscriptions: Subscription[] = [];

  private http = inject(HttpClient);
  private sessionContext = inject(SessionContextService);

  isSessionActive = signal(false);
  private hub      = inject(CampaignHubService);

  @ViewChild('wantTextarea') private wantRef?: ElementRef<HTMLTextAreaElement>;

  readonly alignments = ALIGNMENTS;

  notes = signal<CampaignCastPlayerNotes>({
    id: '',
    campaignId: '',
    castInstanceId: '',
    notes: '',
    connections: [],
    alignment: '',
    perception: 0,
    rating: 0,
    updatedAt: '',
  });

  // Local string for the want textarea — never bound to the signal during typing
  wantText = '';

  saving       = signal(false);
  dropdownOpen = signal(false);
  private saveDebounce: ReturnType<typeof setTimeout> | null = null;
  private outsideClickHandler = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('.notes-dropdown')) {
      this.dropdownOpen.set(false);
    }
  };

  connectedCasts = computed(() =>
    this.allCasts$().filter(c => this.notes().connections.includes(c.instanceId))
  );

  locationsWithCasts = computed((): LocationGroup[] => {
    const connected = new Set(this.notes().connections);
    const available = this.allCasts$().filter(
      c => c.instanceId !== this.castInstance?.instanceId && !connected.has(c.instanceId)
    );

    const currentLocationId = this.castInstance?.locationInstanceId ?? null;
    const locationOrder: string[] = [];
    const byLocation = new Map<string, CampaignCastInstance[]>();

    for (const cast of available) {
      const locationId = cast.locationInstanceId ?? 'none';
      if (!byLocation.has(locationId)) {
        byLocation.set(locationId, []);
        locationOrder.push(locationId);
      }
      byLocation.get(locationId)!.push(cast);
    }

    locationOrder.sort((a, b) => {
      if (a === currentLocationId) return -1;
      if (b === currentLocationId) return 1;
      return 0;
    });

    return locationOrder.map(locationId => ({
      locationId,
      locationName: locationId === 'none'
        ? 'Unknown'
        : (this.allLocations$().find(c => c.instanceId === locationId)?.name ?? 'Unknown'),
      casts: byLocation.get(locationId) ?? [],
    }));
  });

  perceptionLabel = computed(() => PERCEPTION_LABELS[this.notes().perception] ?? 'Indifferent');

  ngOnInit() {
    this.load();
    document.addEventListener('click', this.outsideClickHandler);

    this.hubSubscriptions.push(
      this.hub.noteUpdated$.subscribe(e => {
        if (e?.entityType === 'cast' && e.instanceId === this.castInstance?.instanceId) {
          this.load();
        }
      })
    );

    // Subscribe to session context
    this.hubSubscriptions.push(
      this.sessionContext.getActiveSession(this.campaignId).subscribe(session => {
        this.isSessionActive.set(session !== null);
      })
    );

    // Subscribe to session started event to reload notes and update active state
    this.hubSubscriptions.push(
      this.hub.sessionStarted$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(true);
          this.load();
        }
      })
    );

    // Subscribe to session ended event to update active state and reload notes
    this.hubSubscriptions.push(
      this.hub.sessionEnded$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(false);
          // Add delay to allow backend to complete note deletion
          setTimeout(() => this.load(), 500);
        }
      })
    );

    // Subscribe to session cancelled event to update active state and reload notes
    this.hubSubscriptions.push(
      this.hub.sessionCancelled$.subscribe(event => {
        if (event) {
          this.isSessionActive.set(false);
          // Add delay to allow backend to complete note deletion
          setTimeout(() => this.load(), 500);
        }
      })
    );
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.outsideClickHandler);
    this.hubSubscriptions.forEach(sub => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['allCasts'])    this.allCasts$.set(this.allCasts);
    if (changes['allLocations']) this.allLocations$.set(this.allLocations);
    if (changes['castInstance'] && !changes['castInstance'].firstChange) {
      this.load();
    }
  }

  private load() {
    const defaultNotes: CampaignCastPlayerNotes = {
      id: '', campaignId: this.campaignId, castInstanceId: this.castInstance.instanceId,
      notes: '', connections: [], alignment: '', perception: 0, rating: 0, updatedAt: '',
    };
    this.http.get<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/cast-player-notes/${this.castInstance.instanceId}`
    ).pipe(
      catchError(() => of(defaultNotes))
    ).subscribe(n => {
      this.notes.set(n);
      this.wantText = n.notes;
      setTimeout(() => {
        if (this.wantRef) this.wantRef.nativeElement.value = n.notes;
      }, 0);
    });
  }

  private save() {
    this.saving.set(true);
    const saveStartTime = Date.now();
    const n = this.notes();
    
    this.http.put<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/cast-player-notes/${this.castInstance.instanceId}`,
      {
        notes:       this.wantText,
        connections: n.connections,
        alignment:   n.alignment,
        perception:  n.perception,
        rating:      n.rating,
      }
    ).subscribe(updated => {
      this.notes.set(updated);
      
      // Ensure saving label shows for at least 1 second
      const elapsed = Date.now() - saveStartTime;
      const remainingTime = Math.max(0, 1000 - elapsed);
      
      setTimeout(() => {
        this.saving.set(false);
      }, remainingTime);
    });
  }

  onWantInput(value: string) {
    this.wantText = value;
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => this.save(), 800);
  }

  toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    this.dropdownOpen.update(v => !v);
  }

  onConnectionSelect(castInstanceId: string) {
    if (!castInstanceId) return;
    this.notes.update(n => ({ ...n, connections: [...n.connections, castInstanceId] }));
    this.dropdownOpen.set(false);
    this.save();
  }

  removeConnection(castInstanceId: string) {
    this.notes.update(n => ({
      ...n, connections: n.connections.filter(id => id !== castInstanceId),
    }));
    this.save();
  }

  onAlignmentSelect(alignment: string) {
    this.notes.update(n => ({ ...n, alignment }));
    this.save();
  }

  onPerceptionInput(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.notes.update(n => ({ ...n, perception: value }));
  }

  onPerceptionRelease(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    this.notes.update(n => ({ ...n, perception: value }));
    this.save();
  }

  syncRating(rating: number) {
    this.notes.update(n => ({ ...n, rating }));
  }

  sliderClass(v: number): string {
    if (v > 0) return 'slider-friendly';
    if (v < 0) return 'slider-hostile';
    return '';
  }
}
