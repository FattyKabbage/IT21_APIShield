import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../auth/auth.context';
import { DashboardLayout } from '../../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../../dashboard/components/ErrorState';
import { getSystemAdminOrganization } from '../../system-admin.api';
import type { SystemAdminAccountStatus, SystemAdminApplicationEnvironment, SystemAdminOrganizationDetail, SystemAdminUserRole } from '../../system-admin.types';
import { SystemAdminOrganizationStat } from '../components/SystemAdminOrganizationStat';
import '../../system-admin.css';

const PAGE_SIZE = 8;

export function SystemAdminOrganizationDetailPage() {
  const { organizationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<SystemAdminOrganizationDetail | null>(null);
  const [memberPage, setMemberPage] = useState(1);
  const [applicationPage, setApplicationPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrganization() {
    if (!accessToken || !organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSystemAdminOrganization(accessToken, organizationId);
      setOrganization(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load organization.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganization();
  }, [accessToken, organizationId]);

  const members = useMemo(() => {
    if (!organization) return [];
    return [...organization.members].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [organization]);

  const applications = useMemo(() => {
    if (!organization) return [];
    return [...organization.applications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [organization]);

  const memberPageCount = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const applicationPageCount = Math.max(1, Math.ceil(applications.length / PAGE_SIZE));

  const paginatedMembers = useMemo(() => {
    const start = (memberPage - 1) * PAGE_SIZE;
    return members.slice(start, start + PAGE_SIZE);
  }, [members, memberPage]);

  const paginatedApplications = useMemo(() => {
    const start = (applicationPage - 1) * PAGE_SIZE;
    return applications.slice(start, start + PAGE_SIZE);
  }, [applications, applicationPage]);

  return (
    <DashboardLayout>
      <div className="system-admin-back">
        <button type="button" className="table-action" onClick={() => navigate('/admin/organizations')}>
          ← Back to organizations
        </button>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading organization...</strong>
            <p>Please wait while APIShield retrieves organization information.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadOrganization()} />}

      {!loading && !error && organization && (
        <>
          <section className="dashboard-intro">
            <div>
              <p className="section-eyebrow">ORGANIZATION</p>
              <h2>{organization.name}</h2>
              <p>Review organization membership and registered client applications.</p>
            </div>
          </section>

          <section className="system-admin-organization-summary">
            <SystemAdminOrganizationStat label="Members" value={organization.memberCount} />
            <SystemAdminOrganizationStat label="Applications" value={organization.applicationCount} />

            <article className="system-admin-organization-date">
              <span>Created</span>
              <strong>{formatDateTime(organization.createdAt)}</strong>
            </article>
          </section>

          <section className="panel system-admin-organization-section">
            <div className="panel-header">
              <div>
                <h3>Members</h3>
                <p>Safe account information for users currently belonging to this organization.</p>
              </div>

              <span className="system-admin-result-count">
                {members.length} member{members.length === 1 ? '' : 's'}
              </span>
            </div>

            {paginatedMembers.length === 0 ? (
              <div className="empty-state">
                <strong>No organization members</strong>
                <p>Members belonging to this organization will appear here.</p>
              </div>
            ) : (
              <>
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedMembers.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div className="system-admin-user-identity">
                              <strong>{member.email}</strong>
                              <span>{member.id}</span>
                            </div>
                          </td>

                          <td>
                            <span className="system-admin-role">{formatRole(member.role)}</span>
                          </td>

                          <td>
                            <span className={getStatusClass(member.status)}>{formatStatus(member.status)}</span>
                          </td>

                          <td>
                            <div className="application-date">
                              <strong>{formatDate(member.createdAt)}</strong>
                              <span>{formatTime(member.createdAt)}</span>
                            </div>
                          </td>

                          <td>
                            <button type="button" className="table-action" onClick={() => navigate(`/admin/users/${member.id}`)}>
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="table-pagination">
                  <span>
                    Showing {members.length === 0 ? 0 : (memberPage - 1) * PAGE_SIZE + 1}–{Math.min(memberPage * PAGE_SIZE, members.length)} of {members.length}
                  </span>

                  <div className="table-pagination-controls">
                    <button type="button" className="table-action" onClick={() => setMemberPage((current) => Math.max(1, current - 1))} disabled={memberPage === 1}>
                      ← Previous
                    </button>

                    <span>Page {memberPage} of {memberPageCount}</span>

                    <button type="button" className="table-action" onClick={() => setMemberPage((current) => Math.min(memberPageCount, current + 1))} disabled={memberPage === memberPageCount}>
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="panel system-admin-organization-section">
            <div className="panel-header">
              <div>
                <h3>Client applications</h3>
                <p>Applications currently registered under this organization.</p>
              </div>

              <span className="system-admin-result-count">
                {applications.length} application{applications.length === 1 ? '' : 's'}
              </span>
            </div>

            {paginatedApplications.length === 0 ? (
              <div className="empty-state">
                <strong>No client applications</strong>
                <p>Applications belonging to this organization will appear here.</p>
              </div>
            ) : (
              <>
                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Application</th>
                        <th>Environment</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {paginatedApplications.map((application) => (
                        <tr key={application.id}>
                          <td>
                            <div className="system-admin-application-name">
                              <strong>{application.name}</strong>
                              <span>{application.description || application.id}</span>
                            </div>
                          </td>

                          <td>
                            <span className={`application-environment ${application.environment.toLowerCase()}`}>
                              {formatEnvironment(application.environment)}
                            </span>
                          </td>

                          <td>
                            <span className={application.status === 'ACTIVE' ? 'status-text-success' : 'status-text-danger'}>
                              {application.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                            </span>
                          </td>

                          <td>
                            <div className="application-date">
                              <strong>{formatDate(application.createdAt)}</strong>
                              <span>{formatTime(application.createdAt)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="table-pagination">
                  <span>
                    Showing {applications.length === 0 ? 0 : (applicationPage - 1) * PAGE_SIZE + 1}–{Math.min(applicationPage * PAGE_SIZE, applications.length)} of {applications.length}
                  </span>

                  <div className="table-pagination-controls">
                    <button type="button" className="table-action" onClick={() => setApplicationPage((current) => Math.max(1, current - 1))} disabled={applicationPage === 1}>
                      ← Previous
                    </button>

                    <span>Page {applicationPage} of {applicationPageCount}</span>

                    <button type="button" className="table-action" onClick={() => setApplicationPage((current) => Math.min(applicationPageCount, current + 1))} disabled={applicationPage === applicationPageCount}>
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>

          <div className="security-note">
            <strong>Read-only administration</strong>
            <span>This view provides platform visibility without exposing application credentials, Client Secrets or provider authentication data.</span>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function formatRole(role: SystemAdminUserRole) {
  if (role === 'ORGANIZATION') return 'Organization';
  if (role === 'SYSTEM_ADMIN') return 'System Admin';
  return 'Developer';
}

function formatStatus(status: SystemAdminAccountStatus) {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  return 'Pending verification';
}

function getStatusClass(status: SystemAdminAccountStatus) {
  if (status === 'ACTIVE') return 'status-text-success';
  if (status === 'SUSPENDED') return 'status-text-danger';
  return 'status-text-warning';
}

function formatEnvironment(environment: SystemAdminApplicationEnvironment) {
  if (environment === 'DEVELOPMENT') return 'Development';
  if (environment === 'STAGING') return 'Staging';
  return 'Production';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}