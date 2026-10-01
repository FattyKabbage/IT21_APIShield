import type { SecurityEventSeverity } from '../../../activity/activity.types';

interface SystemAdminEventSeverityProps {
  severity: SecurityEventSeverity;
}

export function SystemAdminEventSeverity({ severity }: SystemAdminEventSeverityProps) {
  const className =
    severity === 'CRITICAL'
      ? 'system-admin-event-critical'
      : severity === 'WARNING'
        ? 'system-admin-event-warning'
        : 'system-admin-event-info';

  return <span className={className}>{formatSeverity(severity)}</span>;
}

function formatSeverity(severity: SecurityEventSeverity) {
  if (severity === 'CRITICAL') return 'Critical';
  if (severity === 'WARNING') return 'Warning';
  return 'Info';
}