import { api, refreshApiSession } from '../../services/api';
import type { AuthUser, LoginCredentials, LoginResponse, MessageResponse, RegisterPayload } from './auth.types';

export function login(credentials: LoginCredentials) {
  return api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export function refreshSession() {
  return refreshApiSession();
}

export function logoutSession(accessToken: string) {
  return api<MessageResponse>('/auth/logout', {
    method: 'POST',
    accessToken,
  });
}

export function getCurrentUser(accessToken: string) {
  return api<AuthUser>('/auth/me', {
    accessToken,
  });
}

export function register(payload: RegisterPayload) {
  return api<MessageResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verifyEmail(token: string) {
  return api<MessageResponse>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export function resendVerification(email: string) {
  return api<MessageResponse>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function acceptInvitation(token: string, accessToken: string) {
  return api<MessageResponse>('/organization/invitations/accept', {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ token }),
  });
}