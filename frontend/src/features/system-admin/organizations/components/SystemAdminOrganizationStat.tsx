interface SystemAdminOrganizationStatProps {
  label: string;
  value: number;
}

export function SystemAdminOrganizationStat({ label, value }: SystemAdminOrganizationStatProps) {
  return (
    <article className="system-admin-organization-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}