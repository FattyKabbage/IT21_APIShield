import { api } from '../../services/api';
import type { GatewayRequestLog, SecurityEvent } from './activity.types';

export function getApplicationActivity(accessToken: string, applicationId: string) {
  return api<SecurityEvent[]>(`/applications/${applicationId}/management-activity`, {
    accessToken,
  });
}

export function getApplicationGatewayActivity(accessToken: string, applicationId: string) {
  return api<GatewayRequestLog[]>(`/applications/${applicationId}/activity`, {
    accessToken,
  });
}