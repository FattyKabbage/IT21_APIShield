export type ApplicationCredentialStatus = 'ACTIVE' | 'REVOKED';

export interface ApplicationCredential {
  id: string;
  applicationId: string;
  clientId: string;
  status: ApplicationCredentialStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationCredentialResponse {
  hasCredential: boolean;
  credential: ApplicationCredential | null;
}

export interface GeneratedApplicationCredential {
  id: string;
  applicationId: string;
  clientId: string;
  clientSecret: string;
  status: ApplicationCredentialStatus;
  createdAt: string;
  updatedAt?: string;
  message: string;
}

export interface RotateApplicationCredentialPayload {
  currentPassword: string;
}