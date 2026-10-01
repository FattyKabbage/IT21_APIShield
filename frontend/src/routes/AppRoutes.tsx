import { Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyEmailPage } from '../features/auth/pages/VerifyEmailPage';
import { AcceptInvitationPage } from '../features/auth/pages/AcceptInvitationPage';
import { OrganizationDashboardPage } from '../features/organization/pages/OrganizationDashboardPage';
import { OrganizationPage } from '../features/organization/pages/OrganizationPage';
import { ApplicationPage } from '../features/applications/pages/ApplicationPage';
import { ApplicationDetailPage } from '../features/applications/pages/ApplicationDetailPage';
import { ApplicationAccessPage } from '../features/applications/pages/ApplicationAccessPage';
import { ApplicationCredentialPage } from '../features/application-credentials/pages/ApplicationCredentialPage';
import { ApplicationIntegrationPage } from '../features/integrations/pages/ApplicationIntegrationPage';
import { ApplicationActivityPage } from '../features/activity/pages/ApplicationActivityPage';
import { ApplicationGatewayActivityPage } from '../features/activity/pages/ApplicationsGatewayActivityPage';
import { DeveloperDashboardPage } from '../features/developer/pages/DeveloperDashboardPage';
import { DeveloperApplicationsPage } from '../features/developer/pages/DeveloperApplicationsPage';
import { DeveloperApplicationDetailPage } from '../features/developer/pages/DeveloperApplicationDetailPage';
import { DeveloperCredentialPage } from '../features/developer/pages/DeveloperCredentialPage';
import { DeveloperIntegrationPage } from '../features/developer/pages/DeveloperIntegrationPage';
import { DeveloperGatewayActivityPage } from '../features/developer/pages/DeveloperGatewayActivityPage';

import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';
import { DeveloperActivityPage } from '../features/developer/pages/DeveloperActivityPage';
import { SystemAdminOverviewPage } from '../features/system-admin/overview/pages/SystemAdminOverviewPage';
import { SystemAdminUserDetailPage } from '../features/system-admin/users/pages/SystemAdminUserDetailsPage';
import { SystemAdminUsersPage } from '../features/system-admin/users/pages/SystemAdminUsersPage';
import { SystemAdminOrganizationsPage } from '../features/system-admin/organizations/pages/SystemAdminOrganizationsPage';
import { SystemAdminOrganizationDetailPage } from '../features/system-admin/organizations/pages/SystemAdminOrganizationDetailPage';
import { SystemAdminSecurityEventsPage } from '../features/system-admin/security-events/pages/SystemAdminSecurityEventsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={['ORGANIZATION']} />}>
          <Route path="/dashboard" element={<OrganizationDashboardPage />} />
          <Route path="/dashboard/applications" element={<ApplicationPage />} />
          <Route path="/dashboard/applications/:applicationId" element={<ApplicationDetailPage />} />
          <Route path="/dashboard/applications/:applicationId/credentials" element={<ApplicationCredentialPage />} />
          <Route path="/dashboard/applications/:applicationId/integrations" element={<ApplicationIntegrationPage />} />
          <Route path="/dashboard/applications/:applicationId/activity" element={<ApplicationActivityPage />} />
          <Route path="/dashboard/applications/:applicationId/gateway-activity" element={<ApplicationGatewayActivityPage />} />
          <Route path="/dashboard/applications/:applicationId/access" element={<ApplicationAccessPage />} />
          <Route path="/dashboard/organizations" element={<OrganizationPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['DEVELOPER']} />}>
          <Route path="/developer" element={<DeveloperDashboardPage />} />
          <Route path="/developer/applications" element={<DeveloperApplicationsPage />} />
          <Route path="/developer/applications/:applicationId" element={<DeveloperApplicationDetailPage />} />
          <Route path="/developer/applications/:applicationId/credentials" element={<DeveloperCredentialPage />} />
          <Route path="/developer/applications/:applicationId/integrations" element={<DeveloperIntegrationPage />} />
          <Route path="/developer/applications/:applicationId/gateway-activity" element={<DeveloperGatewayActivityPage />} />
          <Route path="/developer/applications/:applicationId/activity" element={<DeveloperActivityPage />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={['SYSTEM_ADMIN']} />}>
          <Route path="/admin" element={<SystemAdminOverviewPage />} />
          <Route path="/admin/users" element={<SystemAdminUsersPage />} />
          <Route path="/admin/users/:userId" element={<SystemAdminUserDetailPage />} />
          <Route path="/admin/organizations" element={<SystemAdminOrganizationsPage />} />
          <Route path="/admin/organizations/:organizationId" element={<SystemAdminOrganizationDetailPage />} />
          <Route path="/admin/security-events" element={<SystemAdminSecurityEventsPage />} />

        </Route>

      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}