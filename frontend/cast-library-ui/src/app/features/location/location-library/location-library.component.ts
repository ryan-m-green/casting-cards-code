import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Location } from '../../../shared/models/location.model';
import { LocationCardComponent } from '../../../shared/components/location-card/location-card.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-location-library',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationCardComponent, RouterLink, DmNavComponent],
  templateUrl: './location-library.component.html',
  styleUrl: './location-library.component.scss'
})
export class LocationLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  locations          = signal<Location[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  private tiltMap = new Map<string, number>();

  ngOnInit() {
    this.http.get<Location[]>(`${environment.apiUrl}/api/locations`).subscribe(c => this.locations.set(c));
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.locations();
    return this.locations().filter(c => c.name.toLowerCase().includes(term) || c.classification.toLowerCase().includes(term));
  }

  edit(id: string) { this.router.navigate(['/dm/locations', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/locations/${id}`)
      .subscribe(() => {
        this.locations.set(this.locations().filter(c => c.id !== id));
        this.pendingDeleteId.set(null);
      });
  }

  tiltFor(id: string): number {
    if (!this.tiltMap.has(id)) {
      this.tiltMap.set(id, parseFloat((Math.random() * 4 - 2).toFixed(2)));
    }
    return this.tiltMap.get(id)!;
  }
}
