import type {
  Organization,
  OrganizationInvitation,
  OrganizationMember,
} from '../organization.types';
import {
  formatOrganizationDateTime,
} from '../organization.utils';

interface OrganizationOverviewProps {
  organization: Organization;
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
}

export function OrganizationOverview({
  organization,
  members,
  invitations,
}: OrganizationOverviewProps) {
  const developerCount = members.filter(
    (member) =>
      member.role === 'DEVELOPER',
  ).length;

  const pendingInvitationCount =
    invitations.filter(
      (invitation) =>
        invitation.status === 'PENDING',
    ).length;

  const owner = members.find(
    (member) =>
      member.role === 'ORGANIZATION',
  );

  return (
    <>
      <section className="organization-summary-grid">
        <article className="organization-summary-card">
          <span>Members</span>

          <strong>
            {members.length}
          </strong>
        </article>

        <article className="organization-summary-card">
          <span>Developers</span>

          <strong>
            {developerCount}
          </strong>
        </article>

        <article className="organization-summary-card">
          <span>Pending invitations</span>

          <strong
            className={
              pendingInvitationCount > 0
                ? 'organization-summary-warning'
                : undefined
            }
          >
            {pendingInvitationCount}
          </strong>
        </article>
      </section>

      <section className="organization-overview-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>
                Organization information
              </h3>

              <p>
                Organization details registered
                with APIShield.
              </p>
            </div>
          </div>

          <div className="organization-info-list">
            <div className="organization-info-row">
              <span>
                Organization name
              </span>

              <strong>
                {organization.name}
              </strong>
            </div>

            <div className="organization-info-row">
              <span>
                Organization ID
              </span>

              <code>
                {organization.id}
              </code>
            </div>

            <div className="organization-info-row">
              <span>
                Created
              </span>

              <strong>
                {formatOrganizationDateTime(
                  organization.createdAt,
                )}
              </strong>
            </div>

            <div className="organization-info-row">
              <span>
                Last updated
              </span>

              <strong>
                {formatOrganizationDateTime(
                  organization.updatedAt,
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h3>
                Organization owner
              </h3>

              <p>
                Primary management account.
              </p>
            </div>
          </div>

          <div className="organization-owner">
            <div className="organization-owner-avatar">
              {owner?.email
                ?.charAt(0)
                .toUpperCase() ?? 'O'}
            </div>

            <div>
              <strong>
                {owner?.email ??
                  'Organization owner'}
              </strong>

              <span>
                ORGANIZATION
              </span>
            </div>
          </div>

          <p className="organization-owner-note">
            Organization-level applications,
            credentials, integrations and
            developer invitations are controlled
            by the authenticated organization
            owner.
          </p>
        </div>
      </section>
    </>
  );
}