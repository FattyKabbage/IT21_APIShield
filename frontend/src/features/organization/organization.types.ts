export type OrganizationWorkspaceSection = 'overview' | 'members' | 'invitations';

export type OrganizationInvitationStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'EXPIRED'
  | 'CANCELLED';

export type OrganizationMemberStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED';

export type OrganizationMemberRole =
  | 'ORGANIZATION'
  | 'DEVELOPER';

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  email: string;
  role: OrganizationMemberRole;
  status: OrganizationMemberStatus;
  createdAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  expiresAt: string;
  acceptedAt: string | null;
  status: OrganizationInvitationStatus;
  createdAt: string;
}

export interface CreateOrganizationInvitationPayload {
  email: string;
}

export interface MessageResponse {
  message: string;
}