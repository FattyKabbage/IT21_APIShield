import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ORGANIZATION_MEMBER_PAGE_SIZE,
} from '../organization.constants';
import type {
  OrganizationMember,
} from '../organization.types';
import {
  formatOrganizationDate,
  formatOrganizationTime,
  getMemberStatusClass,
  getMemberStatusLabel,
} from '../organization.utils';

interface OrganizationMembersProps {
  members: OrganizationMember[];
}

export function OrganizationMembers({
  members,
}: OrganizationMembersProps) {
  const [search, setSearch] =
    useState('');

  const [page, setPage] =
    useState(1);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredMembers =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return [...members]
        .filter((member) => {
          if (!query) return true;

          return (
            member.email
              .toLowerCase()
              .includes(query) ||
            member.role
              .toLowerCase()
              .includes(query) ||
            member.status
              .toLowerCase()
              .includes(query)
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
    }, [members, search]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      filteredMembers.length /
        ORGANIZATION_MEMBER_PAGE_SIZE,
    ),
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const paginatedMembers =
    useMemo(() => {
      const start =
        (page - 1) *
        ORGANIZATION_MEMBER_PAGE_SIZE;

      return filteredMembers.slice(
        start,
        start +
          ORGANIZATION_MEMBER_PAGE_SIZE,
      );
    }, [filteredMembers, page]);

  const rangeStart =
    filteredMembers.length === 0
      ? 0
      : (page - 1) *
          ORGANIZATION_MEMBER_PAGE_SIZE +
        1;

  const rangeEnd = Math.min(
    page *
      ORGANIZATION_MEMBER_PAGE_SIZE,
    filteredMembers.length,
  );

  return (
    <>
      <div className="organization-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search members..."
        />

        <span>
          {filteredMembers.length}{' '}
          member
          {filteredMembers.length === 1
            ? ''
            : 's'}
        </span>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>
              Organization members
            </h3>

            <p>
              Accounts currently connected to
              this organization.
            </p>
          </div>
        </div>

        {paginatedMembers.length ===
        0 ? (
          <div className="empty-state">
            <strong>
              No members found
            </strong>

            <p>
              Try a different search term.
            </p>
          </div>
        ) : (
          <>
            <div className="data-table-wrapper">
              <table className="data-table organization-table">
                <thead>
                  <tr>
                    <th>
                      Member
                    </th>

                    <th>
                      Role
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Joined
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedMembers.map(
                    (member) => (
                      <tr key={member.id}>
                        <td>
                          <strong>
                            {member.email}
                          </strong>
                        </td>

                        <td>
                          <span className="organization-role">
                            {member.role ===
                            'ORGANIZATION'
                              ? 'Organization owner'
                              : 'Developer'}
                          </span>
                        </td>

                        <td>
                          <span
                            className={getMemberStatusClass(
                              member.status,
                            )}
                          >
                            {getMemberStatusLabel(
                              member.status,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="organization-date">
                            <strong>
                              {formatOrganizationDate(
                                member.createdAt,
                              )}
                            </strong>

                            <span>
                              {formatOrganizationTime(
                                member.createdAt,
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination">
              <span>
                Showing {rangeStart}–
                {rangeEnd} of{' '}
                {filteredMembers.length}
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