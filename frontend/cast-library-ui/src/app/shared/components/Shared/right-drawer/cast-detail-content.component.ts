import { Component, OnInit, computed, input, output, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, EMPTY } from 'rxjs';
import { CampaignCastInstance } from '../../../models/cast.model';
import { CampaignSecret } from '../../../models/secret.model';
import { environment } from '../../../../../environments/environment';
import { CcDetailPanelActionsComponent } from '../cc-detail-panel-actions/cc-detail-panel-actions.component';
import { CcSecretsManagerComponent } from '../cc-secrets-manager/cc-secrets-manager.component';
import { CcPortraitInputComponent } from '../cc-portrait-input/cc-portrait-input.component';
import { CcCastNewFormComponent } from '../cc-cast-new-form/cc-cast-new-form.component';
import { CampaignGmService } from '../../../../core/campaign-gm.service';

type DetailTab = 'details' | 'secrets';

@Component({
  selector: 'app-cast-detail-content',
  standalone: true,
  imports: [CommonModule, FormsModule, CcDetailPanelActionsComponent, CcSecretsManagerComponent, CcPortraitInputComponent, CcCastNewFormComponent],
  templateUrl: './cast-detail-content.component.html',
  styleUrl: './cast-detail-content.component.scss'
})
export class CastDetailContentComponent implements OnInit {
  private http = inject(HttpClient);
  private campaignGm = inject(CampaignGmService);

  readonly isDm = this.campaignGm.isDm;

  cast = input.required<CampaignCastInstance>();
  secrets = input.required<CampaignSecret[]>();
  campaignId = input<string>('');
  castInstanceId = input.required<string>();
  closeDrawer = output<void>();
  cardType = input<'location' | 'sublocation' | 'cast' | 'faction'>('cast');

  private castState = signal<CampaignCastInstance | null>(null);

  currentCast = computed(() => this.castState() ?? this.cast());

  castForm = viewChild<CcCastNewFormComponent>('castForm');

  ngOnInit(): void {
    this.castState.set(this.cast());
  }

  activeTab = signal<DetailTab>('details');

  setTab(tab: DetailTab): void {
    this.activeTab.set(tab);
  }

  /** The three star row the player rates the card with: 1 to 3, or 0 for unrated. */
  readonly starNums = [1, 2, 3];

  /** What the card wears now — the importance the party has given it. */
  readonly starsCount = computed(() => this.currentCast().starsCount ?? 0);

  /**
   * Sets the card's importance to the party, or clears it by tapping the star that is already lit.
   * The row moves at once and the write confirms it; if the write fails the row goes back to what
   * the campaign still holds.
   */
  setStars(stars: number): void {
    if (this.isDm()) return;

    const cast = this.currentCast();
    const campaignId = this.campaignId();
    if (!campaignId || !cast.instanceId) return;

    const previous = this.starsCount();
    const next = previous === stars ? 0 : stars;

    this.castState.set({ ...cast, starsCount: next });

    this.http.patch<void>(
      `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${cast.instanceId}/stars`,
      { starsCount: next }
    ).pipe(catchError(() => {
      this.castState.set({ ...cast, starsCount: previous });
      return EMPTY;
    })).subscribe();
  }

  editing = signal<boolean>(false);

  imageFile = signal<File | null>(null);

  private getEndpointMapping(cardType: 'location' | 'sublocation' | 'cast' | 'faction') {
    const endpoints = {
      location: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/locationinstances/${instanceId}/image`,
      sublocation: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/sublocationinstances/${instanceId}/image`,
      cast: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/castinstances/${instanceId}/image`,
      faction: (campaignId: string, instanceId: string) => 
        `${environment.apiUrl}/api/campaign/${campaignId}/factioninstances/${instanceId}/image`
    };
    return endpoints[cardType];
  }

  hasField(...values: (string | undefined | null)[]): boolean {
    return values.some(v => v && v.trim().length > 0);
  }

  startEditing() {
    if (!this.isDm()) return;
    this.imageFile.set(null);
    this.editing.set(true);
  }

  saveDetails(syncLibrary = false) {
    if (!this.isDm()) return;
    const file = this.imageFile();
    if (file) this._uploadImage(file);

    this.castForm()?.save(syncLibrary);
  }

  saveToLibrary() {
    this.saveDetails(true);
  }

  onCastSaved(cast: CampaignCastInstance) {
    this.castState.set(cast);
    this.imageFile.set(null);
    this.editing.set(false);
  }

  cancelEditing() {
    this.editing.set(false);
  }

  closePanel() {
    this.editing.set(false);
    this.closeDrawer.emit();
  }

  private _uploadImage(file: File) {
    const cast = this.currentCast();
    const campaignId = this.campaignId();
    if (!campaignId || !cast.instanceId) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceCastId', cast.sourceCastId);

    this.http.post(this.getEndpointMapping(this.cardType())(campaignId, cast.instanceId), formData)
      .subscribe({
        next: () => this.imageFile.set(null),
        error: () => this.imageFile.set(null),
      });
  }
}
