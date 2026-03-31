export type UserRole = 'DM' | 'Player' | 'Admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  inviteCode: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
