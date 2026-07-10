import { Component, Input, Output, EventEmitter, ElementRef, inject, computed, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CampaignFactionInstance } from '../../models/faction.model';
import { CampaignPlayer } from '../../models/campaign.model';
import { TimeOfDay, TimeOfDaySlice } from '../../models/time-of-day.model';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../campaign-dropdown/campaign-dropdown.component';
import { CampaignSecret } from '../../models/secret.model';

interface LinkedItem {
  entityType: string | null;
  entityId: string;
  entityName: string | null;
  todPositionPercent?: number | null;
  originalEntityType?: string; // Store original entity type for icon display when secret is selected
}

@Component({
  selector: 'app-note-destination-picker',
  standalone: true,
  imports: [CommonModule, CampaignDropdownComponent],
  templateUrl: './note-destination-picker.component.html',
  styleUrl: './note-destination-picker.component.scss',
})
export class NoteDestinationPickerComponent {
  private _destType = 'queue';
  destTypeSignal = signal('queue');

  @Input()
  get destType(): string {
    return this._destType;
  }
  set destType(value: string) {
    if (this._destType !== value) {
      this._destType = value;
      this.destTypeSignal.set(value);
      if (value === 'cast' || value === 'faction' || value === 'sublocation' || value === 'location' || value === 'player') {
        this.visibleToPlayersChange.emit(true);
      }
    }
  }

  private _entityId = '';
  entityIdSignal = signal('');

  @Input()
  get entityId(): string {
    return this._entityId;
  }
  set entityId(value: string) {
    if (this._entityId !== value) {
      this._entityId = value;
      this.entityIdSignal.set(value);
    }
  }
  @Input() showQueue = true;
  @Input() showPlayer = true;
  @Input() showNone = false;
  @Input() showTimeOfDay = false;
  @Input() tod: TimeOfDay | null = null;
  @Input() todPositionPercent: number | null = null;
  @Input() locations: CampaignLocationInstance[] = [];
  @Input() sublocations: CampaignSublocationInstance[] = [];
  @Input() casts: CampaignCastInstance[] = [];
  @Input() factions: CampaignFactionInstance[] = [];
  @Input() players: CampaignPlayer[] = [];
  @Input() campaignId = '';
  @Input() tabIndexBase = 2;
  @Input() multiselect = false;
  @Input() isPlayerComponent = false;
  linkedEntities = input<LinkedItem[]>([]);
  private _visibleToPlayers = false;

  @Input()
  get visibleToPlayers(): boolean {
    return this._visibleToPlayers;
  }
  set visibleToPlayers(value: boolean) {
    this._visibleToPlayers = value;
  }
  @Input() showCampaign = false;
  private _secrets: CampaignSecret[] = [];
  private secretsSignal = signal<CampaignSecret[]>([]);

  @Input()
  get secrets(): CampaignSecret[] {
    return this._secrets;
  }
  set secrets(value: CampaignSecret[]) {
    console.log('note-destination-picker: secrets input updated, count:', value.length);
    this._secrets = value;
    this.secretsSignal.set(value);
  }
  @Input() showSecretPicker: boolean | null = null;

  @Output() destTypeChange = new EventEmitter<string>();
  @Output() entityIdChange = new EventEmitter<string>();
  @Output() todPositionPercentChange = new EventEmitter<number | null>();
  @Output() enterOnDestType = new EventEmitter<string>();
  @Output() linkedEntitiesChange = new EventEmitter<LinkedItem[]>();
  @Output() visibleToPlayersChange = new EventEmitter<boolean>();
  @Output() selectedSecretChange = new EventEmitter<string>();

  selectedSecret = signal<string>('');

  private elRef = inject(ElementRef);

  get showEntitySelect(): boolean {
    return this.destTypeSignal() === 'location' || this.destTypeSignal() === 'sublocation'
      || this.destTypeSignal() === 'cast' || this.destTypeSignal() === 'faction'
      || this.destTypeSignal() === 'player' || this.destTypeSignal() === 'time-of-day';
  }

  get showPills(): boolean {
    return this.multiselect && this.linkedEntities().length > 0;
  }

  get isToggleDisabled(): boolean {
    return this.destTypeSignal() === 'cast' || this.destTypeSignal() === 'faction'
      || this.destTypeSignal() === 'sublocation' || this.destTypeSignal() === 'location'
      || this.destTypeSignal() === 'player' || this.destTypeSignal() === 'time-of-day';
  }

  get hasTimeTrigger(): boolean {
    return this.linkedEntities().some(item => item.entityType === 'time-of-day');
  }

  get hasCampaignTrigger(): boolean {
    return this.linkedEntities().some(item => item.entityType === 'campaign');
  }

  getVisibilityText(): string {
    // If "none" or "time-of-day", it's not visible to players
    if (this.destTypeSignal() === 'none' || this.destTypeSignal() === 'time-of-day') {
      return 'Not Visible To Players';
    }
    // All other entity types are visible to players
    return 'Visible To Players';
  }

  readonly locationOptions = computed<CampaignDropdownOption[]>(() => {
    const secrets = this.secretsSignal();
    return [
      { value: '', label: '— select location —' },
      ...this.locations.filter(l => {
        const isLinked = this.linkedEntities().some(le => le.entityType === 'location' && le.entityId === l.instanceId);
        return !isLinked;
      }).map(l => {
        const secretCount = secrets.filter(s => !s.isRevealed && s.locationInstanceId === l.instanceId).length;
        const label = secretCount > 0 ? `${l.name} | ${secretCount} Secrets` : l.name;
        return { value: l.instanceId, label };
      }),
    ];
});

  readonly sublocationOptions = computed<CampaignDropdownOption[]>(() => {
    const secrets = this.secretsSignal();
    return [
      { value: '', label: '— select sublocation —' },
      ...this.sublocations.filter(s => {
        const isLinked = this.linkedEntities().some(le => le.entityType === 'sublocation' && le.entityId === s.instanceId);
        return !isLinked;
      }).map(s => {
        const secretCount = secrets.filter(secret => !secret.isRevealed && secret.sublocationInstanceId === s.instanceId).length;
        const label = secretCount > 0 ? `${s.name} | ${secretCount} Secrets` : s.name;
        return { value: s.instanceId, label };
      }),
    ];
});

  readonly castOptions = computed<CampaignDropdownOption[]>(() => {
    const secrets = this.secretsSignal();
    return [
      { value: '', label: '— select cast member —' },
      ...this.casts.filter(c => {
        const isLinked = this.linkedEntities().some(le => le.entityType === 'cast' && le.entityId === c.instanceId);
        return !isLinked;
      }).map(c => {
        const secretCount = secrets.filter(s => !s.isRevealed && s.castInstanceId === c.instanceId).length;
        const label = secretCount > 0 ? `${c.name} | ${secretCount} Secrets` : c.name;
        return { value: c.instanceId, label };
      }),
    ];
});

  readonly factionOptions = computed<CampaignDropdownOption[]>(() => [
    { value: '', label: '— select faction —' },
    ...this.factions.filter(f => {
      const isVisibleToPlayers = this.isPlayerComponent ? true : !f.isVisibleToPlayers;
      const isLinked = this.linkedEntities().some(le => le.entityType === 'faction' && le.entityId === f.factionInstanceId);
      return isVisibleToPlayers && !isLinked;
    }).map(f => ({ value: f.factionInstanceId, label: f.name })),
  ]);

  readonly playerOptions = computed<CampaignDropdownOption[]>(() => [
    { value: '', label: '— select player —' },
    ...this.players.map(p => ({ value: p.userId, label: p.displayName })),
  ]);

readonly hasSecretsForType = computed(() => {
  const entityType = this.destTypeSignal();
  const secrets = this.secretsSignal();
  console.log('hasSecretsForType recomputed - entityType:', entityType, 'total secrets:', secrets.length);
  if (!entityType) return false;

  const result = secrets.some(secret => {
    if (secret.isRevealed) return false;

    switch (entityType) {
      case 'cast':
        return secret.castInstanceId !== null;
      case 'location':
        return secret.locationInstanceId !== null;
      case 'sublocation':
        console.log('hasSecretsForType sublocation check - secret.sublocationInstanceId:', secret.sublocationInstanceId);
        return secret.sublocationInstanceId !== null;
      case 'faction':
        return secret.castInstanceId === null &&
               secret.locationInstanceId === null &&
               secret.sublocationInstanceId === null;
      default:
        return false;
    }
  });
  console.log('hasSecretsForType result:', result);
  return result;
});

readonly secretOptions = computed<CampaignDropdownOption[]>(() => {
  const options: CampaignDropdownOption[] = [{ value: '', label: '— select a secret —' }];
  const entityType = this.destTypeSignal();
  const entityId = this.entityIdSignal();
  const secrets = this.secretsSignal();
  console.log('secretOptions computed - entityType:', entityType, 'entityId:', entityId, 'total secrets:', secrets.length);

  if (!entityId || !entityType) return options;

  const filteredSecrets = secrets.filter(secret => {
    if (secret.isRevealed) return false;

    let matches = false;
    switch (entityType) {
      case 'cast':
        matches = secret.castInstanceId === entityId;
        break;
      case 'location':
        matches = secret.locationInstanceId === entityId;
        break;
      case 'sublocation':
        matches = secret.sublocationInstanceId === entityId;
        console.log('Sublocation secret check - secret.sublocationInstanceId:', secret.sublocationInstanceId, 'entityId:', entityId, 'matches:', matches, 'secret:', secret);
        break;
      case 'faction':
        matches = secret.castInstanceId === null &&
               secret.locationInstanceId === null &&
               secret.sublocationInstanceId === null;
        break;
      default:
        matches = false;
    }
    return matches;
  });

  console.log('Filtered secrets count:', filteredSecrets.length);
  return [
    ...options,
    ...filteredSecrets.map(s => ({ value: s.id, label: `Secret: ${s.content.substring(0, 30)}${s.content.length > 30 ? '...' : ''}` }))
  ];
});

private countSecretsForLocation(locationId: string): number {
  console.log('countSecretsForLocation - locationId:', locationId, 'secrets:', this.secrets);
  return this.secrets.filter(s => !s.isRevealed && s.locationInstanceId === locationId).length;
}

private countSecretsForSublocation(sublocationId: string): number {
  console.log('countSecretsForSublocation - sublocationId:', sublocationId, 'total secrets:', this.secrets.length);
  const result = this.secrets.filter(s => {
    const isRevealed = s.isRevealed;
    const matchesId = s.sublocationInstanceId === sublocationId;
    console.log('  Secret - id:', s.id, 'isRevealed:', isRevealed, 'sublocationInstanceId:', s.sublocationInstanceId, 'matchesId:', matchesId, 'secret:', s);
    return !isRevealed && matchesId;
  }).length;
  console.log('countSecretsForSublocation result:', result);
  return result;
}

private countSecretsForCast(castId: string): number {
  return this.secrets.filter(s => !s.isRevealed && s.castInstanceId === castId).length;
}

private countSecretsForFaction(factionId: string): number {
  // Faction secrets are identified by having all three instance IDs as null
  // Note: CampaignSecret doesn't have factionId field, so we count all faction-type secrets
  // In practice, faction secrets are campaign-wide or handled differently
  return 0; // Placeholder - faction secret counting needs clarification on how to associate with specific factions
}

  onDestTypeChange(value: string): void {
    if (this.destTypeSignal() === 'time-of-day' && value !== 'time-of-day') {
      this.todPositionPercentChange.emit(null);
    }
    if (value === 'time-of-day') {
      this._visibleToPlayers = false;
      this.visibleToPlayersChange.emit(false);
    }
    if (value === 'none') {
      this._visibleToPlayers = false;
      this.visibleToPlayersChange.emit(false);
    }
    if (value === 'cast' || value === 'faction' || value === 'sublocation' || value === 'location' || value === 'player') {
      this._visibleToPlayers = true;
      this.visibleToPlayersChange.emit(true);
    }
    this._destType = value;
    this.destTypeSignal.set(value);
    this.destTypeChange.emit(value);
    this.entityIdChange.emit('');
  }

  onKeyEnter(type: string): void {
    this.onDestTypeChange(type);
    if (type === 'queue' || type === 'campaign' || type === 'none' || type === 'time-of-day') {
      this.enterOnDestType.emit(type);
    } else {
      setTimeout(() => {
        const trigger = this.elRef.nativeElement.querySelector('.campaign-dropdown-trigger') as HTMLElement | null;
        trigger?.focus();
      });
    }
  }

  onEntitySelect(entityId: string): void {
    if (!entityId) return;
    this.entityIdChange.emit(entityId);
  }

  addTrigger(): void {
    const entityId = this.entityId;
    const destType = this.destTypeSignal();
    const selectedSecret = this.selectedSecret();

    // If a secret is selected, only add the secret entity, not the regular entity
    if (selectedSecret) {
      const secret = this.secrets.find(s => s.id === selectedSecret);
      if (!secret) return;
      
      const secretContent = secret.content.substring(0, 30) + (secret.content.length > 30 ? '...' : '');
      const entityName = `Secret: (${destType}) ${secretContent}`;
      
      const newItem: LinkedItem = {
        entityType: 'secret',
        entityId: selectedSecret,
        entityName
      };

      this.linkedEntitiesChange.emit([...this.linkedEntities(), newItem]);
      this.entityIdChange.emit('');
      this.selectedSecret.set('');
      this.onDestTypeChange('queue');
      return;
    }

    // Regular entity addition (no secret selected)
    let entityName = '';
    let finalEntityId = entityId;
    let todPositionPercent: number | null = null;
    let finalEntityType = destType;

    switch (destType) {
      case 'location':
        if (!entityId) return;
        entityName = this.locations.find(l => l.instanceId === entityId)?.name ?? '';
        break;
      case 'sublocation':
        if (!entityId) return;
        entityName = this.sublocations.find(s => s.instanceId === entityId)?.name ?? '';
        break;
      case 'cast':
        if (!entityId) return;
        entityName = this.casts.find(c => c.instanceId === entityId)?.name ?? '';
        break;
      case 'faction':
        if (!entityId) return;
        entityName = this.factions.find(f => f.factionInstanceId === entityId)?.name ?? '';
        break;
      case 'player':
        if (!entityId) return;
        entityName = this.players.find(p => p.userId === entityId)?.displayName ?? '';
        break;
      case 'campaign':
        entityName = 'Campaign';
        finalEntityId = this.campaignId;
        break;
      case 'time-of-day':
        finalEntityId = this.campaignId;
        todPositionPercent = this.todPositionPercent;
        if (todPositionPercent !== null && this.tod) {
          const slice = this.tod.slices.find(s => todPositionPercent! >= s.startPercent && todPositionPercent! < s.endPercent);
          entityName = slice?.label ?? 'Time of Day';
        } else {
          entityName = 'Time of Day';
        }
        break;
      default:
        return;
    }

    const newItem: LinkedItem = {
      entityType: finalEntityType,
      entityId: finalEntityId,
      entityName,
      todPositionPercent
    };

    this.linkedEntitiesChange.emit([...this.linkedEntities(), newItem]);
    this.entityIdChange.emit('');
    this.selectedSecret.set('');

    // Reset destType to queue after adding trigger so selection is cleared for next scene/handout
    this.onDestTypeChange('queue');
  }

  removeLinkedItem(index: number): void {
    const updated = [...this.linkedEntities()];
    updated.splice(index, 1);
    this.linkedEntitiesChange.emit(updated);
  }

  sliceMiniStyle(slice: TimeOfDaySlice, index: number): Record<string, string> {
    const slices = this.tod?.slices ?? [];
    const widthPct = slice.endPercent - slice.startPercent;
    const nextColor = slices[(index + 1) % slices.length]?.color ?? slice.color;
    const isLast = index === slices.length - 1;
    const gradient = isLast
      ? `linear-gradient(to right, ${slice.color}, ${slice.color} calc(100% - 12px), ${nextColor} 100%)`
      : `linear-gradient(to right, ${slice.color}, ${nextColor})`;
    return {
      'flex-basis': `${widthPct}%`,
      'background-image': gradient,
    };
  }

  onMiniBarClick(event: MouseEvent): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    this.todPositionPercentChange.emit(pct);
  }

  onMiniBarClear(): void {
    this.todPositionPercentChange.emit(null);
  }

  onVisibleToPlayersToggle(): void {
    this.visibleToPlayersChange.emit(!this.visibleToPlayers);
  }
}
