export type SystemAdminUserRole = 'SYSTEM_ADMIN' | 'ORGANIZATION' | 'DEVELOPER';

export type SystemAdminAccountStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';

export type SystemAdminApplicationEnvironment = 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION';

export type SystemAdminApplicationStatus = 'ACTIVE' | 'DISABLED';

export interface SystemAdminOverview {
  totalUsers: number;
  totalOrganizations: number;
  totalApplications: number;
  totalSecurityEvents: number;
  activeUsers: number;
  suspendedUsers: number;
  organizationAccounts: number;
  developerAccounts: number;
}

export interface SystemAdminUser {
  id: string;
  email: string;
  role: SystemAdminUserRole;
  status: SystemAdminAccountStatus;
  organizationId: string | null;
  organizationName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAdminUserOrganization {
  id: string;
  name: string;
}

export interface SystemAdminUserDetail {
  id: string;
  email: string;
  role: SystemAdminUserRole;
  status: SystemAdminAccountStatus;
  organizationId: string | null;
  organization: SystemAdminUserOrganization | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAdminOrganization {
  id: string;
  name: string;
  memberCount: number;
  applicationCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAdminOrganizationMember {
  id: string;
  email: string;
  role: SystemAdminUserRole;
  status: SystemAdminAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAdminOrganizationApplication {
  id: string;
  name: string;
  description: string | null;
  environment: SystemAdminApplicationEnvironment;
  status: SystemAdminApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SystemAdminOrganizationDetail extends SystemAdminOrganization {
  members: SystemAdminOrganizationMember[];
  applications: SystemAdminOrganizationApplication[];
}