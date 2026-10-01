import type { SystemAdminAccountStatus } from '../../system-admin.types';

interface SystemAdminUserStatusProps {
  status: SystemAdminAccountStatus;
}

export function SystemAdminUserStatus({ status }: SystemAdminUserStatusProps) {
  const className =
    status === 'ACTIVE'
      ? 'status-text-success'
      : status === 'SUSPENDED'
        ? 'status-text-danger'
        : 'status-text-warning';

  return <span className={className}>{formatStatus(status)}</span>;
}

function formatStatus(status: SystemAdminAccountStatus) {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'SUSPENDED') return 'Suspended';
  return 'Pending verification';
}