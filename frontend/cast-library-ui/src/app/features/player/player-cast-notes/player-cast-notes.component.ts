import {
  Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges,
  signal, computed, inject, ViewChild, ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CampaignCastInstance } from '../../../shared/models/cast.model';
import { CampaignLocationInstance } from '../../../shared/models/location.model';
import { CampaignSecret } from '../../../shared/models/secret.model';
import { CampaignCastPlayerNotes } from '../../../shared/models/campaign.model';

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

  private http = inject(HttpClient);

  @ViewChild('wantTextarea') private wantRef?: ElementRef<HTMLTextAreaElement>;

  readonly alignments = ALIGNMENTS;

  notes = signal<CampaignCastPlayerNotes>({
    id: '',
    campaignId: '',
    castInstanceId: '',
    want: '',
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
    this.allCasts.filter(c => this.notes().connections.includes(c.instanceId))
  );

  locationsWithCasts = computed((): LocationGroup[] => {
    const connected = new Set(this.notes().connections);
    const available = this.allCasts.filter(
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
        : (this.allLocations.find(c => c.instanceId === locationId)?.name ?? 'Unknown'),
      casts: byLocation.get(locationId) ?? [],
    }));
  });

  perceptionLabel = computed(() => PERCEPTION_LABELS[this.notes().perception] ?? 'Indifferent');

  ngOnInit() {
    this.load();
    document.addEventListener('click', this.outsideClickHandler);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.outsideClickHandler);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['castInstance'] && !changes['castInstance'].firstChange) {
      this.load();
    }
  }

  private load() {
    this.http.get<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/cast-player-notes/${this.castInstance.instanceId}`
    ).subscribe(n => {
      this.notes.set(n);
      this.wantText = n.want;
      setTimeout(() => {
        if (this.wantRef) this.wantRef.nativeElement.value = n.want;
      }, 0);
    });
  }

  private save() {
    this.saving.set(true);
    const n = this.notes();
    this.http.put<CampaignCastPlayerNotes>(
      `${environment.apiUrl}/api/campaigns/${this.campaignId}/cast-player-notes/${this.castInstance.instanceId}`,
      {
        want:        this.wantText,
        connections: n.connections,
        alignment:   n.alignment,
        perception:  n.perception,
        rating:      n.rating,
      }
    ).subscribe(updated => {
      this.notes.set(updated);
      this.saving.set(false);
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
