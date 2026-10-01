import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ORGANIZATION_INVITATION_PAGE_SIZE,
} from '../organization.constants';
import type {
  OrganizationInvitation,
  OrganizationInvitationStatus,
} from '../organization.types';
import {
  formatOrganizationDate,
  formatOrganizationTime,
  getInvitationStatusClass,
  getInvitationStatusLabel,
} from '../organization.utils';

type InvitationStatusFilter =
  | 'ALL'
  | OrganizationInvitationStatus;

interface OrganizationInvitationsProps {
  invitations: OrganizationInvitation[];
  resendCooldowns: Record<string, number>;
  onInvite: () => void;
  onResend: (
    invitation: OrganizationInvitation,
  ) => void;
  onCancel: (
    invitation: OrganizationInvitation,
  ) => void;
}

export function OrganizationInvitations({
  invitations,
  resendCooldowns,
  onInvite,
  onResend,
  onCancel,
}: OrganizationInvitationsProps) {
  const [search, setSearch] =
    useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<InvitationStatusFilter>(
      'ALL',
    );

  const [page, setPage] =
    useState(1);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const filteredInvitations =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return [...invitations]
        .filter((invitation) => {
          const matchesSearch =
            !query ||
            invitation.email
              .toLowerCase()
              .includes(query);

          const matchesStatus =
            statusFilter === 'ALL' ||
            invitation.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        })
        .sort(
          (a, b) =>
            new Date(
              b.createdAt,
            ).getTime() -
            new Date(
              a.createdAt,
            ).getTime(),
        );
    }, [
      invitations,
      search,
      statusFilter,
    ]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      filteredInvitations.length /
        ORGANIZATION_INVITATION_PAGE_SIZE,
    ),
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const paginatedInvitations =
    useMemo(() => {
      const start =
        (page - 1) *
        ORGANIZATION_INVITATION_PAGE_SIZE;

      return filteredInvitations.slice(
        start,
        start +
          ORGANIZATION_INVITATION_PAGE_SIZE,
      );
    }, [
      filteredInvitations,
      page,
    ]);

  const rangeStart =
    filteredInvitations.length === 0
      ? 0
      : (page - 1) *
          ORGANIZATION_INVITATION_PAGE_SIZE +
        1;

  const rangeEnd = Math.min(
    page *
      ORGANIZATION_INVITATION_PAGE_SIZE,
    filteredInvitations.length,
  );

  return (
    <>
      <div className="dashboard-intro organization-invitation-heading">
        <div>
          <p className="section-eyebrow">
            TEAM ACCESS
          </p>

          <h2>
            Developer Invitations
          </h2>

          <p>
            Invite Developer accounts to join
            your organization.
          </p>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={onInvite}
        >
          + Invite developer
        </button>
      </div>

      <div className="organization-invitation-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Search invitations..."
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target
                .value as InvitationStatusFilter,
            )
          }
          aria-label="Filter invitations by status"
        >
          <option value="ALL">
            All statuses
          </option>

          <option value="PENDING">
            Pending
          </option>

          <option value="ACCEPTED">
            Accepted
          </option>

          <option value="EXPIRED">
            Expired
          </option>

          <option value="CANCELLED">
            Cancelled
          </option>
        </select>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>
              Invitation history
            </h3>

            <p>
              Invitations are displayed from
              newest to oldest.
            </p>
          </div>

          <span className="organization-result-count">
            {filteredInvitations.length}{' '}
            invitation
            {filteredInvitations.length ===
            1
              ? ''
              : 's'}
          </span>
        </div>

        {paginatedInvitations.length ===
        0 ? (
          <div className="empty-state">
            <strong>
              {invitations.length === 0
                ? 'No invitations sent'
                : 'No matching invitations'}
            </strong>

            <p>
              {invitations.length === 0
                ? 'Invite a Developer account to join your organization.'
                : 'Try changing the search term or status filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table organization-table">
                <thead>
                  <tr>
                    <th>
                      Email
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Sent
                    </th>

                    <th>
                      Invitation state
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedInvitations.map(
                    (invitation) => {
                      const cooldown =
                        resendCooldowns[
                          invitation.id
                        ] ?? 0;

                      return (
                        <tr
                          key={
                            invitation.id
                          }
                        >
                          <td>
                            <strong>
                              {
                                invitation.email
                              }
                            </strong>
                          </td>

                          <td>
                            <span
                              className={getInvitationStatusClass(
                                invitation.status,
                              )}
                            >
                              {getInvitationStatusLabel(
                                invitation.status,
                              )}
                            </span>
                          </td>

                          <td>
                            <div className="organization-date">
                              <strong>
                                {formatOrganizationDate(
                                  invitation.createdAt,
                                )}
                              </strong>

                              <span>
                                {formatOrganizationTime(
                                  invitation.createdAt,
                                )}
                              </span>
                            </div>
                          </td>

                          <td>
                            <InvitationState
                              invitation={
                                invitation
                              }
                            />
                          </td>

                          <td>
                            {invitation.status ===
                            'PENDING' ? (
                              <div className="organization-invitation-actions">
                                <button
                                  type="button"
                                  className="table-action"
                                  onClick={() =>
                                    onResend(
                                      invitation,
                                    )
                                  }
                                  disabled={
                                    cooldown > 0
                                  }
                                >
                                  {cooldown >
                                  0
                                    ? `Resend in ${cooldown}s`
                                    : 'Resend'}
                                </button>

                                <button
                                  type="button"
                                  className="table-action organization-cancel-action"
                                  onClick={() =>
                                    onCancel(
                                      invitation,
                                    )
                                  }
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className="organization-no-action">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <span>
                Showing {rangeStart}–
                {rangeEnd} of{' '}
                {
                  filteredInvitations.length
                }
              </span>

              <div className="table-pagination-controls">
                <button
                  type="button"
                  className="table-action"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1,
                        ),
                    )
                  }
                  disabled={page === 1}
                >
                  ← Previous
                </button>

                <span>
                  Page {page} of{' '}
                  {pageCount}
                </span>

                <button
                  type="button"
                  className="table-action"
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          pageCount,
                          current + 1,
                        ),
                    )
                  }
                  disabled={
                    page === pageCount
                  }
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}

function InvitationState({
  invitation,
}: {
  invitation: OrganizationInvitation;
}) {
  if (
    invitation.status ===
      'ACCEPTED' &&
    invitation.acceptedAt
  ) {
    return (
      <div className="organization-invitation-status">
        <strong>
          Accepted
        </strong>

        <span>
          {formatOrganizationDate(
            invitation.acceptedAt,
          )}{' '}
          ·{' '}
          {formatOrganizationTime(
            invitation.acceptedAt,
          )}
        </span>
      </div>
    );
  }

  if (
    invitation.status === 'PENDING'
  ) {
    return (
      <div className="organization-invitation-status">
        <strong>
          Expires
        </strong>

        <span>
          {formatOrganizationDate(
            invitation.expiresAt,
          )}{' '}
          ·{' '}
          {formatOrganizationTime(
            invitation.expiresAt,
          )}
        </span>
      </div>
    );
  }

  return (
    <span className="organization-no-action">
      —
    </span>
  );
}