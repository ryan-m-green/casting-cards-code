import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-product-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './product-shell.component.html',
  styleUrl: './product-shell.component.scss'
})
export class ProductShellComponent {
  auth = inject(AuthService);
}
