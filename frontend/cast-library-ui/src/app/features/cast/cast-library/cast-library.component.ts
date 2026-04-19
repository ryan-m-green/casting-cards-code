import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Cast } from '../../../shared/models/cast.model';
import { CastCardComponent } from '../../../shared/components/cast-card/cast-card.component';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-cast-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, CastCardComponent, DmNavComponent],
  templateUrl: './cast-library.component.html',
  styleUrl: './cast-library.component.scss'
})
export class CastLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  cast            = signal<Cast[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);

  ngOnInit() {
    this.http.get<Cast[]>(`${environment.apiUrl}/api/cast`)
      .subscribe(n => this.cast.set(n));
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.cast();
    return this.cast().filter(n =>
      n.name.toLowerCase().includes(term) ||
      n.race.toLowerCase().includes(term) ||
      n.role.toLowerCase().includes(term)
    );
  }

  initial(name: string) { return name.charAt(0).toUpperCase(); }
  edit(id: string)      { this.router.navigate(['/dm/cast', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/cast/${id}`)
      .subscribe(() => {
        this.cast.set(this.cast().filter(n => n.id !== id));
        this.pendingDeleteId.set(null);
      });
  }
}
