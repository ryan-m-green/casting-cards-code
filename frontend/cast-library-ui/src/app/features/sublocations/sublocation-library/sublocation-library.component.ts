import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Sublocation } from '../../../shared/models/sublocation.model';
import { SublocationCardComponent } from '../../../shared/components/sublocation-card/sublocation-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';

@Component({
  selector: 'app-sublocation-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, SublocationCardComponent, JournalTitleComponent, JournalWatermarkComponent],
  templateUrl: './sublocation-library.component.html',
  styleUrl: './sublocation-library.component.scss'
})
export class SublocationLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);
  sublocations    = signal<Sublocation[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  private tiltMap = new Map<string, number>();

  ngOnInit() {
    this.http.get<Sublocation[]>(`${environment.apiUrl}/api/sublocations`).subscribe(l => this.sublocations.set(l));
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.sublocations();
    return this.sublocations().filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term)
    );
  }

  edit(id: string) { this.router.navigate(['/dm/sublocations', id]); }

  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/sublocations/${id}`)
      .subscribe(() => {
        this.sublocations.set(this.sublocations().filter(l => l.id !== id));
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
