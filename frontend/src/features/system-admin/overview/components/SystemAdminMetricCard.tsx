interface SystemAdminMetricCardProps {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function SystemAdminMetricCard({ label, value, tone = 'default' }: SystemAdminMetricCardProps) {
  return (
    <article className="system-admin-metric-card">
      <span>{label}</span>
      <strong className={`system-admin-metric-${tone}`}>{value}</strong>
    </article>
  );
}