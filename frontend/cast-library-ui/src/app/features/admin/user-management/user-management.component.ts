import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { DmNavComponent } from '../../../shared/components/dm-nav/dm-nav.component';

interface UserManagementResponse {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [DmNavComponent, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private http = inject(HttpClient);

  users = signal<UserManagementResponse[]>([]);
  filteredUsers = signal<UserManagementResponse[]>([]);
  loading = signal(false);
  deleting = signal<string | null>(null);
  errorMsg = signal('');
  searchQuery = '';
  showConfirmDialog = signal(false);
  userToDelete = signal<UserManagementResponse | null>(null);

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading.set(true);
    this.errorMsg.set('');
    this.http.get<UserManagementResponse[]>(`${environment.apiUrl}/api/admin/users`).subscribe({
      next: res => {
        this.users.set(res);
        this.filteredUsers.set(res);
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

  formatDate(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString();
  }
}
