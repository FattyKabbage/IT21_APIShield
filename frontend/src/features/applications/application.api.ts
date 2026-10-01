import { api } from '../../services/api';
import type {
  ApplicationAccessMember,
  AssignedApplicationDeveloper,
  AssignDeveloperPayload,
  ClientApplication,
  CreateApplicationPayload,
  RemoveDeveloperAccessPayload,
  UpdateApplicationPayload,
} from './application.types';

export function getApplications(accessToken: string) {
  return api<ClientApplication[]>('/applications', {
    accessToken,
  });
}

export function getApplication(
  accessToken: string,
  applicationId: string,
) {
  return api<ClientApplication>(
    `/applications/${applicationId}`,
    {
      accessToken,
    },
  );
}

export function createApplication(
  accessToken: string,
  payload: CreateApplicationPayload,
) {
  return api<ClientApplication>('/applications', {
    method: 'POST',
    accessToken,
    body: JSON.stringify(payload),
  });
}

export function updateApplication(
  accessToken: string,
  applicationId: string,
  payload: UpdateApplicationPayload,
) {
  return api<ClientApplication>(
    `/applications/${applicationId}`,
    {
      method: 'PATCH',
      accessToken,
      body: JSON.stringify(payload),
    },
  );
}

export function getApplicationDevelopers(
  accessToken: string,
  applicationId: string,
) {
  return api<AssignedApplicationDeveloper[]>(
    `/applications/${applicationId}/developers`,
    {
      accessToken,
    },
  );
}

export function assignApplicationDeveloper(
  accessToken: string,
  applicationId: string,
  payload: AssignDeveloperPayload,
) {
  return api<AssignedApplicationDeveloper>(
    `/applications/${applicationId}/developers`,
    {
      method: 'POST',
      accessToken,
      body: JSON.stringify(payload),
    },
  );
}

export function removeApplicationDeveloper(
  accessToken: string,
  applicationId: string,
  developerId: string,
  payload: RemoveDeveloperAccessPayload,
) {
  return api<{ message: string }>(
    `/applications/${applicationId}/developers/${developerId}`,
    {
      method: 'DELETE',
      accessToken,
      body: JSON.stringify(payload),
    },
  );
}

export function getApplicationAccessMembers(
  accessToken: string,
) {
  return api<ApplicationAccessMember[]>(
    '/organization/members',
    {
      accessToken,
    },
  );
}