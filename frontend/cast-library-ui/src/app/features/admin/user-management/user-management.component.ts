import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';
import { CampaignDropdownComponent, CampaignDropdownOption } from '../../../shared/components/campaign-dropdown/campaign-dropdown.component';

interface UserManagementResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

interface DemoCampaign {
  id: string;
  name: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, JournalTitleComponent, CampaignDropdownComponent],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private http = inject(HttpClient);

  activeTab = signal<'users' | 'add-player'>('users');

  users = signal<UserManagementResponse[]>([]);
  filteredUsers = signal<UserManagementResponse[]>([]);
  loading = signal(false);
  deleting = signal<string | null>(null);
  errorMsg = signal('');
  searchQuery = '';
  showConfirmDialog = signal(false);
  userToDelete = signal<UserManagementResponse | null>(null);

  demoCampaigns = signal<DemoCampaign[]>([]);
  demoCampaignOptions = computed<CampaignDropdownOption[]>(() =>
    this.demoCampaigns().map(c => ({ value: c.id, label: c.name }))
  );
  demoPlayerIds = signal<string[]>([]);
  selectedDemoCampaign = signal<Record<string, string>>({});
  assigningDemo = signal<string | null>(null);
  assignDemoSuccess = signal<Record<string, string>>({});

  addPlayerEmail = '';
  addPlayerDisplayName = '';
  addPlayerRole = 'DM';
  addPlayerSubmitting = signal(false);
  addPlayerError = signal('');
  addPlayerSuccess = signal('');

  setTab(tab: 'users' | 'add-player') {
    this.activeTab.set(tab);
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadDemoCampaigns() {
    this.http.get<DemoCampaign[]>(`${environment.apiUrl}/api/admin/campaigns/demo`)
      .subscribe(res => this.demoCampaigns.set(res));
  }

  loadUsers() {
    this.loading.set(true);
    this.errorMsg.set('');
    forkJoin({
      users: this.http.get<UserManagementResponse[]>(`${environment.apiUrl}/api/admin/users`),
      demos: this.http.get<DemoCampaign[]>(`${environment.apiUrl}/api/admin/campaigns/demo`),
      demoPlayers: this.http.get<string[]>(`${environment.apiUrl}/api/admin/campaigns/demo/players`),
    }).subscribe({
      next: ({ users, demos, demoPlayers }) => {
        this.users.set(users);
        this.filteredUsers.set(users);
        this.demoCampaigns.set(demos);
        this.demoPlayerIds.set(demoPlayers);
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Failed to load users.');
        this.loading.set(false);
      },
    });
  }

  filterUsers() {
    const query = this.searchQuery.toLowerCase();
    if (!query) {
      this.filteredUsers.set(this.users());
      return;
    }
    const filtered = this.users().filter(u =>
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
    this.filteredUsers.set(filtered);
  }

  confirmDelete(user: UserManagementResponse) {
    this.userToDelete.set(user);
    this.showConfirmDialog.set(true);
  }

  cancelDelete() {
    this.showConfirmDialog.set(false);
    this.userToDelete.set(null);
  }

  deleteUser() {
    const user = this.userToDelete();
    if (!user) return;

    this.deleting.set(user.id);
    this.showConfirmDialog.set(false);
    this.errorMsg.set('');

    this.http.delete(`${environment.apiUrl}/api/admin/users/${user.id}`).subscribe({
      next: () => {
        const updatedUsers = this.users().filter(u => u.id !== user.id);
        this.users.set(updatedUsers);
        this.filterUsers();
        this.deleting.set(null);
        this.userToDelete.set(null);
      },
      error: (e) => {
        this.errorMsg.set(e.error?.message || 'Failed to delete user.');
        this.deleting.set(null);
        this.userToDelete.set(null);
      },
    });
  }

  getSelectedCampaign(userId: string): string {
    return this.selectedDemoCampaign()[userId] ?? '';
  }

  setSelectedCampaign(userId: string, campaignId: string) {
    this.selectedDemoCampaign.update(m => {
      const n = { ...m };
      if (campaignId) { n[userId] = campaignId; } else { delete n[userId]; }
      return n;
    });
    this.assignDemoSuccess.update(m => { const n = { ...m }; delete n[userId]; return n; });
  }

  assignToDemo(userId: string) {
    const campaignId = this.getSelectedCampaign(userId);
    if (!campaignId) return;
    this.assigningDemo.set(userId);
    this.http.post(`${environment.apiUrl}/api/admin/campaigns/${campaignId}/players/${userId}`, {}).subscribe({
      next: () => {
        this.assigningDemo.set(null);
        this.assignDemoSuccess.update(m => ({ ...m, [userId]: 'Added!' }));
        this.selectedDemoCampaign.update(m => { const n = { ...m }; delete n[userId]; return n; });
      },
      error: () => {
        this.assigningDemo.set(null);
      },
    });
  }

  submitAddPlayer() {

    this.http.post(`${environment.apiUrl}/api/admin/users`, {
      email: this.addPlayerEmail,
      displayName: this.addPlayerDisplayName,
      role: this.addPlayerRole,
    }).subscribe({
      next: () => {
        this.addPlayerSuccess.set(`Player "${this.addPlayerDisplayName}" created successfully.`);
        this.addPlayerEmail = '';
        this.addPlayerDisplayName = '';
        this.addPlayerRole = 'Player';
        this.addPlayerSubmitting.set(false);
        this.loadUsers();
        setTimeout(() => this.addPlayerSuccess.set(''), 3000);
      },
      error: (e) => {
        this.addPlayerError.set(e.error?.message || 'Failed to create player.');
        this.addPlayerSubmitting.set(false);
        setTimeout(() => this.addPlayerError.set(''), 3000);
      },
    });
  }

  formatDate(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString();
  }
}

