import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface CastIndexItem {
  id: string;
  name: string;
  role: string;
  race: string;
  keywords: string[];
  imageUrl: string;
}

export interface CastIndexPage {
  items: CastIndexItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

const PAGE_SIZE = 100;

@Injectable({ providedIn: 'root' })
export class CastIndexService {
  private http = inject(HttpClient);

  readonly items = signal<CastIndexItem[]>([]);

  readonly loading = signal(false);
  readonly error = signal('');

  private run = 0;

  load(): void {
    const run = ++this.run;
    this.items.set([]);
    this.error.set('');
    this.loading.set(true);
    this.fetchPage(1, run);
  }

  private fetchPage(pageNumber: number, run: number): void {
    if (run !== this.run) return;

    this.http.get<CastIndexPage>(`${environment.apiUrl}/api/cast/index`, { params: this.params(pageNumber) })
      .subscribe({
        next: page => {
          if (run !== this.run) return;

          this.items.update(current => [...current, ...page.items]);

          if (pageNumber < page.totalPages) {
            this.fetchPage(pageNumber + 1, run);
            return;
          }

          this.loading.set(false);
        },
        error: () => {
          if (run !== this.run) return;

          this.error.set('Could not load the cast library.');
          this.loading.set(false);
        },
      });
  }

  private params(pageNumber: number): HttpParams {
    return new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', PAGE_SIZE);
  }
}

