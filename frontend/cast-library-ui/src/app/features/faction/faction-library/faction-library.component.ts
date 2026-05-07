import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Faction } from '../../../shared/models/faction.model';
import { FactionCardComponent } from '../../../shared/components/faction-card/faction-card.component';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { JournalWatermarkComponent } from '../../../shared/components/journal-watermark/journal-watermark.component';

@Component({
  selector: 'app-faction-library',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FactionCardComponent, JournalTitleComponent, JournalWatermarkComponent],
  templateUrl: './faction-library.component.html',
  styleUrl: './faction-library.component.scss'
})
export class FactionLibraryComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  factions        = signal<Faction[]>([]);
  searchTerm      = signal('');
  pendingDeleteId = signal<string | null>(null);
  private tiltMap = new Map<string, number>();

  ngOnInit() {
    this.http.get<Faction[]>(`${environment.apiUrl}/api/factions`)
      .subscribe(f => this.factions.set(f));
  }

  filtered() {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.factions();
    return this.factions().filter(f =>
      f.name.toLowerCase().includes(term) ||
      f.type.toLowerCase().includes(term)
    );
  }

  edit(id: string)          { this.router.navigate(['/dm/faction', id]); }
  confirmDelete(id: string) { this.pendingDeleteId.set(id); }
  cancelDelete()            { this.pendingDeleteId.set(null); }

  executeDelete() {
    const id = this.pendingDeleteId();
    if (!id) return;
    this.http.delete(`${environment.apiUrl}/api/factions/${id}`)
      .subscribe(() => {
        this.factions.set(this.factions().filter(f => f.id !== id));
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
