import { api } from '../../services/api';
import type { ApplicationCredentialResponse, GeneratedApplicationCredential, RotateApplicationCredentialPayload } from './application-credential.types';

export function getApplicationCredential(accessToken: string, applicationId: string) {
  return api<ApplicationCredentialResponse>(`/applications/${applicationId}/credentials`, {
    accessToken,
  });
}

export function createApplicationCredential(accessToken: string, applicationId: string) {
  return api<GeneratedApplicationCredential>(`/applications/${applicationId}/credentials`, {
    method: 'POST',
    accessToken,
  });
}

export function rotateApplicationCredential(accessToken: string, applicationId: string, payload: RotateApplicationCredentialPayload) {
  return api<GeneratedApplicationCredential>(`/applications/${applicationId}/credentials/rotate`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}