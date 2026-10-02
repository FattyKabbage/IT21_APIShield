export type ApiIntegrationAuthType = 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC_AUTH';

export type ApiCredentialPlacement = 'HEADER' | 'QUERY';

export type ApiIntegrationStatus = 'ACTIVE' | 'DISABLED';

export interface ApiCredentialPayload {
  value?: string;
  token?: string;
  username?: string;
  password?: string;
}

export interface ApiIntegration {
  id: string;
  applicationId: string;
  name: string;
  provider: string;
  baseUrl: string;
  authType: ApiIntegrationAuthType;
  credentialPlacement: ApiCredentialPlacement | null;
  credentialName: string | null;
  hasCredential: boolean;
  status: ApiIntegrationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiIntegrationPayload {
  name: string;
  provider: string;
  baseUrl: string;
  authType: ApiIntegrationAuthType;
  credentialPlacement?: ApiCredentialPlacement;
  credentialName?: string;
  providerCredential?: string;
}

export interface UpdateApiIntegrationPayload {
  name?: string;
  provider?: string;
  baseUrl?: string;
  authType?: ApiIntegrationAuthType;
  credentialPlacement?: ApiCredentialPlacement | null;
  credentialName?: string | null;
  providerCredential?: string;
  status?: ApiIntegrationStatus;
}