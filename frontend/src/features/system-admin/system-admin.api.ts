import { api } from '../../services/api';
import type { SecurityEvent } from '../activity/activity.types';
import type { SystemAdminOrganization, SystemAdminOrganizationDetail, SystemAdminOverview, SystemAdminUser, SystemAdminUserDetail } from './system-admin.types';

export function getSystemAdminOverview(accessToken: string) {
  return api<SystemAdminOverview>('/admin', {
    accessToken,
  });
}

export function getSystemAdminUsers(accessToken: string) {
  return api<SystemAdminUser[]>('/admin/users', {
    accessToken,
  });
}

export function getSystemAdminUser(accessToken: string, userId: string) {
  return api<SystemAdminUserDetail>(`/admin/users/${userId}`, {
    accessToken,
  });
}

export function getSystemAdminOrganizations(accessToken: string) {
  return api<SystemAdminOrganization[]>('/admin/organizations', {
    accessToken,
  });
}

export function getSystemAdminOrganization(accessToken: string, organizationId: string) {
  return api<SystemAdminOrganizationDetail>(`/admin/organizations/${organizationId}`, {
    accessToken,
  });
}

export function getSystemAdminSecurityEvents(accessToken: string) {
  return api<SecurityEvent[]>('/admin/security-events', {
    accessToken,
  });
}