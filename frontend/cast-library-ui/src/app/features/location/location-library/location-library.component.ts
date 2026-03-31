import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Location } from '../../../shared/models/location.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-location-library',
  standalone: true,
  imports: [CommonModule, RouterLink, CardFlipComponent, DmNavComponent],
  templateUrl: './location-library.component.html',
  styleUrl: './location-library.component.scss'
})
export class LocationLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);
  locations       = signal<Location[]>([]);
  pendingDeleteId = signal<string | null>(null);

  ngOnInit() {
    this.http.get<Location[]>(`${environment.apiUrl}/api/locations`).subscribe(l => this.locations.set(l));
  }

  edit(id: string) { this.router.navigate(['/dm/locations', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/locations/${id}`)
      .subscribe(() => {
        this.locations.set(this.locations().filter(l => l.id !== id));
        this.pendingDeleteId.set(null);
      });
  }
}
