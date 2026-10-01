export type ApplicationEnvironment = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

export type ApplicationStatus = 'ACTIVE' | 'DISABLED';

export type AccountStatus =
  | 'PENDING_VERIFICATION'
  | 'ACTIVE'
  | 'SUSPENDED';

export interface ClientApplication {
  id: string;
  name: string;
  description: string | null;
  environment: ApplicationEnvironment;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApplicationPayload {
  name: string;
  description?: string;
  environment?: ApplicationEnvironment;
}

export interface UpdateApplicationPayload {
  name?: string;
  description?: string | null;
  environment?: ApplicationEnvironment;
  status?: ApplicationStatus;
}

export interface AssignedApplicationDeveloper {
  id: string;
  email: string;
  status: AccountStatus;
  assignedAt: string;
}

export interface ApplicationAccessMember {
  id: string;
  email: string;
  role: 'SYSTEM_ADMIN' | 'ORGANIZATION' | 'DEVELOPER';
  status: AccountStatus;
  organizationId?: string | null;
}

export interface AssignDeveloperPayload {
  developerId: string;
}

export interface RemoveDeveloperAccessPayload {
  currentPassword: string;
}