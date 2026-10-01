import type {
  OrganizationInvitationStatus,
  OrganizationMemberStatus,
} from './organization.types';

export function formatOrganizationDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatOrganizationTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatOrganizationDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function getInvitationStatusLabel(
  status: OrganizationInvitationStatus,
) {
  if (status === 'PENDING') return 'Pending';
  if (status === 'ACCEPTED') return 'Accepted';
  if (status === 'EXPIRED') return 'Expired';

  return 'Cancelled';
}

export function getInvitationStatusClass(
  status: OrganizationInvitationStatus,
) {
  if (status === 'ACCEPTED') {
    return 'organization-status-success';
  }

  if (status === 'PENDING') {
    return 'organization-status-warning';
  }

  if (status === 'CANCELLED') {
    return 'organization-status-danger';
  }

  return 'organization-status-neutral';
}

export function getMemberStatusLabel(
  status: OrganizationMemberStatus,
) {
  if (status === 'ACTIVE') return 'Active';

  if (status === 'PENDING_VERIFICATION') {
    return 'Pending verification';
  }

  return 'Suspended';
}

export function getMemberStatusClass(
  status: OrganizationMemberStatus,
) {
  if (status === 'ACTIVE') {
    return 'organization-status-success';
  }

  if (status === 'PENDING_VERIFICATION') {
    return 'organization-status-warning';
  }

  return 'organization-status-danger';
}