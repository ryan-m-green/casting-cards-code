import {
  Component,
  computed,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { CardInstanceUpdatedService } from '../../../core/hub/v2/card-instance-updated.service';
import { CcRadialTreeComponent } from '../cc-radial-tree/cc-radial-tree.component';

interface LocationTree {
  location: CampaignLocationInstance;
  sublocations: CampaignSublocationInstance[];
  casts: CampaignCastInstance[];
}

@Component({
  selector: 'app-cc-campaign-hierarchy',
  standalone: true,
  imports: [CommonModule, CcRadialTreeComponent],
  templateUrl: './cc-campaign-hierarchy.component.html',
  styleUrl: './cc-campaign-hierarchy.component.scss',
})
export class CcCampaignHierarchyComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private cardInstanceUpdatedService = inject(CardInstanceUpdatedService);

  /** The campaign whose location/sublocation/cast hierarchy is displayed. */
  campaignId = input.required<string>();

  /** Optional accent color passed down to each radial tree. */
  portalColor = input<string>('');

  loading = signal(false);
  error = signal<string | null>(null);
  locations = signal<CampaignLocationInstance[]>([]);
  sublocations = signal<CampaignSublocationInstance[]>([]);
  casts = signal<CampaignCastInstance[]>([]);

  trees = computed<LocationTree[]>(() => {
    const locs = this.locations();
    const subs = this.sublocations();
    const csts = this.casts();

    return locs.map((loc) => {
      const locSubs = subs.filter((s) => s.locationInstanceId === loc.instanceId);
      const subIds = new Set(locSubs.map((s) => s.instanceId));
      const locCasts = csts.filter(
        (c) => c.sublocationInstanceId && subIds.has(c.sublocationInstanceId)
      );
      return { location: loc, sublocations: locSubs, casts: locCasts };
    });
  });

  private hubSubscriptions: Subscription[] = [];

  ngOnInit(): void {
    this.loadData();
    this.setupHubSubscriptions();
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.forEach((sub) => sub.unsubscribe());
  }

  loadData(): void {
    const id = this.campaignId();
    if (!id) {
      this.error.set('No campaign ID provided');
      return;
    }

    this.loading.set(true);
    this.error.set(null);


    Promise.all([
      this.http
        .get<CampaignLocationInstance[]>(
          `${environment.apiUrl}/api/campaign/${id}/locationinstances`
        )
        .toPromise(),
      this.http
        .get<CampaignSublocationInstance[]>(
          `${environment.apiUrl}/api/campaign/${id}/sublocationinstances`
        )
        .toPromise(),
      this.http
        .get<CampaignCastInstance[]>(
          `${environment.apiUrl}/api/campaign/${id}/castinstances`
        )
        .toPromise(),
    ])
      .then(([locationsData, sublocationsData, castsData]) => {
        this.locations.set(locationsData ?? []);
        this.sublocations.set(sublocationsData ?? []);
        this.casts.set(castsData ?? []);
        this.loading.set(false);
      })
      .catch((err) => {
        console.error('Error loading campaign hierarchy:', err);
        this.error.set('Failed to load campaign hierarchy. Please try again.');
        this.loading.set(false);
      });
  }

  private setupHubSubscriptions(): void {
    const shouldRefresh = (campaignId: string) => campaignId === this.campaignId();

    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.locationInstanceUpdated$.subscribe((event) => {
        if (event && shouldRefresh(event.campaignId)) {
          this.loadData();
        }
      })
    );

    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.sublocationInstanceUpdated$.subscribe((event) => {
        if (event && shouldRefresh(event.campaignId)) {
          this.loadData();
        }
      })
    );

    this.hubSubscriptions.push(
      this.cardInstanceUpdatedService.castInstanceUpdated$.subscribe((event) => {
        if (event && shouldRefresh(event.campaignId)) {
          this.loadData();
        }
      })
    );
  }
}
