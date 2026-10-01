export type GatewayRequestOutcome = 'SUCCESS' | 'PROVIDER_ERROR' | 'GATEWAY_ERROR';

export interface GatewayRequestLog {
  id: string;
  applicationId: string;
  integrationId: string;
  integrationName: string | null;
  provider: string | null;
  method: string;
  path: string;
  providerStatus: number | null;
  outcome: GatewayRequestOutcome;
  durationMs: number;
  createdAt: string;
}

export type SecurityEventCategory =
  | 'AUTHENTICATION'
  | 'AUTHORIZATION'
  | 'APPLICATION'
  | 'CREDENTIAL'
  | 'INTEGRATION'
  | 'ORGANIZATION'
  | 'ACCESS_CONTROL'
  | 'SYSTEM';

export type SecurityEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type SecurityEventOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export type SecurityEventAction =
  | 'USER_LOGIN_SUCCEEDED'
  | 'USER_LOGIN_FAILED'
  | 'USER_LOGOUT'
  | 'APPLICATION_CREATED'
  | 'APPLICATION_UPDATED'
  | 'APPLICATION_CREDENTIAL_CREATED'
  | 'APPLICATION_CREDENTIAL_ROTATED'
  | 'DEVELOPER_ASSIGNED'
  | 'DEVELOPER_ACCESS_REMOVED'
  | 'API_INTEGRATION_CREATED'
  | 'API_INTEGRATION_UPDATED'
  | 'ORGANIZATION_INVITATION_CREATED'
  | 'ORGANIZATION_INVITATION_RESENT'
  | 'ORGANIZATION_INVITATION_REVOKED'
  | 'ORGANIZATION_INVITATION_ACCEPTED'
  | 'ACCESS_DENIED';

export type SecurityEventTargetType =
  | 'USER'
  | 'ORGANIZATION'
  | 'APPLICATION'
  | 'APPLICATION_CREDENTIAL'
  | 'DEVELOPER'
  | 'API_INTEGRATION'
  | 'ORGANIZATION_INVITATION'
  | 'SYSTEM';

export interface SecurityEvent {
  id: string;
  actorUserId: string | null;
  actorEmail: string | null;
  organizationId: string | null;
  applicationId: string | null;
  category: SecurityEventCategory;
  severity: SecurityEventSeverity;
  outcome: SecurityEventOutcome;
  action: SecurityEventAction;
  targetType: SecurityEventTargetType;
  targetId: string | null;
  targetLabel: string | null;
  changedFields: string[];
  description: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
}