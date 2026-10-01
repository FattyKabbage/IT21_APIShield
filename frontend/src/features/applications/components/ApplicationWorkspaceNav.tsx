import { NavLink } from 'react-router';

interface ApplicationWorkspaceNavProps {
  applicationId: string;
}

const workspaceItems = [
  {
    label: 'Overview',
    suffix: '',
  },
  {
    label: 'Credentials',
    suffix: '/credentials',
  },
  {
    label: 'Integrations',
    suffix: '/integrations',
  },
  {
    label: 'Activity Log',
    suffix: '/activity',
  },
  {
    label: 'Gateway Activity',
    suffix: '/gateway-activity',
  },
  {
    label: 'Access',
    suffix: '/access',
  },
];

export function ApplicationWorkspaceNav({ applicationId }: ApplicationWorkspaceNavProps) {
  const basePath = `/dashboard/applications/${applicationId}`;

  return (
    <nav className="application-workspace-nav" aria-label="Application workspace">
      {workspaceItems.map((item) => (
        <NavLink
          key={item.label}
          to={`${basePath}${item.suffix}`}
          end={item.suffix === ''}
          className={({ isActive }) => `application-workspace-link ${isActive ? 'active' : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}