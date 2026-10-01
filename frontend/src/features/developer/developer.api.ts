import { api } from '../../services/api';
import type {
  ApiCredentialPlacement,
  ApiIntegration,
  ApiIntegrationAuthType,
  ApiIntegrationStatus,
} from '../integrations/integration.types';
import type { GatewayRequestLog, SecurityEvent } from '../activity/activity.types';
import type {
  GeneratedApplicationCredential,
  RotateApplicationCredentialPayload,
} from '../application-credentials/application-credential.types';
import type {
  CreateDeveloperApplicationPayload,
  DeveloperApplication,
  DeveloperApplicationCredentialResponse,
  DeveloperProfile,
  UpdateDeveloperApplicationPayload,
} from './developer.types';

export interface DeveloperIntegrationCredential {
  value?: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface CreateDeveloperIntegrationPayload {
  name: string;
  provider: string;
  baseUrl: string;
  authType: ApiIntegrationAuthType;
  credentialPlacement?: ApiCredentialPlacement;
  credentialName?: string;
  credential?: DeveloperIntegrationCredential;
}

export interface UpdateDeveloperIntegrationPayload {
  name?: string;
  provider?: string;
  baseUrl?: string;
  authType?: ApiIntegrationAuthType;
  credentialPlacement?: ApiCredentialPlacement;
  credentialName?: string;
  credential?: DeveloperIntegrationCredential;
  status?: ApiIntegrationStatus;
}

export function getDeveloperProfile(accessToken: string) {
  return api<DeveloperProfile>('/developer', {
    accessToken,
  });
}

export function getDeveloperApplications(accessToken: string) {
  return api<DeveloperApplication[]>('/developer/applications', {
    accessToken,
  });
}

export function createDeveloperApplication(accessToken: string, payload: CreateDeveloperApplicationPayload) {
  return api<DeveloperApplication>('/developer/applications', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function getDeveloperApplication(accessToken: string, applicationId: string) {
  return api<DeveloperApplication>(`/developer/applications/${applicationId}`, {
    accessToken,
  });
}

export function updateDeveloperApplication(
  accessToken: string,
  applicationId: string,
  payload: UpdateDeveloperApplicationPayload,
) {
  return api<DeveloperApplication>(`/developer/applications/${applicationId}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function getDeveloperApplicationCredential(accessToken: string, applicationId: string) {
  return api<DeveloperApplicationCredentialResponse>(`/developer/applications/${applicationId}/credentials`, {
    accessToken,
  });
}

export function createDeveloperApplicationCredential(accessToken: string, applicationId: string) {
  return api<GeneratedApplicationCredential>(`/developer/applications/${applicationId}/credentials`, {
    method: 'POST',
    accessToken,
  });
}

export function rotateDeveloperApplicationCredential(
  accessToken: string,
  applicationId: string,
  payload: RotateApplicationCredentialPayload,
) {
  return api<GeneratedApplicationCredential>(`/developer/applications/${applicationId}/credentials/rotate`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function getDeveloperIntegrations(accessToken: string, applicationId: string) {
  return api<ApiIntegration[]>(`/developer/applications/${applicationId}/integrations`, {
    accessToken,
  });
}

export function createDeveloperIntegration(
  accessToken: string,
  applicationId: string,
  payload: CreateDeveloperIntegrationPayload,
) {
  return api<ApiIntegration>(`/developer/applications/${applicationId}/integrations`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function updateDeveloperIntegration(
  accessToken: string,
  applicationId: string,
  integrationId: string,
  payload: UpdateDeveloperIntegrationPayload,
) {
  return api<ApiIntegration>(`/developer/applications/${applicationId}/integrations/${integrationId}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function getDeveloperGatewayActivity(accessToken: string, applicationId: string) {
  return api<GatewayRequestLog[]>(`/developer/applications/${applicationId}/gateway-activity`, {
    accessToken,
  });
}

export function getDeveloperApplicationActivity(accessToken: string, applicationId: string) {
  return api<SecurityEvent[]>(`/developer/applications/${applicationId}/activity`, {
    accessToken,
  });
}