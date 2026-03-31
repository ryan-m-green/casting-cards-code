import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { City } from '../../../shared/models/city.model';
import { CardFlipComponent } from '../../../shared/components/card-flip/card-flip.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-city-library',
  standalone: true,
  imports: [CommonModule, FormsModule, CardFlipComponent, RouterLink, DmNavComponent],
  templateUrl: './city-library.component.html',
  styleUrl: './city-library.component.scss'
})
export class CityLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  cities          = signal<City[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);

  ngOnInit() {
    this.http.get<City[]>(`${environment.apiUrl}/api/cities`).subscribe(c => this.cities.set(c));
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.cities();
    return this.cities().filter(c => c.name.toLowerCase().includes(term) || c.classification.toLowerCase().includes(term));
  }

  edit(id: string) { this.router.navigate(['/dm/cities', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/cities/${id}`)
      .subscribe(() => {
        this.cities.set(this.cities().filter(c => c.id !== id));
        this.pendingDeleteId.set(null);
      });
  }
}
