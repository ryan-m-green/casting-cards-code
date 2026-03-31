import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GoldTransaction, CampaignPlayer } from '../../shared/models/campaign.model';
import { DmNavComponent } from '../../shared/components/dm-nav/dm-nav.component';

@Component({
  selector: 'app-gold-ledger',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule, DatePipe, DmNavComponent],
  templateUrl: './gold-ledger.component.html',
  styleUrl: './gold-ledger.component.scss'
})
export class GoldLedgerComponent implements OnInit {
  private http = inject(HttpClient);
  private fb   = inject(FormBuilder);

  transactions = signal<GoldTransaction[]>([]);
  players      = signal<CampaignPlayer[]>([]);

  form = this.fb.group({
    playerUserId:    [''],
    amount:          [0, [Validators.required, Validators.min(1)]],
    transactionType: ['DM_GRANT'],
    description:     [''],
  });

  ngOnInit() {
    // Would normally scope to a campaign
    this.http.get<GoldTransaction[]>(`${environment.apiUrl}/api/gold-transactions`)
      .subscribe(t => this.transactions.set(t));
  }

  submit() {
    if (this.form.invalid) return;
    this.http.post<GoldTransaction>(`${environment.apiUrl}/api/gold-transactions`, this.form.value)
      .subscribe(t => this.transactions.update(list => [t, ...list]));
  }
}
