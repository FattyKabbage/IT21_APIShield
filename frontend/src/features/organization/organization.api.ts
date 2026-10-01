import { api } from '../../services/api';
import type {
  CreateOrganizationInvitationPayload,
  MessageResponse,
  Organization,
  OrganizationInvitation,
  OrganizationMember,
} from './organization.types';

export function getOrganization(accessToken: string) {
  return api<Organization>('/organization', {
    accessToken,
  });
}

export function getOrganizationMembers(accessToken: string) {
  return api<OrganizationMember[]>('/organization/members', {
    accessToken,
  });
}

export function getOrganizationInvitations(accessToken: string) {
  return api<OrganizationInvitation[]>('/organization/invitations', {
    accessToken,
  });
}

export function createOrganizationInvitation(
  accessToken: string,
  payload: CreateOrganizationInvitationPayload,
) {
  return api<MessageResponse>('/organization/invitations', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function cancelOrganizationInvitation(
  accessToken: string,
  invitationId: string,
) {
  return api<MessageResponse>(
    `/organization/invitations/${invitationId}`,
    {
      method: 'DELETE',
      accessToken,
    },
  );
}

export function resendOrganizationInvitation(
  accessToken: string,
  invitationId: string,
) {
  return api<MessageResponse>(
    `/organization/invitations/${invitationId}/resend`,
    {
      method: 'POST',
      accessToken,
    },
  );
}