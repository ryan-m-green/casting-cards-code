import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class JournalRandomizeService {
  private randomizeSubject = new Subject<string>();
  randomize$ = this.randomizeSubject.asObservable();

  triggerRandomize(groupId: string): void {
    this.randomizeSubject.next(groupId);
  }
}
