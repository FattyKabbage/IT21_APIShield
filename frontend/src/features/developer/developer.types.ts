export type DeveloperMembershipType = 'ORGANIZATION' | 'INDEPENDENT';

export type DeveloperAccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export type DeveloperApplicationEnvironment = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

export type DeveloperApplicationStatus = 'ACTIVE' | 'DISABLED';

export type DeveloperApplicationAccessType = 'ASSIGNED' | 'OWNED';

export interface DeveloperOrganization {
  id: string;
  name: string;
  createdAt: string;
}

export interface DeveloperProfile {
  id: string;
  email: string;
  role: 'DEVELOPER';
  status: DeveloperAccountStatus;
  membershipType: DeveloperMembershipType;
  organization: DeveloperOrganization | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperApplication {
  id: string;
  organizationId: string | null;
  name: string;
  description: string | null;
  environment: DeveloperApplicationEnvironment;
  status: DeveloperApplicationStatus;
  createdAt: string;
  updatedAt: string;
  accessType: DeveloperApplicationAccessType;
  assignedAt: string;
}

export interface CreateDeveloperApplicationPayload {
  name: string;
  description?: string;
  environment?: DeveloperApplicationEnvironment;
}

export interface UpdateDeveloperApplicationPayload {
  name?: string;
  description?: string | null;
  environment?: DeveloperApplicationEnvironment;
  status?: DeveloperApplicationStatus;
}

export interface DeveloperApplicationCredential {
  id: string;
  applicationId: string;
  clientId: string;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  updatedAt: string;
}

export interface DeveloperApplicationCredentialResponse {
  hasCredential: boolean;
  credential: DeveloperApplicationCredential | null;
}