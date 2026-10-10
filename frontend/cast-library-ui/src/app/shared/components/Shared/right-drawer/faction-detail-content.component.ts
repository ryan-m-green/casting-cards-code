import { Component, OnInit, OnDestroy, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CampaignShellService } from '../../../../core/campaign-shell.service';
import { CampaignFactionInstance, FactionColors, FactionRelationship } from '../../../models/faction.model';
import { CcDetailPanelActionsComponent } from '../cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcTextboxComponent } from '../cc-textbox/cc-textbox.component';
import { CcFactionColorsComponent } from '../cc-faction-colors/cc-faction-colors.component';
import { CcPoliticalInfluenceComponent } from '../cc-political-influence/cc-political-influence.component';
import { CcSecretsManagerComponent } from '../cc-secrets-manager/cc-secrets-manager.component';
import { ToggleSwitchComponent } from '../toggle-switch/toggle-switch.component';
import { CcFactionAssociationsComponent, SaveRelationshipEvent } from '../cc-faction-associations/cc-faction-associations.component';

type DetailTab = 'details' | 'secrets';

@Component({
  selector: 'app-faction-detail-content',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CcDetailPanelActionsComponent,
    CcTextboxComponent,
    CcFactionColorsComponent,
    CcPoliticalInfluenceComponent,
    CcSecretsManagerComponent,
    ToggleSwitchComponent,
    CcFactionAssociationsComponent
  ],
  templateUrl: './faction-detail-content.component.html',
  styleUrl: './faction-detail-content.component.scss'
})
export class FactionDetailContentComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private shellSvc = inject(CampaignShellService);

  faction = input.required<CampaignFactionInstance>();
  campaignId = input<string>('');
  isDm = input<boolean>(true);
  closeDrawer = output<void>();

  factionState = signal<CampaignFactionInstance | null>(null);
  currentFaction = computed(() => this.factionState() ?? this.faction());

  get factionInstanceId(): string {
    return this.currentFaction().factionInstanceId ?? '';
  }

  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  editing = signal<boolean>(false);

  editName        = signal('');
  editType        = signal('');
  editDescription = signal('');
  editDmNotes     = signal('');

  goodColor  = signal('#ff99bb');
  evilColor  = signal('#004d1a');
  perception = signal(0);
  influence  = signal(0);
  hidden     = signal(false);

  otherFactions = computed<CampaignFactionInstance[]>(
    () => this.shellSvc.campaign()?.factions ?? []);

  factionRelationships = computed<FactionRelationship[]>(
    () => this.currentFaction().factionRelationships ?? []);

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  private static readonly SAVE_DELAY_MS = 600;

  readonly alignment = computed(() => {
    const p = this.perception();
    if (p > 0) return 'Friendly Faction';
    if (p < 0) return 'Hostile Faction';
    return 'Unknown Alignment';
  });

  ngOnInit(): void {
    this.syncFromFaction();
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  onPerception(value: number): void {
    this.perception.set(value);
    this.scheduleWrite();
  }

  onInfluence(value: number): void {
    this.influence.set(value);
    this.scheduleWrite();
  }

  onHidden(value: boolean): void {
    this.hidden.set(value);
    this.scheduleWrite();
  }

  private scheduleWrite(): void {
    if (!this.isDm() || this.editing()) return;

    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(
      () => this.writeChange(), FactionDetailContentComponent.SAVE_DELAY_MS);
  }

  private writeChange(): void {
    this.fillEditFields();
    this.saveDetails();
  }

  private fillEditFields(): void {
    const f = this.currentFaction();
    this.editName.set(f.name ?? '');
    this.editType.set(f.type ?? '');
    this.editDescription.set(f.description ?? '');
    this.editDmNotes.set(f.dmNotes ?? '');
  }

  private normalizedGoodColor(f: CampaignFactionInstance): string {
    const c = f.colors?.goodColor;
    return (c && c !== '#000000') ? c : '#ff99bb';
  }

  private normalizedEvilColor(f: CampaignFactionInstance): string {
    const c = f.colors?.evilColor;
    return (c && c !== '#000000') ? c : '#004d1a';
  }

  private syncFromFaction(): void {
    const f = this.currentFaction();
    this.goodColor.set(this.normalizedGoodColor(f));
    this.evilColor.set(this.normalizedEvilColor(f));
    this.perception.set(f.perception ?? 0);
    this.influence.set(f.influence ?? 0);
    this.hidden.set(f.hidden ?? false);
  }

  startEditing() {
    if (!this.isDm()) return;
    this.fillEditFields();
    this.syncFromFaction();
    this.editing.set(true);
  }

  cancelEditing() {
    this.syncFromFaction();
    this.editing.set(false);
  }

  saveDetails(syncLibrary = false) {
    if (!this.isDm()) return;
    const campaignId = this.campaignId();
    const factionInstanceId = this.factionInstanceId;
    if (!campaignId || !factionInstanceId) {
      this.editing.set(false);
      return;
    }

    const colors: FactionColors = {
      goodColor: this.goodColor(),
      evilColor: this.evilColor(),
    };

    const body = {
      name:        this.editName(),
      type:        this.editType(),
      description: this.editDescription(),
      dmNotes:     this.editDmNotes(),
      influence:   Number(this.influence()) || 0,
      perception:  Number(this.perception()) || 0,
      hidden:      this.hidden(),
      colors,
      syncLibrary,
    };

    this.http.patch(
      `${environment.apiUrl}/api/campaign/${campaignId}/factions/${factionInstanceId}`,
      body
    ).subscribe(() => {
      this.factionState.set({
        ...this.currentFaction(),
        name:        body.name,
        type:        body.type,
        description: body.description,
        dmNotes:     body.dmNotes,
        influence:   body.influence,
        perception:  body.perception,
        hidden:      body.hidden,
        colors:      body.colors,
      });
      this.editing.set(false);
    });
  }

  saveToLibrary() {
    this.saveDetails(true);
  }

  saveRelationship(event: SaveRelationshipEvent): void {
    const campaignId = this.campaignId();
    const factionInstanceId = this.factionInstanceId;
    if (!campaignId || !factionInstanceId) return;

    const body = {
      factionInstanceIdA: factionInstanceId,
      factionInstanceIdB: event.factionInstanceIdB,
      relationshipType:   event.relationshipType,
      strength:           event.strength,
    };

    this.http.post<FactionRelationship>(
      `${environment.apiUrl}/api/campaign/${campaignId}/factions/${factionInstanceId}/relationships`,
      body
    ).subscribe(rel => {
      const f = this.currentFaction();
      this.factionState.set({
        ...f,
        factionRelationships: [...(f.factionRelationships ?? []), rel],
      });
    });
  }

  removeRelationship(rel: FactionRelationship): void {
    const campaignId = this.campaignId();
    const factionInstanceId = this.factionInstanceId;
    if (!campaignId || !factionInstanceId) return;

    this.http.delete(
      `${environment.apiUrl}/api/campaign/${campaignId}/factions/${factionInstanceId}/relationships/${rel.id}`
    ).subscribe(() => {
      const f = this.currentFaction();
      this.factionState.set({
        ...f,
        factionRelationships: (f.factionRelationships ?? []).filter(r => r.id !== rel.id),
      });
    });
  }

  ngOnDestroy(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }
}
