import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { JournalTitleComponent } from '../../../shared/components/journal-title/journal-title.component';

interface UserManagementResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  lastLoggedInOn: string | null;
  subscriptionId: string | null;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: string;
  bypassPayment: boolean;
  currentPeriodEnd: string | null;
  lockLevel: string;
}

interface DemoCampaign {
  id: string;
  name: string;
}

interface CampaignDropdownOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [FormsModule, JournalTitleComponent],
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
  changingRole = signal<string | null>(null);
  showRoleConfirmDialog = signal(false);
  userToChangeRole = signal<UserManagementResponse | null>(null);
  newRole = signal('');
  adminPassword = '';
  roleChangeError = signal('');

  showPasswordResetDialog = signal(false);
  userToResetPassword = signal<UserManagementResponse | null>(null);
  resettingPassword = signal<string | null>(null);
  passwordResetError = signal('');

  demoCampaigns = signal<DemoCampaign[]>([]);
  demoCampaignOptions = computed<CampaignDropdownOption[]>(() =>
    this.demoCampaigns().map(c => ({ value: c.id, label: c.name }))
  );
  demoPlayerAssignments = signal<Record<string, string>>({});
  selectedDemoCampaign = signal<Record<string, string>>({});
  assigningDemo = signal<string | null>(null);
  assignDemoSuccess = signal<Record<string, string>>({});

  addPlayerEmail = '';
  addPlayerDisplayName = '';
  addPlayerRole = 'DM';
  addPlayerBypassPayment = false;
  addPlayerSubmitting = signal(false);
  addPlayerError = signal('');
  addPlayerSuccess = signal('');

  editingSubscription = signal<string | null>(null);
  subscriptionUpdateLoading = signal(false);
  subscriptionEditData = signal<Record<string, {
    status: string;
    bypassPayment: boolean;
    currentPeriodEnd: string;
    lockLevel: string;
  }>>({});

  userCardCounts = signal<Record<string, {
    campaigns: number;
    locations: number;
    sublocations: number;
    casts: number;
    factions: number;
  }>>({});
  loadingCardCounts = signal<Record<string, boolean>>({});

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
      demoPlayers: this.http.get<Record<string, string>>(`${environment.apiUrl}/api/admin/campaigns/demo/players`),
    }).subscribe({
      next: ({ users, demos, demoPlayers }) => {
        this.users.set(users);
        this.filteredUsers.set(users);
        this.demoCampaigns.set(demos);
        this.demoPlayerAssignments.set(demoPlayers);
        this.selectedDemoCampaign.set(demoPlayers);
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

  confirmRoleChange(user: UserManagementResponse, role: string) {
    this.userToChangeRole.set(user);
    this.newRole.set(role);
    this.showRoleConfirmDialog.set(true);
    this.adminPassword = '';
    this.roleChangeError.set('');
  }

  cancelRoleChange() {
    this.showRoleConfirmDialog.set(false);
    this.userToChangeRole.set(null);
    this.newRole.set('');
    this.adminPassword = '';
    this.roleChangeError.set('');
  }

  changeUserRole() {
    const user = this.userToChangeRole();
    if (!user || !this.adminPassword) return;

    this.changingRole.set(user.id);
    this.roleChangeError.set('');

    this.http.patch(`${environment.apiUrl}/api/admin/users/${user.id}/role`, {
      newRole: this.newRole(),
      adminPassword: this.adminPassword,
    }).subscribe({
      next: () => {
        const updatedUsers = this.users().map(u =>
          u.id === user.id ? { ...u, role: this.newRole() } : u
        );
        this.users.set(updatedUsers);
        this.filterUsers();
        this.changingRole.set(null);
        this.cancelRoleChange();
      },
      error: (e) => {
        this.roleChangeError.set(e.error?.message || 'Failed to change role.');
        this.changingRole.set(null);
      },
    });
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
      bypassPayment: this.addPlayerBypassPayment,
    }).subscribe({
      next: () => {
        this.addPlayerSuccess.set(`Player "${this.addPlayerDisplayName}" created successfully.`);
        this.addPlayerEmail = '';
        this.addPlayerDisplayName = '';
        this.addPlayerRole = 'Player';
        this.addPlayerBypassPayment = false;
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

  formatDateNullable(date: string | null): string {
    return date ? new Date(date).toLocaleDateString() : 'never';
  }

  clearFormMessages() {
    this.addPlayerSuccess.set('');
    this.addPlayerError.set('');
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  startEditSubscription(user: UserManagementResponse) {
    this.subscriptionEditData.update((data: Record<string, { status: string; bypassPayment: boolean; currentPeriodEnd: string; lockLevel: string }>) => ({
      ...data,
      [user.id]: {
        status: user.status,
        bypassPayment: user.bypassPayment,
        currentPeriodEnd: user.currentPeriodEnd ?? '',
        lockLevel: user.lockLevel,
      },
    }));
    this.editingSubscription.set(user.id);
  }

  cancelEditSubscription() {
    this.editingSubscription.set(null);
  }

  saveSubscription(user: UserManagementResponse) {
    const editData = this.subscriptionEditData()[user.id];
    if (!editData) return;

    this.subscriptionUpdateLoading.set(true);
    this.http.patch(`${environment.apiUrl}/api/admin/users/${user.id}/subscription`, {
      status: editData.status,
      bypassPayment: editData.bypassPayment,
      currentPeriodEnd: editData.currentPeriodEnd || null,
      lockLevel: editData.lockLevel,
    }).subscribe({
      next: () => {
        const updatedUsers = this.users().map(u =>
          u.id === user.id ? { ...u, status: editData.status, bypassPayment: editData.bypassPayment, currentPeriodEnd: editData.currentPeriodEnd || null, lockLevel: editData.lockLevel } : u
        );
        this.users.set(updatedUsers);
        this.filterUsers();
        this.subscriptionUpdateLoading.set(false);
        this.editingSubscription.set(null);
      },
      error: () => {
        this.subscriptionUpdateLoading.set(false);
      },
    });
  }

  loadUserCardCounts(userId: string) {
    if (this.userCardCounts()[userId] || this.loadingCardCounts()[userId]) {
      return; // Already loaded or loading
    }

    this.loadingCardCounts.update(m => ({ ...m, [userId]: true }));
    this.http.get<{
      campaigns: number;
      locations: number;
      sublocations: number;
      casts: number;
      factions: number;
    }>(`${environment.apiUrl}/api/site-configuration/users/${userId}/card-counts`).subscribe({
      next: (counts) => {
        this.userCardCounts.update(m => ({ ...m, [userId]: counts }));
        this.loadingCardCounts.update(m => ({ ...m, [userId]: false }));
      },
      error: () => {
        this.loadingCardCounts.update(m => ({ ...m, [userId]: false }));
      },
    });
  }

  confirmPasswordReset(user: UserManagementResponse) {
    this.userToResetPassword.set(user);
    this.showPasswordResetDialog.set(true);
    this.adminPassword = '';
    this.passwordResetError.set('');
  }

  cancelPasswordReset() {
    this.showPasswordResetDialog.set(false);
    this.userToResetPassword.set(null);
    this.adminPassword = '';
    this.passwordResetError.set('');
  }

  resetUserPassword() {
    const user = this.userToResetPassword();
    if (!user || !this.adminPassword) return;

    this.resettingPassword.set(user.id);
    this.passwordResetError.set('');

    this.http.patch(`${environment.apiUrl}/api/admin/users/${user.id}/password`, {
      adminPassword: this.adminPassword,
    }).subscribe({
      next: () => {
        this.resettingPassword.set(null);
        this.cancelPasswordReset();
      },
      error: (e) => {
        this.passwordResetError.set(e.error?.message || 'Failed to reset password.');
        this.resettingPassword.set(null);
      },
    });
  }
}


