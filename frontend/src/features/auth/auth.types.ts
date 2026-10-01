export type UserRole = 'SYSTEM_ADMIN' | 'ORGANIZATION' | 'DEVELOPER';

export type RegistrationType = 'ORGANIZATION' | 'DEVELOPER';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  role: UserRole;
}

export interface RegisterPayload {
  email: string;
  password: string;
  type: RegistrationType;
  organizationName?: string;
}

export interface MessageResponse {
  message: string;
}