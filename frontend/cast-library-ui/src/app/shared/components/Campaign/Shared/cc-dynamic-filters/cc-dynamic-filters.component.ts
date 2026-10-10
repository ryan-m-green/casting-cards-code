import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface DynamicFilter {
  key: string;
  label: string;
  count: number;
  on: boolean;
  title?: string;
  disabled?: boolean;
}

@Component({
  selector: 'cc-dynamic-filters',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cc-dynamic-filters.component.html',
  styleUrl: './cc-dynamic-filters.component.scss',
  host: {
    role: 'group',
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class CcDynamicFiltersComponent {
  readonly filters = input<DynamicFilter[]>([]);
  readonly ariaLabel = input('Filter');
  readonly select = output<string>();

  isDisabled(filter: DynamicFilter): boolean {
    return filter.disabled ?? filter.count <= 0;
  }

  titleFor(filter: DynamicFilter): string {
    return filter.title ?? `${filter.label} (${filter.count})`;
  }
}
