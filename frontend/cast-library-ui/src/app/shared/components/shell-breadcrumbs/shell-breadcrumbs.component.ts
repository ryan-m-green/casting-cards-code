import { Component, input } from '@angular/core';

export interface ShellCrumb {
  label: string;
  action: () => void;
}

@Component({
  selector: 'app-shell-breadcrumbs',
  standalone: true,
  imports: [],
  templateUrl: './shell-breadcrumbs.component.html',
  styleUrl: './shell-breadcrumbs.component.scss',
})
export class ShellBreadcrumbsComponent {
  crumbs = input<ShellCrumb[]>([]);
}
