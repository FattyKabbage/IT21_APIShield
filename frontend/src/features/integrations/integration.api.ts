import { api } from '../../services/api';
import type { ApiIntegration, CreateApiIntegrationPayload, UpdateApiIntegrationPayload } from './integration.types';

export function getApplicationIntegrations(accessToken: string, applicationId: string) {
  return api<ApiIntegration[]>(`/applications/${applicationId}/integrations`, {
    accessToken,
  });
}

export function getApplicationIntegration(accessToken: string, applicationId: string, integrationId: string) {
  return api<ApiIntegration>(`/applications/${applicationId}/integrations/${integrationId}`, {
    accessToken,
  });
}

export function createApplicationIntegration(accessToken: string, applicationId: string, payload: CreateApiIntegrationPayload) {
  return api<ApiIntegration>(`/applications/${applicationId}/integrations`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function updateApplicationIntegration(accessToken: string, applicationId: string, integrationId: string, payload: UpdateApiIntegrationPayload) {
  return api<ApiIntegration>(`/applications/${applicationId}/integrations/${integrationId}`, {
    method: 'PATCH',
    accessToken,
    body: JSON.stringify(payload),
  });
}