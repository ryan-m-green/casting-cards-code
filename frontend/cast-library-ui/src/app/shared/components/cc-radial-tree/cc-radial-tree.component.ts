import {
  Component,
  computed,
  EventEmitter,
  input,
  Output,
} from '@angular/core';
import { hierarchy, tree } from 'd3-hierarchy';
import { CampaignLocationInstance } from '../../models/location.model';
import { CampaignSublocationInstance } from '../../models/sublocation.model';
import { CampaignCastInstance } from '../../models/cast.model';
import { SimpleLocationCardComponent } from '../simple-location-card/simple-location-card.component';
import { SimpleSublocationCardComponent } from '../simple-sublocation-card/simple-sublocation-card.component';
import { SimpleCastCardComponent } from '../simple-cast-card/simple-cast-card.component';

type Entity =
  | CampaignLocationInstance
  | CampaignSublocationInstance
  | CampaignCastInstance;

interface TreeDatum {
  id: string;
  kind: 'location' | 'sublocation' | 'cast';
  entity: Entity;
  children?: TreeDatum[];
}

interface PositionedNode {
  id: string;
  kind: TreeDatum['kind'];
  entity: Entity;
  x: number;
  y: number;
}

interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Must match the `:host` dimensions of the simple-*-card components. */
const CARD_WIDTH = 75;
const CARD_HEIGHT = 110;
const NODE_GAP = 28;
const MIN_RADIUS = 220;
const STAGE_PADDING = 48;

@Component({
  selector: 'app-cc-radial-tree',
  standalone: true,
  imports: [
    SimpleLocationCardComponent,
    SimpleSublocationCardComponent,
    SimpleCastCardComponent,
  ],
  templateUrl: './cc-radial-tree.component.html',
  styleUrl: './cc-radial-tree.component.scss',
})
export class CcRadialTreeComponent {
  /** Single location that acts as the root of this radial tree. */
  location = input.required<CampaignLocationInstance>();

  /** Sublocations that belong to the root location. */
  sublocations = input.required<CampaignSublocationInstance[]>();

  /** Casts that belong to the sublocations. */
  casts = input.required<CampaignCastInstance[]>();

  /** Optional accent color used for the title and connector lines. */
  portalColor = input<string>('#6e28d0');

  /** Emits when a cast card is clicked. */
  @Output() castClick = new EventEmitter<CampaignCastInstance>();

  readonly cardWidth = CARD_WIDTH;
  readonly cardHeight = CARD_HEIGHT;

  readonly safePortalColor = computed(() => this.portalColor() || null);

  private readonly layout = computed(() => {
    const root: TreeDatum = {
      id: this.location().instanceId,
      kind: 'location',
      entity: this.location(),
      children: this.sublocations().map((sub) => ({
        id: sub.instanceId,
        kind: 'sublocation' as const,
        entity: sub,
        children: this.casts()
          .filter((c) => c.sublocationInstanceId === sub.instanceId)
          .map((c) => ({
            id: c.instanceId,
            kind: 'cast' as const,
            entity: c,
          })),
      })),
    };

    const subCount = this.sublocations().length;
    const castCount = this.casts().length;
    const cardStep = CARD_WIDTH + NODE_GAP;
    const radius = Math.max(
      MIN_RADIUS,
      (castCount * cardStep) / (2 * Math.PI),
      (subCount * cardStep) / Math.PI
    );

    const rootHierarchy = hierarchy<TreeDatum>(root, (d) => d.children);
    const layout = tree<TreeDatum>()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth);

    const positioned = layout(rootHierarchy);

    const toCartesian = (x: number, y: number) => {
      const angle = x - Math.PI / 2;
      return { x: y * Math.cos(angle), y: y * Math.sin(angle) };
    };

    const nodes: PositionedNode[] = positioned.descendants().map((n) => ({
      id: n.data.id,
      kind: n.data.kind,
      entity: n.data.entity,
      ...toCartesian(n.x, n.y),
    }));

    const edges: Edge[] = positioned.links().map((l) => {
      const source = toCartesian(l.source.x, l.source.y);
      const target = toCartesian(l.target.x, l.target.y);
      return {
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      };
    });

    const stageSize = 2 * radius + CARD_WIDTH + 2 * STAGE_PADDING;
    const center = stageSize / 2;

    return { nodes, edges, stageSize, center };
  });

  readonly nodes = computed(() => this.layout().nodes);
  readonly edges = computed(() => this.layout().edges);
  readonly stageSize = computed(() => this.layout().stageSize);
  readonly center = computed(() => this.layout().center);
}
